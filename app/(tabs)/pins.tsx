import { PinsOlderScreen } from '@/components/pins-tab/pins-older';
import { PinsYoungScreen } from '@/components/pins-tab/pins-young';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function PinsScreen() {
  const { mode } = useOnboarding();
  return mode === 'older' ? <PinsOlderScreen /> : <PinsYoungScreen />;
}
