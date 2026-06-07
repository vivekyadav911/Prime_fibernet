import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function IndexScreen() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
