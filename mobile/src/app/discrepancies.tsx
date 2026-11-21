import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon } from '../components/icons';
import { Badge, Card, ErrorBox, Screen, type } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { int, money } from '../lib/format';
import type { Campaign, ReportLine } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts } from '../theme';

type Filter = 'all' | 'short' | 'over';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'short', label: 'Faltantes' },
  { key: 'over', label: 'Sobrantes' },
];

export default function Discrepancies() {
  const token = useAuth((s) => s.token);
  const active = useFetch<{ campaign: Campaign | null }>('/campaigns/active');
  const campaignId = active.data?.campaign?.id;
  const { data, loading, error, reload } = useFetch<ReportLine[]>(
    campaignId ? `/campaigns/${campaignId}/discrepancies` : null,
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [sending, setSending] = useState<string | null>(null);

  const all = data ?? [];
  const lines = all.filter((l) => {
    if (filter === 'short') return (l.diff ?? 0) < 0;
    if (filter === 'over') return (l.diff ?? 0) > 0;
    return true;
  });
  const totalValue = all.reduce((s, l) => s + Math.abs(l.value ?? 0), 0);
  const waiting = all.filter((l) => l.status === 'RECOUNT').length;

  function askRecount(l: ReportLine) {
    Alert.alert(
      '¿Pedir reconteo?',
      `${l.item.description} en zona ${l.zone.code}. El contador volverá a contarlo sin ver la cantidad anterior.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pedir reconteo',
          onPress: async () => {
            const key = `${l.zone.id}-${l.item.id}`;
            setSending(key);
            try {
              await api(`/campaigns/${campaignId}/recounts`, {
                method: 'POST',
                token,
                body: { zoneId: l.zone.id, itemId: l.item.id },
              });
              await reload();
            } catch (e) {
              Alert.alert('No se pudo', e instanceof ApiError ? e.message : 'Intenta de nuevo');
            } finally {
              setSending(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <BackHeader eyebrow={active.data?.campaign?.name.toUpperCase() ?? 'CAMPAÑA'} title="Diferencias" />

      {/* Resumen */}
      <Card highlight style={styles.summary}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.kpiLabel}>ARTÍCULOS CON DIFERENCIA</Text>
          <Text style={[type.mono, { color: colors.warning }]}>{all.length - waiting}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.kpiLabel}>VALOR TOTAL</Text>
          <Text style={[type.mono, { color: colors.danger }]}>{money(totalValue)}</Text>
        </View>
      </Card>
      {waiting > 0 && (
        <Text style={styles.waiting}>
          {waiting} {waiting === 1 ? 'reconteo pendiente' : 'reconteos pendientes'} de que el contador lo haga
        </Text>
      )}

      {/* Filtros */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {(active.loading || loading) && !data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={active.error ?? error} />
      {data && lines.length === 0 && (
        <Card>
          <Text style={type.h2}>Sin diferencias</Text>
          <Text style={type.muted}>Todo lo contado coincide con el sistema.</Text>
        </Card>
      )}

      {lines.map((l) => {
        const key = `${l.zone.id}-${l.item.id}`;
        const diff = l.diff ?? 0;
        const isWaiting = l.status === 'RECOUNT';
        const confirmed = l.status === 'DIFF' && l.recountRequested;
        const diffColor = diff < 0 ? colors.danger : colors.success;

        return (
          <Card key={key} style={isWaiting && styles.waitingCard}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.sku}>
                  {l.item.sku} · ZONA {l.zone.code} · {l.area.name.toUpperCase()}
                </Text>
                <Text style={styles.itemName}>{l.item.description}</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Sistema</Text>
                <Text style={styles.statValue}>{int(l.expected)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Contado</Text>
                <Text style={styles.statValue}>
                  {isWaiting ? int(l.firstCount ?? 0) : int(l.finalQty ?? 0)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Diferencia</Text>
                <Text style={[styles.statValue, { color: isWaiting ? colors.textMuted : diffColor }]}>
                  {isWaiting ? '—' : `${diff > 0 ? '+' : ''}${int(diff)}`}
                </Text>
              </View>
            </View>

            <View style={styles.rowBottom}>
              <Text style={[styles.value, { color: isWaiting ? colors.textMuted : diffColor }]}>
                {isWaiting ? 'Esperando reconteo' : money(l.value ?? 0)}
              </Text>
              {isWaiting ? (
                <Badge label="RECONTEO PEDIDO" tone="warning" />
              ) : confirmed ? (
                <Badge label="RECONTEO CONFIRMADO" tone="neutral" />
              ) : (
                <Pressable
                  onPress={() => askRecount(l)}
                  disabled={sending === key}
                  style={({ pressed }) => [styles.recountBtn, (pressed || sending === key) && { opacity: 0.6 }]}
                >
                  {sending === key ? (
                    <ActivityIndicator size="small" color={colors.warning} />
                  ) : (
                    <>
                      <Icon name="refresh" size={16} color={colors.warning} />
                      <Text style={styles.recountText}>Pedir reconteo</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 12 },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted },
  waiting: { fontFamily: fonts.medium, fontSize: 13, color: colors.warning },
  filters: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  chipTextOn: { color: colors.onAccent },
  waitingCard: { borderColor: 'rgba(255, 181, 71, 0.45)' },
  rowTop: { flexDirection: 'row', gap: 10 },
  sku: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent },
  itemName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.input, gap: 2 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  statValue: { fontFamily: fonts.monoBold, fontSize: 17, color: colors.text },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontFamily: fonts.monoBold, fontSize: 15 },
  recountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.5)',
    backgroundColor: 'rgba(255, 181, 71, 0.1)',
  },
  recountText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.warning },
});