import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { SpeechBaseline, StutterDetectorEvents } from './StutterDetector.types';

declare class StutterDetectorModuleType extends NativeModule<StutterDetectorEvents> {
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  isAvailable(): boolean;
  setTargetWord(word: string, ageYears: number): void;
  setChildBaseline(baseline: SpeechBaseline | null): void;
  startListening(): void;
  stopListening(): void;
}

// iOS-only: requireNativeModule throws immediately if the native module isn't linked,
// so this is guarded rather than attempted on Android, where no implementation exists.
const StutterDetectorModule: StutterDetectorModuleType | null =
  Platform.OS === 'ios' ? requireNativeModule<StutterDetectorModuleType>('StutterDetectorModule') : null;

export default StutterDetectorModule;
