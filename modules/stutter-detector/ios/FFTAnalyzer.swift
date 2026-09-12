import Accelerate
import Foundation

/// Extracts the dominant frequency from a block of PCM samples via a windowed real FFT.
/// Used to tell whether two speech segments are "the same sound" (repetition) or whether
/// a single segment holds a steady pitch for an unusually long time (prolongation).
final class FFTAnalyzer {
  private let fftSize: Int
  private let log2n: vDSP_Length
  private let fftSetup: FFTSetup
  private let sampleRate: Float
  private var window: [Float]

  init(fftSize: Int = 4096, sampleRate: Float = 44100) {
    self.fftSize = fftSize
    self.log2n = vDSP_Length(log2(Float(fftSize)))
    guard let setup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2)) else {
      fatalError("Could not create FFT setup")
    }
    self.fftSetup = setup
    self.sampleRate = sampleRate
    self.window = [Float](repeating: 0, count: fftSize)
    vDSP_hann_window(&window, vDSP_Length(fftSize), Int32(vDSP_HANN_NORM))
  }

  deinit {
    vDSP_destroy_fftsetup(fftSetup)
  }

  /// Dominant frequency (Hz) in `samples`. Truncates or zero-pads to `fftSize`.
  func dominantFrequency(samples: UnsafePointer<Float>, count: Int) -> Float {
    guard count > 0 else { return 0 }

    var input = [Float](repeating: 0, count: fftSize)
    let copyCount = min(count, fftSize)
    input.withUnsafeMutableBufferPointer { dst in
      dst.baseAddress!.update(from: samples, count: copyCount)
    }
    vDSP_vmul(input, 1, window, 1, &input, 1, vDSP_Length(fftSize))

    var realp = [Float](repeating: 0, count: fftSize / 2)
    var imagp = [Float](repeating: 0, count: fftSize / 2)
    var dominant: Float = 0

    realp.withUnsafeMutableBufferPointer { realPtr in
      imagp.withUnsafeMutableBufferPointer { imagPtr in
        var splitComplex = DSPSplitComplex(realp: realPtr.baseAddress!, imagp: imagPtr.baseAddress!)

        input.withUnsafeBufferPointer { inputPtr in
          inputPtr.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: fftSize / 2) { complexPtr in
            vDSP_ctoz(complexPtr, 2, &splitComplex, 1, vDSP_Length(fftSize / 2))
          }
        }

        vDSP_fft_zrip(fftSetup, &splitComplex, 1, log2n, FFTDirection(FFT_FORWARD))

        var magnitudes = [Float](repeating: 0, count: fftSize / 2)
        vDSP_zvmags(&splitComplex, 1, &magnitudes, 1, vDSP_Length(fftSize / 2))

        var maxMagnitude: Float = 0
        var maxIndex: vDSP_Length = 0
        vDSP_maxvi(magnitudes, 1, &maxMagnitude, &maxIndex, vDSP_Length(fftSize / 2))

        // Ignore near-silent frames — their "dominant frequency" is meaningless noise.
        dominant = maxMagnitude > 0.001 ? Float(maxIndex) * sampleRate / Float(fftSize) : 0
      }
    }
    return dominant
  }
}
