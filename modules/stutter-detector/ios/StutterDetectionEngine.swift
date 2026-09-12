import AVFoundation
import Accelerate
import Speech

protocol StutterDetectionEngineDelegate: AnyObject {
  func engine(_ engine: StutterDetectionEngine, didUpdateAmplitude amplitude: Float)
  func engine(_ engine: StutterDetectionEngine, didReceiveSpeechResult transcript: String, isFinal: Bool)
  func engine(_ engine: StutterDetectionEngine, didDetectStutter event: StutterEvent)
  func engine(_ engine: StutterDetectionEngine, didFinishWordAttempt summary: [String: Any])
  func engine(_ engine: StutterDetectionEngine, didFailWithError message: String)
}

/// Owns the single AVAudioEngine tap for a game session: feeds SFSpeechRecognizer for
/// transcript matching AND runs on-device amplitude/frequency analysis for stutter
/// detection from the very same buffer. Two separate audio consumers (this + a second
/// recognizer) would fight over AVAudioSession, so this engine is the sole owner of the
/// microphone whenever a Cancellations-strategy game is active.
final class StutterDetectionEngine {
  weak var delegate: StutterDetectionEngineDelegate?

  private let audioEngine = AVAudioEngine()
  private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private let fftAnalyzer = FFTAnalyzer()

  // Rolling buffers — last 3 seconds at ~100ms resolution (30 buffers).
  private var amplitudeBuffer: [Float] = []
  private var frequencyBuffer: [Float] = []
  private var timestampBuffer: [Double] = []
  private let maxBufferCount = 30

  private let silenceThreshold: Float = -40.0
  private let speechThreshold: Float = -30.0

  private var currentTargetWord = ""
  private var sensitivity = sensitivityForAge(8)
  private var baseline: SpeechBaseline?

  private(set) var isListening = false
  private var stutterDetectedThisAttempt = false
  private var recordingStartTime: Date?

  private var wordAmplitudeSum: Float = 0
  private var wordAmplitudeCount = 0

  func setTargetWord(_ word: String, ageYears: Int) {
    currentTargetWord = word
    sensitivity = sensitivityForAge(ageYears)
  }

  func setBaseline(_ baseline: SpeechBaseline?) {
    self.baseline = baseline
  }

  func requestPermissions(completion: @escaping (Bool) -> Void) {
    SFSpeechRecognizer.requestAuthorization { speechStatus in
      AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
        DispatchQueue.main.async {
          completion(speechStatus == .authorized && micGranted)
        }
      }
    }
  }

  func startListening() {
    guard !isListening else { return }
    resetBuffers()
    stutterDetectedThisAttempt = false
    recordingStartTime = Date()
    wordAmplitudeSum = 0
    wordAmplitudeCount = 0

    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .duckOthers])
      try session.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      delegate?.engine(self, didFailWithError: "Could not start the microphone session.")
      return
    }

    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      delegate?.engine(self, didFailWithError: "Speech recognition isn't available right now.")
      return
    }

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    if #available(iOS 16, *) {
      request.addsPunctuation = false
    }
    recognitionRequest = request

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)

    inputNode.removeTap(onBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 4410, format: recordingFormat) { [weak self] buffer, time in
      guard let self = self else { return }
      self.recognitionRequest?.append(buffer)
      self.analyzeAudioBuffer(buffer, at: time)
    }

    audioEngine.prepare()
    do {
      try audioEngine.start()
    } catch {
      delegate?.engine(self, didFailWithError: "Could not start listening.")
      return
    }

    isListening = true

    recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self = self else { return }
      if let result = result {
        let transcript = result.bestTranscription.formattedString
        DispatchQueue.main.async {
          self.delegate?.engine(self, didReceiveSpeechResult: transcript, isFinal: result.isFinal)
        }
      }
      if let error = error {
        let nsError = error as NSError
        // Code 216/1110-ish "no speech" cancellations are routine (timeouts, user stop) — not real errors.
        if nsError.domain != "kAFAssistantErrorDomain" {
          DispatchQueue.main.async {
            self.delegate?.engine(self, didFailWithError: "Speech recognition had trouble hearing that.")
          }
        }
      }
    }
  }

  func stopListening() {
    guard isListening else { return }
    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()
    recognitionRequest = nil
    recognitionTask = nil
    isListening = false

    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

    let avgAmplitude = wordAmplitudeCount > 0 ? wordAmplitudeSum / Float(wordAmplitudeCount) : silenceThreshold
    let durationMs = recordingStartTime.map { Date().timeIntervalSince($0) * 1000 } ?? 0
    delegate?.engine(self, didFinishWordAttempt: [
      "averageAmplitude": avgAmplitude,
      "durationMs": durationMs,
    ])
  }

  private func resetBuffers() {
    amplitudeBuffer.removeAll()
    frequencyBuffer.removeAll()
    timestampBuffer.removeAll()
  }

  private func analyzeAudioBuffer(_ buffer: AVAudioPCMBuffer, at time: AVAudioTime) {
    guard let channelData = buffer.floatChannelData?[0] else { return }
    let frameLength = Int(buffer.frameLength)
    guard frameLength > 0 else { return }

    var rms: Float = 0
    vDSP_rmsqv(channelData, 1, &rms, vDSP_Length(frameLength))
    let amplitudeDb = 20 * log10(max(rms, 0.000_001))

    let dominantFreq = fftAnalyzer.dominantFrequency(samples: channelData, count: frameLength)
    let timestamp = time.sampleRate > 0 ? Double(time.sampleTime) / time.sampleRate : Date().timeIntervalSince1970

    amplitudeBuffer.append(amplitudeDb)
    frequencyBuffer.append(dominantFreq)
    timestampBuffer.append(timestamp)
    if amplitudeBuffer.count > maxBufferCount {
      amplitudeBuffer.removeFirst()
      frequencyBuffer.removeFirst()
      timestampBuffer.removeFirst()
    }

    if amplitudeDb > speechThreshold {
      wordAmplitudeSum += amplitudeDb
      wordAmplitudeCount += 1
    }

    detectStuttering()

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.delegate?.engine(self, didUpdateAmplitude: amplitudeDb)
    }
  }

  // MARK: - Type 1: Repetitions ("b-b-ball")

  private func detectRepetition() -> StutterEvent? {
    guard amplitudeBuffer.count >= 8 else { return nil }

    var segments: [(start: Int, end: Int)] = []
    var inSpeech = false
    var segmentStart = 0

    for i in 0..<amplitudeBuffer.count {
      let isSpeech = amplitudeBuffer[i] > speechThreshold
      if isSpeech && !inSpeech {
        segmentStart = i
        inSpeech = true
      } else if !isSpeech && inSpeech {
        segments.append((start: segmentStart, end: i))
        inSpeech = false
      }
    }
    if inSpeech { segments.append((start: segmentStart, end: amplitudeBuffer.count)) }

    guard segments.count >= 2 else { return nil }

    var repetitionCount = 0
    for i in 1..<segments.count {
      let prev = segments[i - 1]
      let curr = segments[i]

      let prevDuration = max(1, prev.end - prev.start)
      let currDuration = max(1, curr.end - curr.start)
      let gapBetween = curr.start - prev.end

      let durationSimilarity = Float(min(prevDuration, currDuration)) / Float(max(prevDuration, currDuration))
      let isRapid = gapBetween <= 3 // <=300ms between segments

      let prevAvgAmp = amplitudeBuffer[prev.start..<prev.end].reduce(0, +) / Float(prevDuration)
      let currAvgAmp = amplitudeBuffer[curr.start..<curr.end].reduce(0, +) / Float(currDuration)
      let ampSimilarity = 1 - abs(prevAvgAmp - currAvgAmp) / 20.0

      let prevAvgFreq = frequencyBuffer[prev.start..<prev.end].reduce(0, +) / Float(prevDuration)
      let currAvgFreq = frequencyBuffer[curr.start..<curr.end].reduce(0, +) / Float(currDuration)
      let freqSimilarity = 1 - min(abs(prevAvgFreq - currAvgFreq) / 500.0, 1.0)

      if durationSimilarity > 0.6 && isRapid && ampSimilarity > 0.5 && freqSimilarity > 0.6 {
        repetitionCount += 1
      }
    }

    guard repetitionCount >= sensitivity.repetitionThreshold else { return nil }

    let severity = min(Float(repetitionCount) / 5.0, 1.0)
    return StutterEvent(
      type: .repetition,
      startTime: timestampBuffer.first ?? 0,
      duration: Double(amplitudeBuffer.count) * 100,
      severity: severity,
      wordAttempted: currentTargetWord,
      recoveredSmoothly: false
    )
  }

  // MARK: - Type 2: Prolongations ("mmmmmom")

  private func detectProlongation() -> StutterEvent? {
    var longestStart = 0
    var longestEnd = 0
    var longestDuration = 0
    var currentStart = 0
    var inSpeech = false
    var continuousCount = 0

    for i in 0..<amplitudeBuffer.count {
      let isSpeech = amplitudeBuffer[i] > speechThreshold
      if isSpeech && !inSpeech {
        currentStart = i
        inSpeech = true
        continuousCount = 1
      } else if isSpeech && inSpeech {
        continuousCount += 1
      } else if !isSpeech && inSpeech {
        if continuousCount > longestDuration {
          longestStart = currentStart
          longestEnd = i
          longestDuration = continuousCount
        }
        inSpeech = false
        continuousCount = 0
      }
    }
    if inSpeech && continuousCount > longestDuration {
      longestStart = currentStart
      longestEnd = amplitudeBuffer.count
      longestDuration = continuousCount
    }

    let prolongationThresholdBuffers = Int(sensitivity.prolongationThreshold / 100)
    guard longestDuration >= prolongationThresholdBuffers, longestEnd > longestStart else { return nil }

    let segmentFrequencies = Array(frequencyBuffer[longestStart..<longestEnd])
    guard !segmentFrequencies.isEmpty else { return nil }
    let avgFreq = segmentFrequencies.reduce(0, +) / Float(segmentFrequencies.count)
    let variance = segmentFrequencies.map { pow($0 - avgFreq, 2) }.reduce(0, +) / Float(segmentFrequencies.count)
    let stdDev = sqrt(variance)

    // Low standard deviation means a stable pitch was held — a genuine prolongation,
    // not just a naturally long word with changing vowel sounds.
    guard stdDev < 100.0 else { return nil }

    let durationMs = Double(longestDuration) * 100
    let severity = max(0, min(Float(durationMs - sensitivity.prolongationThreshold) / 2000.0, 1.0))
    return StutterEvent(
      type: .prolongation,
      startTime: timestampBuffer[longestStart],
      duration: durationMs,
      severity: severity,
      wordAttempted: currentTargetWord,
      recoveredSmoothly: false
    )
  }

  // MARK: - Type 3: Blocks (silence, then abrupt onset)

  private func detectBlock() -> StutterEvent? {
    guard isListening, let start = recordingStartTime else { return nil }
    let timeSinceStart = Date().timeIntervalSince(start)
    guard timeSinceStart > 0.2 else { return nil } // ignore the mic-tap itself

    var silenceDuration = 0
    var foundSpeech = false
    for amplitude in amplitudeBuffer.reversed() {
      if amplitude < silenceThreshold {
        silenceDuration += 1
      } else {
        foundSpeech = true
        break
      }
    }

    let blockThresholdBuffers = Int(sensitivity.blockThreshold / 100)
    guard !foundSpeech, silenceDuration >= blockThresholdBuffers else { return nil }

    let blockDurationMs = Double(silenceDuration) * 100
    let severity = max(0, min(Float(blockDurationMs - sensitivity.blockThreshold) / 3000.0, 1.0))
    return StutterEvent(
      type: .block,
      startTime: start.timeIntervalSince1970,
      duration: blockDurationMs,
      severity: severity,
      wordAttempted: currentTargetWord,
      recoveredSmoothly: false
    )
  }

  // MARK: - Coordinator

  private func detectStuttering() {
    guard !stutterDetectedThisAttempt else { return }

    // Priority: block > repetition > prolongation, matching how disruptive each is to speak through.
    if let block = detectBlock() {
      handleStutterDetected(block)
    } else if let repetition = detectRepetition() {
      handleStutterDetected(repetition)
    } else if let prolongation = detectProlongation() {
      handleStutterDetected(prolongation)
    }
  }

  private func handleStutterDetected(_ event: StutterEvent) {
    guard !stutterDetectedThisAttempt else { return }
    stutterDetectedThisAttempt = true
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.delegate?.engine(self, didDetectStutter: event)
    }
  }
}
