import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Единая точка входа: телефон → код → вход в существующий аккаунт или
 * продолжение регистрации. Логика живёт в /register, этот маршрут оставлен
 * для старых ссылок и переходов внутри приложения.
 */
export default function LoginScreen() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/register', params }} />;
}
