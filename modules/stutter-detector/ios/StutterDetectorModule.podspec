Pod::Spec.new do |s|
  s.name           = 'StutterDetectorModule'
  s.version        = '1.0.0'
  s.summary        = 'On-device real-time stutter detection for BraveVoice'
  s.description    = 'AVAudioEngine + Accelerate-based repetition/prolongation/block detection, on-device only.'
  s.author         = 'BraveVoice'
  s.homepage       = 'https://github.com/yeshgautam/bravevoice'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
