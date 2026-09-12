import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="understanding-stuttering" />
      <Stack.Screen name="diagnostic-assessment" />
      <Stack.Screen name="self-grade" />
    </Stack>
  );
}
