import { Icon } from '../../components/icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBox, ProgressBar, Screen, type } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import type { AssignmentDetail } from '../../lib/types';
import { useFetch } from '../../lib/use-fetch';
import { useAuth } from '../../store/auth-store';
import { colors, fonts } from '../../theme';

export default function ZoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuth((s) => s.token);
  const { data, loading, error } = useFetch<AssignmentDetail>(`/my-assignments/${id}`);
  const [finishing, setFinishing] = useState(false);

  const items = data?.items ?? [];
  const counted = items.filter((i) => i.countedQuantity !== null).length;
  const pending = items.length - counted;
  const recounts = items.filter((i) => i.needsRecount).length;
  const pct = items.length ? Math.round((counted * 100) / items.length) : 0;

  function goScan(itemId?: number) {
    router.push({
      pathname: '/scan/[id]',
      params: itemId ? { id: String(id), itemId: String(itemId) } : { id: String(id) },
    });
  }

  function onFinish() {
    Alert.alert('¿Terminar zona?', 'Confirma que ya contaste todos los artículos de esta zona.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: async () => {
          setFinishing(true);
          try {
            await api(`/my-assignments/${id}/finish`, { method: 'POST', token });
            router.back();
          } catch (e) {
            Alert.alert('No se pudo terminar', e instanceof ApiError ? e.message : 'Intenta de nuevo');
          } finally {
            setFinishing(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      {/* Encabezado con regresar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Regresar">
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={type.eyebrow}>
            ZONA {data?.zone.code ?? ''} · {data?.area.name.toUpperCase() ?? ''}
          </Text>
          <Text style={type.title} numberOfLines={1}>
            {data?.zone.name ?? 'Cargando…'}
          </Text>
        </View>
      </View>

      {loading && !data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={error} />

      {data && (
        <>
          {/* Avance */}
          <Card highlight>
            <View style={styles.rowBetween}>
              <Text style={type.muted}>Avance de la zona</Text>
              <Text style={styles.pct}>
                {counted}/{items.length}
              </Text>
            </View>
            <ProgressBar value={pct} />
            {recounts > 0 && (
              <View style={styles.recountNote}>
                <Icon name="refresh" size={16} color={colors.warning} />
                <Text style={styles.recountText}>
                  Tu supervisor pidió recontar {recounts} {recounts === 1 ? 'artículo' : 'artículos'}
                </Text>
              </View>
            )}
          </Card>

          <Button title="Escanear artículo" onPress={() => goScan()} />

          {/* Lista de artículos (conteo a ciegas: no se muestra lo que dice el sistema) */}
          <Text style={styles.sectionLabel}>ARTÍCULOS DE LA ZONA</Text>
          {items.map((i) => {
            const isCounted = i.countedQuantity !== null;
            return (
              <Pressable
                key={i.item.id}
                onPress={() => goScan(i.item.id)}
                style={({ pressed }) => [pressed && { opacity: 0.8 }]}
              >
                <Card style={[styles.itemCard, i.needsRecount && styles.recountCard]}>
                  <View
                    style={[
                      styles.check,
                      isCounted && { backgroundColor: 'rgba(94, 230, 168, 0.15)' },
                      i.needsRecount && { backgroundColor: 'rgba(255, 181, 71, 0.15)' },
                    ]}
                  >
                    <Icon
                      name={i.needsRecount ? 'refresh' : isCounted ? 'checkmark' : 'scan-outline'}
                      size={18}
                      color={i.needsRecount ? colors.warning : isCounted ? colors.success : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.sku}>{i.item.sku}</Text>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {i.item.description}
                    </Text>
                  </View>
                  {i.needsRecount ? (
                    <Badge label="RECONTAR" tone="warning" />
                  ) : isCounted ? (
                    <Text style={styles.qty}>
                      {i.countedQuantity} <Text style={styles.unit}>{i.item.unit}</Text>
                    </Text>
                  ) : (
                    <Text style={type.muted}>Pendiente</Text>
                  )}
                </Card>
              </Pressable>
            );
          })}

          <Button
            title={pending > 0 ? `Faltan ${pending} por contar` : 'Terminar zona'}
            variant="ghost"
            onPress={onFinish}
            loading={finishing}
            disabled={pending > 0 || data.status === 'DONE'}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pct: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.text },
  recountNote: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recountText: { fontFamily: fonts.medium, fontSize: 13, color: colors.warning },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.5, color: colors.textMuted },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  recountCard: { borderColor: 'rgba(255, 181, 71, 0.45)' },
  check: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sku: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent },
  itemName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  qty: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.text },
  unit: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
});