import { ProgressOlderScreen } from '@/components/progress-tab/progress-older';
import { ProgressYoungScreen } from '@/components/progress-tab/progress-young';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function ProgressScreen() {
  const { mode } = useOnboarding();
  return mode === 'older' ? <ProgressOlderScreen /> : <ProgressYoungScreen />;
}
