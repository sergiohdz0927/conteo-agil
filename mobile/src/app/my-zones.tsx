import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Screen, type } from '../components/ui';
import { useAuth } from '../store/auth-store';

export default function MyZones() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <Screen>
      <Text style={type.eyebrow}>CONTADOR · {user?.area?.name?.toUpperCase()}</Text>
      <Text style={type.title}>Hola, {user?.name}</Text>
      <Card highlight>
        <Text style={type.muted}>Aquí irán tus zonas (Paso 8C).</Text>
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