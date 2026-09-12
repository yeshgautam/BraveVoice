import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TherapistPalette } from '@/constants/therapist-theme';

export default function TherapistTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TherapistPalette.brandBlue,
        tabBarInactiveTintColor: TherapistPalette.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: TherapistPalette.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Students',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assign"
        options={{
          title: 'Assign',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="square.and.pencil" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
