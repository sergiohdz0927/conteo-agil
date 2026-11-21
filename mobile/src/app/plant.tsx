import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon } from '../components/icons';
import { Sheet } from '../components/sheet';
import { Button, Card, ErrorBox, Field, Screen, type } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts } from '../theme';

type AreaRow = { id: number; name: string; code: string; _count: { zones: number; users: number } };
type Zone = { id: number; areaId: number; code: string; name: string };
type Form = { kind: 'area' } | { kind: 'zone'; area: AreaRow };

export default function Plant() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const isCoordinator = user?.role === 'COORDINATOR';
  const areas = useFetch<AreaRow[]>('/areas');

  const [open, setOpen] = useState<number | null>(null);
  const [zones, setZones] = useState<Record<number, Zone[]>>({});
  const [loadingZones, setLoadingZones] = useState<number | null>(null);

  const [form, setForm] = useState<Form | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalZones = (areas.data ?? []).reduce((s, a) => s + a._count.zones, 0);

  async function loadZones(areaId: number) {
    setLoadingZones(areaId);
    try {
      const res = await api<{ zones: Zone[] }>(`/areas/${areaId}/zones`, { token });
      setZones((z) => ({ ...z, [areaId]: res.zones }));
    } finally {
      setLoadingZones(null);
    }
  }

  function toggle(a: AreaRow) {
    if (open === a.id) {
      setOpen(null);
      return;
    }
    setOpen(a.id);
    loadZones(a.id);
  }

  function openForm(f: Form) {
    setForm(f);
    setName('');
    setCode('');
    setFormError(null);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = { name: name.trim(), code: code.trim().toUpperCase() };
      if (form.kind === 'area') {
        await api('/areas', { method: 'POST', token, body });
      } else {
        await api(`/areas/${form.area.id}/zones`, { method: 'POST', token, body });
        await loadZones(form.area.id);
      }
      setForm(null);
      await areas.reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <BackHeader
        eyebrow="PLANTA"
        title="Áreas y zonas"
        right={
          isCoordinator ? (
            <Pressable onPress={() => openForm({ kind: 'area' })} style={styles.addBtn} accessibilityLabel="Nueva área">
              <Icon name="plus" size={22} color={colors.onAccent} />
            </Pressable>
          ) : undefined
        }
      />

      <Card highlight style={styles.summary}>
        <Icon name="layers" size={28} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>
            {areas.data?.length ?? 0} áreas · {totalZones} zonas
          </Text>
          <Text style={type.muted}>Toca un área para ver sus zonas</Text>
        </View>
      </Card>

      {areas.loading && !areas.data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={areas.error} />

      {areas.data?.map((a) => {
        const isOpen = open === a.id;
        return (
          <Card key={a.id} style={isOpen && styles.openCard}>
            <Pressable onPress={() => toggle(a)} style={styles.areaRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{a.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.areaName}>{a.name}</Text>
                <Text style={type.muted}>
                  {a._count.zones} zonas · {a._count.users} personas
                </Text>
              </View>
              <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                <Icon name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Pressable>

            {isOpen && (
              <View style={styles.zones}>
                {loadingZones === a.id && !zones[a.id] && <ActivityIndicator color={colors.accent} />}
                {zones[a.id]?.length === 0 && <Text style={type.muted}>Esta área todavía no tiene zonas.</Text>}
                {zones[a.id]?.map((z) => (
                  <View key={z.id} style={styles.zoneRow}>
                    <Text style={styles.zoneCode}>{z.code}</Text>
                    <Text style={styles.zoneName}>{z.name}</Text>
                  </View>
                ))}
                {isCoordinator && (
                  <Button title="+ Nueva zona" variant="ghost" onPress={() => openForm({ kind: 'zone', area: a })} />
                )}
              </View>
            )}
          </Card>
        );
      })}

      <Sheet
        visible={!!form}
        onClose={() => !saving && setForm(null)}
        eyebrow={form?.kind === 'zone' ? `ÁREA ${form.area.name.toUpperCase()}` : 'PLANTA'}
        title={form?.kind === 'zone' ? 'Nueva zona' : 'Nueva área'}
      >
        <Field
          label="Nombre"
          placeholder={form?.kind === 'zone' ? 'Ej. Rack de bisagras' : 'Ej. Puertas'}
          value={name}
          onChangeText={setName}
        />
        <Field
          label="Código"
          placeholder={form?.kind === 'zone' ? 'Ej. D1' : 'Ej. PUE'}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={10}
        />
        <ErrorBox message={formError} />
        <Button title="Guardar" onPress={save} loading={saving} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  openCard: { borderColor: 'rgba(95, 216, 255, 0.4)' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBox: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(95, 216, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.accent },
  areaName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  zones: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.input,
  },
  zoneCode: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.accent, minWidth: 32 },
  zoneName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});