import { Icon } from '../components/icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card, ErrorBox, ProgressBar, Screen, type } from '../components/ui';
import { compactMoney, int, money } from '../lib/format';
import type { Campaign, DashboardData } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts } from '../theme';

// Anillo de avance
function Ring({ value }: { value: number }) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{value}%</Text>
        <Text style={styles.ringLabel}>de la planta</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const active = useFetch<{ campaign: Campaign | null }>('/campaigns/active');
  const campaign = active.data?.campaign ?? null;
  const dash = useFetch<DashboardData>(campaign ? `/campaigns/${campaign.id}/dashboard` : null);

  // "En vivo": se actualiza cada 15 segundos mientras la pantalla está abierta
  const reloadDash = dash.reload;
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(reloadDash, 15000);
      return () => clearInterval(timer);
    }, [reloadDash]),
  );

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  const roleLine =
    user?.role === 'SUPERVISOR' ? `SUPERVISOR · ${user.area?.name?.toUpperCase() ?? ''}` : 'COORDINADOR';

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={type.eyebrow}>{roleLine} · EN VIVO</Text>
        </View>
        <Text style={type.title}>{campaign?.name ?? 'Panel de control'}</Text>
      </View>
      <Pressable onPress={() => router.push('/menu')} style={styles.iconBtn} accessibilityLabel="Herramientas">
        <Icon name="grid" size={20} color={colors.accent} />
      </Pressable>
      <Pressable onPress={onLogout} style={styles.iconBtn} accessibilityLabel="Cerrar sesión">
        <Icon name="log-out-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  if (active.loading && !active.data) {
    return (
      <Screen>
        {header}
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (active.error) {
    return (
      <Screen>
        {header}
        <ErrorBox message={active.error} />
      </Screen>
    );
  }

  if (!campaign) {
    return (
      <Screen>
        {header}
        <Card highlight>
          <Text style={type.h2}>No hay una campaña activa</Text>
          <Text style={type.muted}>Cuando el coordinador inicie un inventario, aquí verás el avance en vivo.</Text>
        </Card>
      </Screen>
    );
  }

  if (!dash.data) {
    return (
      <Screen>
        {header}
        {dash.error ? (
          <ErrorBox message={dash.error} />
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        )}
      </Screen>
    );
  }

  const { summary, byArea, lateZones, topDiscrepancies } = dash.data;

  return (
    <Screen scroll>
      {header}

      {/* Avance general */}
      <Card highlight style={styles.hero}>
        <Ring value={summary.progress} />
        <View style={{ flex: 1, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Text style={styles.kpiLabel}>ARTÍCULOS CONTADOS</Text>
            <Text style={type.mono}>
              {int(summary.countedItems)}
              <Text style={styles.kpiOf}> / {int(summary.totalItems)}</Text>
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.kpiLabel}>EXACTITUD</Text>
            <Text style={[type.mono, { color: colors.success }]}>
              {summary.accuracy === null ? '—' : `${summary.accuracy}%`}
            </Text>
          </View>
        </View>
      </Card>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: colors.warning }]}>{summary.discrepancies}</Text>
          <Text style={styles.kpiTileLabel}>Diferencias</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{summary.recountsPending}</Text>
          <Text style={styles.kpiTileLabel}>Reconteos</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>
            {compactMoney(summary.discrepancyValue)}
          </Text>
          <Text style={styles.kpiTileLabel}>Valor dif.</Text>
        </View>
      </View>

      {/* Avance por área */}
      <Card>
        <Text style={type.h2}>Avance por área</Text>
        {byArea.map((a) => {
          const low = a.progress < 50;
          return (
            <View key={a.id} style={{ gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={type.body}>{a.name}</Text>
                <Text style={[styles.pct, low && { color: colors.warning }]}>{a.progress}%</Text>
              </View>
              <ProgressBar value={a.progress} color={low ? colors.warning : undefined} />
            </View>
          );
        })}
      </Card>

      {/* Zonas atrasadas */}
      {lateZones.length > 0 && (
        <Card>
          <Text style={type.h2}>Zonas atrasadas</Text>
          {lateZones.map((z) => {
            const tone = z.progress === 0 ? colors.danger : colors.warning;
            return (
              <View key={z.zoneId} style={styles.zoneRow}>
                <View style={[styles.zoneCode, { backgroundColor: `${tone}22` }]}>
                  <Text style={[styles.zoneCodeText, { color: tone }]}>{z.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {z.name} · {z.area}
                  </Text>
                  <Text style={type.muted}>
                    {z.progress}% · {z.counter ?? 'sin asignar'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Top diferencias */}
      {topDiscrepancies.length > 0 && (
        <Card>
          <Text style={type.h2}>Artículos con más diferencia</Text>
          {topDiscrepancies.map((l) => (
            <View key={`${l.zone.id}-${l.item.id}`} style={styles.zoneRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {l.item.description}
                </Text>
                <Text style={type.muted}>
                  Zona {l.zone.code} · {l.area.name}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.diff, { color: (l.diff ?? 0) < 0 ? colors.danger : colors.success }]}>
                  {(l.diff ?? 0) > 0 ? '+' : ''}
                  {l.diff} {l.item.unit}
                </Text>
                <Text style={type.muted}>{money(l.value ?? 0)}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.monoBold, fontSize: 28, color: colors.text },
  ringLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted },
  kpiOf: { fontFamily: fonts.mono, fontSize: 13, color: colors.textFaint },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiTile: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiValue: { fontFamily: fonts.monoBold, fontSize: 22, color: colors.text },
  kpiTileLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  pct: { fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneCode: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  zoneCodeText: { fontFamily: fonts.monoBold, fontSize: 12 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  diff: { fontFamily: fonts.monoBold, fontSize: 14 },
});