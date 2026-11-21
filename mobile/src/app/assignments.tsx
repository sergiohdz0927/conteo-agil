import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon } from '../components/icons';
import { Badge, Card, ErrorBox, ProgressBar, Screen, type } from '../components/ui';
import { ApiError, api } from '../lib/api';
import type { AssignmentStatus, Campaign } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts, gradients } from '../theme';

type ZoneRow = {
  zoneId: number;
  code: string;
  name: string;
  area: { id: number; name: string };
  assignmentId: number | null;
  status: AssignmentStatus | null;
  counter: { id: number; name: string; employeeNumber: string } | null;
  totalItems: number;
  countedItems: number;
  progress: number;
};

type Counter = {
  id: number;
  name: string;
  employeeNumber: string;
  area: { id: number; name: string } | null;
};

const STATUS: Record<AssignmentStatus, { label: string; tone: 'accent' | 'success' | 'neutral' }> = {
  IN_PROGRESS: { label: 'EN CURSO', tone: 'accent' },
  DONE: { label: 'TERMINADA', tone: 'success' },
  PENDING: { label: 'PENDIENTE', tone: 'neutral' },
};

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Assignments() {
  const token = useAuth((s) => s.token);
  const active = useFetch<{ campaign: Campaign | null }>('/campaigns/active');
  const campaignId = active.data?.campaign?.id;
  const zones = useFetch<ZoneRow[]>(campaignId ? `/campaigns/${campaignId}/assignments` : null);
  const counters = useFetch<Counter[]>('/counters');

  const [picking, setPicking] = useState<ZoneRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Agrupar zonas por área
  const groups = new Map<string, ZoneRow[]>();
  for (const z of zones.data ?? []) {
    groups.set(z.area.name, [...(groups.get(z.area.name) ?? []), z]);
  }
  const unassigned = (zones.data ?? []).filter((z) => !z.counter).length;

  // Contadores del área de la zona primero
  const options = [...(counters.data ?? [])].sort(
    (a, b) =>
      Number(b.area?.id === picking?.area.id) - Number(a.area?.id === picking?.area.id) ||
      a.name.localeCompare(b.name),
  );

  async function assign(counter: Counter) {
    if (!picking || !campaignId) return;
    setSaving(true);
    try {
      await api(`/campaigns/${campaignId}/assignments`, {
        method: 'POST',
        token,
        body: { zoneId: picking.zoneId, counterId: counter.id },
      });
      setPicking(null);
      await zones.reload();
    } catch (e) {
      Alert.alert('No se pudo asignar', e instanceof ApiError ? e.message : 'Intenta de nuevo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <BackHeader eyebrow={active.data?.campaign?.name.toUpperCase() ?? 'CAMPAÑA'} title="Asignar zonas" />

      <Card highlight style={styles.summary}>
        <Icon name="users" size={28} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>
            {zones.data?.length ?? 0} zonas · {counters.data?.length ?? 0} contadores
          </Text>
          <Text style={[type.muted, unassigned > 0 && { color: colors.warning }]}>
            {unassigned > 0 ? `${unassigned} zonas sin contador` : 'Todas las zonas tienen contador'}
          </Text>
        </View>
      </Card>

      {(active.loading || zones.loading) && !zones.data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={active.error ?? zones.error ?? counters.error} />

      {[...groups.entries()].map(([area, rows]) => (
        <View key={area} style={{ gap: 10 }}>
          <Text style={styles.sectionLabel}>{area.toUpperCase()}</Text>
          {rows.map((z) => (
            <Pressable
              key={z.zoneId}
              onPress={() => setPicking(z)}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <Card style={!z.counter && styles.unassignedCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.code}>ZONA {z.code}</Text>
                    <Text style={styles.zoneName}>{z.name}</Text>
                  </View>
                  {z.status && <Badge label={STATUS[z.status].label} tone={STATUS[z.status].tone} />}
                </View>

                <ProgressBar value={z.progress} color={z.status === 'DONE' ? colors.success : undefined} />

                <View style={styles.rowBetween}>
                  <View style={styles.counterRow}>
                    {z.counter ? (
                      <>
                        <LinearGradient colors={gradients.accent} style={styles.miniAvatar}>
                          <Text style={styles.miniAvatarText}>{initials(z.counter.name)}</Text>
                        </LinearGradient>
                        <Text style={styles.counterName}>{z.counter.name}</Text>
                      </>
                    ) : (
                      <Text style={[styles.counterName, { color: colors.warning }]}>Sin asignar</Text>
                    )}
                  </View>
                  <Text style={styles.change}>{z.counter ? 'Cambiar ›' : 'Asignar ›'}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      {/* Hoja para elegir contador */}
      <Modal visible={!!picking} transparent animationType="slide" onRequestClose={() => setPicking(null)}>
        <Pressable style={styles.backdrop} onPress={() => !saving && setPicking(null)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={type.eyebrow}>
            ZONA {picking?.code} · {picking?.area.name.toUpperCase()}
          </Text>
          <Text style={type.title}>Elegir contador</Text>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10, paddingVertical: 6 }}>
            {options.map((c) => {
              const current = picking?.counter?.id === c.id;
              const sameArea = c.area?.id === picking?.area.id;
              return (
                <Pressable
                  key={c.id}
                  disabled={saving}
                  onPress={() => assign(c)}
                  style={({ pressed }) => [styles.option, current && styles.optionOn, pressed && { opacity: 0.7 }]}
                >
                  <LinearGradient colors={gradients.accent} style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(c.name)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>{c.name}</Text>
                    <Text style={type.muted}>
                      #{c.employeeNumber} · {c.area?.name ?? 'Sin área'}
                      {sameArea ? ' · misma área' : ''}
                    </Text>
                  </View>
                  {current && <Icon name="checkmark" size={20} color={colors.success} />}
                </Pressable>
              );
            })}
          </ScrollView>
          {saving && <ActivityIndicator color={colors.accent} />}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.5, color: colors.textMuted },
  unassignedCard: { borderColor: 'rgba(255, 181, 71, 0.45)' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.accent },
  zoneName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  miniAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontFamily: fonts.bold, fontSize: 10, color: colors.onAccent },
  counterName: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  change: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  sheet: {
    backgroundColor: '#101B2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(95, 216, 255, 0.22)',
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.inputBorder,
    marginBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  optionOn: { borderColor: 'rgba(94, 230, 168, 0.5)' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onAccent },
  optionName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});