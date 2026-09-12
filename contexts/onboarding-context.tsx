import { createContext, ReactNode, useContext, useState } from 'react';

import {
  getClassCode as getStoredClassCode,
  setClassCode as setStoredClassCode,
  getUsername as getStoredUsername,
  setUsername as setStoredUsername,
} from '@/lib/session-sync/student-identity';

export type OnboardingRole = 'child' | 'parent' | 'therapist';
export type OnboardingMode = 'young' | 'older';

type OnboardingState = {
  role: OnboardingRole | null;
  username: string;
  mode: OnboardingMode | null;
  classCode: string;
  therapistName: string | null;
};

type OnboardingContextValue = OnboardingState & {
  setRole: (role: OnboardingRole) => void;
  setUsername: (username: string) => void;
  setMode: (mode: OnboardingMode) => void;
  setClassCode: (code: string) => void;
  connectToTherapist: (code: string) => void;
  resetOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [username, setUsernameState] = useState(getStoredUsername);
  const [mode, setMode] = useState<OnboardingMode | null>(null);
  const [classCode, setClassCode] = useState(getStoredClassCode);
  const [therapistName, setTherapistName] = useState<string | null>(null);

  const setUsername = (next: string) => {
    setUsernameState(next);
    setStoredUsername(next);
  };

  const connectToTherapist = (code: string) => {
    setClassCode(code);
    setStoredClassCode(code);
    setTherapistName(`Ms. Rivera`);
  };

  const resetOnboarding = () => {
    setRole(null);
    setUsername('');
    setMode(null);
    setClassCode('');
    setStoredClassCode('');
    setTherapistName(null);
  };

  return (
    <OnboardingContext.Provider
      value={{
        role,
        username,
        mode,
        classCode,
        therapistName,
        setRole,
        setUsername,
        setMode,
        setClassCode,
        connectToTherapist,
        resetOnboarding,
      }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
