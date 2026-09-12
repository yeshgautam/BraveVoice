import { DailyCheckInScreen } from '@/components/daily-check-in-screen';
import { HomeOlderScreen } from '@/components/home/home-older';
import { HomeYoungScreen } from '@/components/home/home-young';
import { useCheckIn } from '@/contexts/check-in-context';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function HomeScreen() {
  const { mode } = useOnboarding();
  const { hasCheckedInToday } = useCheckIn();

  if (!hasCheckedInToday) {
    return <DailyCheckInScreen />;
  }

  return mode === 'older' ? <HomeOlderScreen /> : <HomeYoungScreen />;
}
