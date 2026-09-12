import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

const TAB_COLORS = {
  progress: '#7C4DFF',
  home: '#20C997',
  games: '#4DABF7',
  profile: '#9775FA',
  rewards: '#F5B942',
  pins: '#E64980',
};

export default function TabLayout() {
  const { mode } = useOnboarding();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: OnboardingPalette.progressActive,
        tabBarInactiveTintColor: '#7A9AB0',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#C8DFF0', borderTopWidth: 1 },
      }}>
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.line.uptrend.xyaxis" color={TAB_COLORS.progress} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={TAB_COLORS.home} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gamecontroller.fill" color={TAB_COLORS.games} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={TAB_COLORS.profile} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          // Rewards is an 8+ ("older") feature only — hidden from the young (4-7) tab bar.
          href: mode === 'young' ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="trophy.fill" color={TAB_COLORS.rewards} />,
        }}
      />
      <Tabs.Screen
        name="pins"
        options={{
          title: 'Pins',
          href: mode === 'older' ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="rosette" color={TAB_COLORS.pins} />,
        }}
      />
    </Tabs>
  );
}
