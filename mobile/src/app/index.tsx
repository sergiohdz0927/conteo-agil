import { Redirect } from 'expo-router';
import { useAuth } from '../store/auth-store';

export default function Index() {
  const user = useAuth((s) => s.user);

  if (!user) return <Redirect href="/login" />;
  return <Redirect href={user.role === 'COUNTER' ? '/my-zones' : '/dashboard'} />;
}