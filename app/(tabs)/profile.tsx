import { ProfileOlderScreen } from '@/components/profile-tab/profile-older';
import { ProfileYoungScreen } from '@/components/profile-tab/profile-young';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function ProfileScreen() {
  const { mode } = useOnboarding();
  return mode === 'older' ? <ProfileOlderScreen /> : <ProfileYoungScreen />;
}
