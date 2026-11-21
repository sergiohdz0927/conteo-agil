import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon, type IconName } from '../components/icons';
import { Card, Screen, type } from '../components/ui';
import { ROLE_LABEL, type Role } from '../lib/types';
import { useAuth } from '../store/auth-store';
import { colors, fonts, gradients } from '../theme';

const TILES: { href: string; title: string; subtitle: string; icon: IconName; roles: Role[] }[] = [
  { href: '/discrepancies', title: 'Diferencias', subtitle: 'Revisar y pedir reconteo', icon: 'alert', roles: ['COORDINATOR', 'SUPERVISOR'] },
  { href: '/assignments', title: 'Asignar zonas', subtitle: 'Quién cuenta qué', icon: 'users', roles: ['COORDINATOR', 'SUPERVISOR'] },
  { href: '/campaigns', title: 'Campañas', subtitle: 'Iniciar y cerrar inventarios', icon: 'flag', roles: ['COORDINATOR'] },
  { href: '/plant', title: 'Áreas y zonas', subtitle: 'Estructura de la planta', icon: 'layers', roles: ['COORDINATOR', 'SUPERVISOR'] },
  { href: '/catalog', title: 'Catálogo', subtitle: 'Artículos y códigos', icon: 'barcode', roles: ['COORDINATOR', 'SUPERVISOR'] },
  { href: '/report', title: 'Reporte final', subtitle: 'Resultados del inventario', icon: 'file', roles: ['COORDINATOR', 'SUPERVISOR'] },
];

export default function Menu() {
  const user = useAuth((s) => s.user);
  const tiles = TILES.filter((t) => user && t.roles.includes(user.role));

  return (
    <Screen scroll>
      <BackHeader eyebrow="CENTRO DE CONTROL" title="Herramientas" />

      <Card highlight style={styles.userCard}>
        <LinearGradient colors={gradients.accent} style={styles.avatar}>
          <Icon name="users" size={20} color={colors.onAccent} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>{user?.name}</Text>
          <Text style={type.muted}>
            {user ? ROLE_LABEL[user.role] : ''}
            {user?.area ? ` · ${user.area.name}` : ' · Toda la planta'}
          </Text>
        </View>
      </Card>

      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable
            key={t.href}
            onPress={() => router.push(t.href as Href)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.tileIcon}>
              <Icon name={t.icon} size={22} color={colors.accent} />
            </View>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileSub}>{t.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(95, 216, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  tileSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});