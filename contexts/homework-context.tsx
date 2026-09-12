import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { fetchHomework } from '@/lib/session-sync/homework-fetcher';
import { getClassCode, getOrCreateStudentCode } from '@/lib/session-sync/student-identity';
import { HomeworkChallenge } from '@/lib/session-sync/types';

type HomeworkContextValue = {
  challenges: HomeworkChallenge[];
  source: 'server' | 'cache';
  loading: boolean;
  refresh: () => void;
};

const HomeworkContext = createContext<HomeworkContextValue | null>(null);

export function HomeworkProvider({ children }: { children: ReactNode }) {
  const [challenges, setChallenges] = useState<HomeworkChallenge[]>([]);
  const [source, setSource] = useState<'server' | 'cache'>('cache');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchHomework(getOrCreateStudentCode(), getClassCode())
      .then((result) => {
        setChallenges(result.challenges);
        setSource(result.source);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HomeworkContext.Provider value={{ challenges, source, loading, refresh: load }}>
      {children}
    </HomeworkContext.Provider>
  );
}

export function useHomework() {
  const ctx = useContext(HomeworkContext);
  if (!ctx) {
    throw new Error('useHomework must be used within a HomeworkProvider');
  }
  return ctx;
}
