import { Stack } from 'expo-router';

export default function TherapistLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="student/[id]" />
      <Stack.Screen name="assign-homework/[id]" />
    </Stack>
  );
}
