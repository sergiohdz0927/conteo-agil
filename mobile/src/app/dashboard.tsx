import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Screen, type } from '../components/ui';
import { ROLE_LABEL } from '../lib/types';
import { useAuth } from '../store/auth-store';

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <Screen>
      <Text style={type.eyebrow}>{user ? ROLE_LABEL[user.role].toUpperCase() : ''}</Text>
      <Text style={type.title}>Hola, {user?.name}</Text>
      <Card highlight>
        <Text style={type.muted}>Aquí irá el dashboard (Paso 8C).</Text>
      </Card>
      <Button
        title="Cerrar sesión"
        variant="ghost"
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
      />
    </Screen>
  );
}