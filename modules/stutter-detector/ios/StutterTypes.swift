import Foundation

enum StutterType: String {
  case none
  case repetition
  case prolongation
  case block
}

struct StutterEvent {
  let type: StutterType
  let startTime: Double
  let duration: Double
  let severity: Float
  let wordAttempted: String
  let recoveredSmoothly: Bool

  var dictionary: [String: Any] {
    [
      "type": type.rawValue,
      "startTime": startTime,
      "duration": duration,
      "severity": severity,
      "wordAttempted": wordAttempted,
      "recoveredSmoothly": recoveredSmoothly,
    ]
  }
}

struct DetectionSensitivity {
  let repetitionThreshold: Int
  let prolongationThreshold: Double // ms
  let blockThreshold: Double // ms
  let scoreMultiplier: Float
}

/// Younger children stutter more and have less control — detection is more lenient for them.
func sensitivityForAge(_ age: Int) -> DetectionSensitivity {
  switch age {
  case ..<6:
    return DetectionSensitivity(repetitionThreshold: 3, prolongationThreshold: 700, blockThreshold: 700, scoreMultiplier: 1.3)
  case 6...7:
    return DetectionSensitivity(repetitionThreshold: 2, prolongationThreshold: 600, blockThreshold: 600, scoreMultiplier: 1.2)
  case 8...10:
    return DetectionSensitivity(repetitionThreshold: 2, prolongationThreshold: 500, blockThreshold: 500, scoreMultiplier: 1.0)
  default: // 11+
    return DetectionSensitivity(repetitionThreshold: 2, prolongationThreshold: 400, blockThreshold: 400, scoreMultiplier: 1.0)
  }
}

struct SpeechBaseline {
  let naturalSpeechRate: Double
  let naturalAmplitude: Float
  let naturalOnsetRate: Double
}
