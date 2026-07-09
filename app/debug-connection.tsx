import { Redirect } from 'expo-router';

/** Публичный URL /debug-connection больше не показываем пользователям (только dev: /_debug-connection) */
export default function DebugConnectionRedirect() {
  return <Redirect href="/" />;
}
