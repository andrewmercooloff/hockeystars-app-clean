import { Stack } from 'expo-router';
import { colors } from '../../theme/colors';

export default function ExercisesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.scene },
        animation: 'fade',
        animationDuration: 120,
      }}
    />
  );
}
