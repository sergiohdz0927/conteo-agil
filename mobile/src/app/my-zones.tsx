import { Icon } from '../components/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, ErrorBox, ProgressBar, Screen, type } from '../components/ui';
import type { AssignmentStatus, MyAssignment } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts, gradients } from '../theme';

const STATUS: Record<AssignmentStatus, { label: string; tone: 'accent' | 'success' | 'neutral' }> = {
  IN_PROGRESS: { label: 'EN CURSO', tone: 'accent' },
  DONE: { label: 'TERMINADA', tone: 'success' },
  PENDING: { label: 'PENDIENTE', tone: 'neutral' },
};

export default function MyZones() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { data, loading, error } = useFetch<MyAssignment[]>('/my-assignments');

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const firstName = user?.name.split(' ')[0] ?? '';

  const counted = data?.reduce((s, a) => s + a.countedItems, 0) ?? 0;
  const done = data?.filter((a) => a.status === 'DONE').length ?? 0;

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <Screen scroll>
      {/* Encabezado */}
      <View style={styles.header}>
        <LinearGradient colors={gradients.accent} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={type.muted}>Contador · {user?.area?.name ?? 'Sin área'}</Text>
          <Text style={type.title}>Hola, {firstName}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.iconBtn} accessibilityLabel="Cerrar sesión">
          <Icon name="log-out-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Resumen */}
      <Card highlight style={styles.summary}>
        <Icon name="cube-outline" size={34} color={colors.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.muted}>Tu avance de hoy</Text>
          <Text style={type.mono}>
            {counted}
            <Text style={styles.summaryOf}>
              {' '}
              artículos · {done} de {data?.length ?? 0} zonas
            </Text>
          </Text>
        </View>
      </Card>

      <Text style={styles.sectionLabel}>MIS ZONAS</Text>

      {loading && !data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={error} />
      {data && data.length === 0 && (
        <Card>
          <Text style={type.h2}>Sin zonas asignadas</Text>
          <Text style={type.muted}>Tu supervisor te asignará zonas cuando inicie el inventario.</Text>
        </Card>
      )}

      {data?.map((a) => {
        const pct = a.totalItems ? Math.round((a.countedItems * 100) / a.totalItems) : 0;
        const status = STATUS[a.status];
        const isDone = a.status === 'DONE';
        return (
          <Pressable
            key={a.id}
            onPress={() => router.push({ pathname: '/zone/[id]', params: { id: String(a.id) } })}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <Card style={a.status === 'IN_PROGRESS' && styles.activeCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.zoneCode, a.status === 'IN_PROGRESS' && { color: colors.accent }]}>
                    ZONA {a.zone.code}
                  </Text>
                  <Text style={styles.zoneName}>{a.zone.name}</Text>
                </View>
                <Badge label={status.label} tone={status.tone} />
              </View>
              <ProgressBar value={pct} color={isDone ? colors.success : undefined} />
              <View style={styles.rowBetween}>
                <Text style={type.muted}>
                  {a.countedItems} de {a.totalItems} artículos
                </Text>
                {!isDone && <Text style={styles.cta}>Continuar conteo ›</Text>}
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryOf: { fontFamily: fonts.regular, fontSize: 13, color: colors.textFaint },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.5, color: colors.textMuted },
  activeCard: { borderColor: 'rgba(95, 216, 255, 0.4)' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  zoneCode: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.textMuted },
  zoneName: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  cta: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
});