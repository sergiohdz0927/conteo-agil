import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon } from '../components/icons';
import { Sheet } from '../components/sheet';
import { Button, Card, ErrorBox, Field, Screen, type } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { money } from '../lib/format';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts } from '../theme';

type CatalogItem = {
  id: number;
  sku: string;
  barcode: string;
  description: string;
  unit: string;
  boxSize: number | null;
  unitCost: string; // Prisma manda los decimales como texto
};

const EMPTY = { sku: '', barcode: '', description: '', unit: 'pieza', boxSize: '', unitCost: '' };

export default function Catalog() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const isCoordinator = user?.role === 'COORDINATOR';

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  // Espera a que dejes de escribir 350 ms antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useFetch<CatalogItem[]>(
    `/items${query ? `?search=${encodeURIComponent(query)}` : ''}`,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  async function save() {
    const unitCost = Number(f.unitCost);
    if (!f.sku.trim() || !f.barcode.trim() || !f.description.trim() || Number.isNaN(unitCost)) {
      setFormError('Llena SKU, código de barras, descripción y costo');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api('/items', {
        method: 'POST',
        token,
        body: {
          sku: f.sku.trim().toUpperCase(),
          barcode: f.barcode.trim(),
          description: f.description.trim(),
          unit: f.unit.trim() || 'pieza',
          boxSize: f.boxSize ? Number.parseInt(f.boxSize, 10) : undefined,
          unitCost,
        },
      });
      setFormOpen(false);
      setF(EMPTY);
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <BackHeader
        eyebrow="CATÁLOGO"
        title="Artículos"
        right={
          isCoordinator ? (
            <Pressable
              onPress={() => {
                setF(EMPTY);
                setFormError(null);
                setFormOpen(true);
              }}
              style={styles.addBtn}
              accessibilityLabel="Nuevo artículo"
            >
              <Icon name="plus" size={22} color={colors.onAccent} />
            </Pressable>
          ) : undefined
        }
      />

      {/* Buscador */}
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, SKU o código"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpiar">
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.count}>
        {data ? `${data.length} ${data.length === 1 ? 'artículo' : 'artículos'}` : ' '}
      </Text>

      {loading && !data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={error} />

      {data?.map((i) => (
        <Card key={i.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.sku}>{i.sku}</Text>
            <Text style={styles.barcode}>{i.barcode}</Text>
          </View>
          <Text style={styles.name}>{i.description}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{i.unit}</Text>
            </View>
            {i.boxSize ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>Caja de {i.boxSize}</Text>
              </View>
            ) : null}
            <View style={[styles.tag, styles.tagCost]}>
              <Text style={[styles.tagText, { color: colors.success }]}>
                {money(Number(i.unitCost))} c/u
              </Text>
            </View>
          </View>
        </Card>
      ))}

      <Sheet
        visible={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        eyebrow="CATÁLOGO"
        title="Nuevo artículo"
      >
        <Field label="SKU" placeholder="Ej. BIS-AC-3" value={f.sku} onChangeText={set('sku')} autoCapitalize="characters" />
        <Field
          label="Código de barras"
          placeholder="Ej. 7501000000013"
          value={f.barcode}
          onChangeText={set('barcode')}
          keyboardType="number-pad"
        />
        <Field
          label="Descripción"
          placeholder="Ej. Bisagra de acero 3 pulgadas"
          value={f.description}
          onChangeText={set('description')}
        />
        <Field label="Unidad" placeholder="pieza, metro, hoja…" value={f.unit} onChangeText={set('unit')} />
        <Field
          label="Piezas por caja (opcional)"
          placeholder="Ej. 50"
          value={f.boxSize}
          onChangeText={set('boxSize')}
          keyboardType="number-pad"
        />
        <Field
          label="Costo unitario"
          placeholder="Ej. 12.50"
          value={f.unitCost}
          onChangeText={set('unitCost')}
          keyboardType="decimal-pad"
        />
        <ErrorBox message={formError} />
        <Button title="Guardar artículo" onPress={save} loading={saving} />
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.regular },
  count: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sku: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.accent },
  barcode: { fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.input },
  tagCost: { backgroundColor: 'rgba(94, 230, 168, 0.1)' },
  tagText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
});