import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon } from '../components/icons';
import { Badge, Button, Card, ErrorBox, Field, Screen, type } from '../components/ui';
import { ApiError, api } from '../lib/api';
import type { Campaign } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts } from '../theme';

type CampaignRow = Campaign & { _count: { assignments: number; expected: number } };

const STATUS: Record<Campaign['status'], { label: string; tone: 'accent' | 'success' | 'neutral' }> = {
  DRAFT: { label: 'EN PREPARACIÓN', tone: 'neutral' },
  ACTIVE: { label: 'ACTIVA', tone: 'accent' },
  CLOSED: { label: 'CERRADA', tone: 'success' },
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Campaigns() {
  const token = useAuth((s) => s.token);
  const { data, loading, error, reload } = useFetch<CampaignRow[]>('/campaigns');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function create() {
    if (!name.trim()) {
      setFormError('Escribe un nombre, por ejemplo "Inventario Dic 2026"');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await api('/campaigns', { method: 'POST', token, body: { name: name.trim() } });
      setName('');
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo crear');
    } finally {
      setCreating(false);
    }
  }

  async function change(c: CampaignRow, action: 'start' | 'close') {
    setBusyId(c.id);
    try {
      await api(`/campaigns/${c.id}/${action}`, { method: 'PATCH', token });
      await reload();
    } catch (e) {
      Alert.alert('No se pudo', e instanceof ApiError ? e.message : 'Intenta de nuevo');
    } finally {
      setBusyId(null);
    }
  }

  function confirmClose(c: CampaignRow) {
    Alert.alert(
      '¿Cerrar inventario?',
      `Al cerrar "${c.name}" ya no se podrán capturar ni corregir conteos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar inventario', style: 'destructive', onPress: () => change(c, 'close') },
      ],
    );
  }

  return (
    <Screen scroll>
      <BackHeader eyebrow="INVENTARIOS" title="Campañas" />

      {/* Nueva campaña */}
      <Card highlight>
        <Text style={type.h2}>Nueva campaña</Text>
        <Text style={type.muted}>
          Las existencias del sistema se copian de la campaña anterior. En la planta real vendrían del ERP.
        </Text>
        <Field
          label="Nombre"
          placeholder="Ej. Inventario Dic 2026"
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
        />
        <ErrorBox message={formError} />
        <Button title="Crear campaña" onPress={create} loading={creating} />
      </Card>

      <Text style={styles.sectionLabel}>HISTORIAL</Text>
      {loading && !data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={error} />

      {data?.map((c) => (
        <Card key={c.id} style={c.status === 'ACTIVE' && styles.activeCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.code}>CAMPAÑA #{c.id}</Text>
              <Text style={styles.name}>{c.name}</Text>
            </View>
            <Badge label={STATUS[c.status].label} tone={STATUS[c.status].tone} />
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Icon name="layers" size={16} color={colors.textMuted} />
              <Text style={styles.statText}>{c._count.assignments} zonas asignadas</Text>
            </View>
            <View style={styles.stat}>
              <Icon name="barcode" size={16} color={colors.textMuted} />
              <Text style={styles.statText}>{c._count.expected} artículos</Text>
            </View>
          </View>

          <Text style={type.muted}>
            Creada {fmtDate(c.createdAt)} · Inicio {fmtDate(c.startedAt)} · Cierre {fmtDate(c.closedAt)}
          </Text>

          {c.status === 'DRAFT' && (
            <Button title="Iniciar inventario" onPress={() => change(c, 'start')} loading={busyId === c.id} />
          )}
          {c.status === 'ACTIVE' && (
            <Button
              title="Cerrar inventario"
              variant="ghost"
              onPress={() => confirmClose(c)}
              loading={busyId === c.id}
            />
          )}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.5, color: colors.textMuted },
  activeCard: { borderColor: 'rgba(95, 216, 255, 0.4)' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { fontFamily: fonts.monoBold, fontSize: 11, color: colors.accent },
  name: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  stats: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
});