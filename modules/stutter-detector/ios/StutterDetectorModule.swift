import ExpoModulesCore
import Speech

public class StutterDetectorModule: Module, StutterDetectionEngineDelegate {
  private lazy var engine: StutterDetectionEngine = {
    let engine = StutterDetectionEngine()
    engine.delegate = self
    return engine
  }()

  public func definition() -> ModuleDefinition {
    Name("StutterDetectorModule")

    Events("onAmplitudeChange", "onSpeechResult", "onStutterDetected", "onWordAttemptSummary", "onError")

    AsyncFunction("requestPermissionsAsync") { (promise: Promise) in
      self.engine.requestPermissions { granted in
        promise.resolve(["granted": granted])
      }
    }

    Function("isAvailable") { () -> Bool in
      SFSpeechRecognizer(locale: Locale(identifier: "en-US")) != nil
    }

    Function("setTargetWord") { (word: String, ageYears: Int) in
      self.engine.setTargetWord(word, ageYears: ageYears)
    }

    Function("setChildBaseline") { (baseline: [String: Double]?) in
      if let baseline = baseline,
        let rate = baseline["naturalSpeechRate"],
        let amplitude = baseline["naturalAmplitude"],
        let onset = baseline["naturalOnsetRate"]
      {
        self.engine.setBaseline(SpeechBaseline(naturalSpeechRate: rate, naturalAmplitude: Float(amplitude), naturalOnsetRate: onset))
      } else {
        self.engine.setBaseline(nil)
      }
    }

    Function("startListening") {
      self.engine.startListening()
    }

    Function("stopListening") {
      self.engine.stopListening()
    }

    OnDestroy {
      self.engine.stopListening()
    }
  }

  // MARK: - StutterDetectionEngineDelegate

  func engine(_ engine: StutterDetectionEngine, didUpdateAmplitude amplitude: Float) {
    sendEvent("onAmplitudeChange", ["amplitude": amplitude])
  }

  func engine(_ engine: StutterDetectionEngine, didReceiveSpeechResult transcript: String, isFinal: Bool) {
    sendEvent("onSpeechResult", ["transcript": transcript, "isFinal": isFinal])
  }

  func engine(_ engine: StutterDetectionEngine, didDetectStutter event: StutterEvent) {
    sendEvent("onStutterDetected", event.dictionary)
  }

  func engine(_ engine: StutterDetectionEngine, didFinishWordAttempt summary: [String: Any]) {
    sendEvent("onWordAttemptSummary", summary)
  }

  func engine(_ engine: StutterDetectionEngine, didFailWithError message: String) {
    sendEvent("onError", ["message": message])
  }
}
