import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Badge, Button, ErrorBox } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import type { AssignmentDetail, AssignmentItem } from '../../lib/types';
import { useFetch } from '../../lib/use-fetch';
import { useAuth } from '../../store/auth-store';
import { colors, fonts } from '../../theme';

type Item = AssignmentItem['item'];

const FRAME_W = 250;
const FRAME_H = 170;
const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

// Línea cian que sube y baja dentro del marco
function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, FRAME_H - 14] });
  return <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />;
}

export default function ScanScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const token = useAuth((s) => s.token);
  const { data, reload } = useFetch<AssignmentDetail>(`/my-assignments/${id}`);
  const [permission, requestPermission] = useCameraPermissions();

  const [item, setItem] = useState<Item | null>(null);
  const [mode, setMode] = useState<'unit' | 'box'>('unit');
  const [qty, setQty] = useState('0');
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const locked = useRef(false);

  const items = data?.items ?? [];
  const counted = items.filter((i) => i.countedQuantity !== null).length;
  const current = item ? items.find((i) => i.item.id === item.id) : undefined;

  const n = Number.parseInt(qty, 10) || 0;
  const pieces = mode === 'box' && item?.boxSize ? n * item.boxSize : n;

  function select(next: Item, extraNotice: string | null = null) {
    const existing = items.find((i) => i.item.id === next.id);
    setItem(next);
    setMode('unit');
    // Si ya lo habías contado (y no es reconteo), se precarga para que puedas corregir
    setQty(
      existing && existing.countedQuantity !== null && !existing.needsRecount
        ? String(existing.countedQuantity)
        : '0',
    );
    setNotice(extraNotice);
    setError(null);
    setSaved(null);
    setManual(false);
    setCode('');
  }

  // Si llegaste tocando un artículo de la lista, ya viene seleccionado
  useEffect(() => {
    if (!itemId || item || !data) return;
    const found = data.items.find((i) => String(i.item.id) === itemId);
    if (found) select(found.item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, data]);

  async function findByCode(raw: string) {
    const barcode = raw.trim();
    if (!barcode) return;

    // 1. ¿Está en la lista de esta zona?
    const inZone = items.find((i) => i.item.barcode === barcode);
    if (inZone) {
      select(inZone.item);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // 2. Si no, se busca en el catálogo (sería un "sobrante" en esta zona)
    setBusy(true);
    try {
      const found = await api<Item>(`/items/barcode/${encodeURIComponent(barcode)}`, { token });
      select(
        {
          id: found.id,
          sku: found.sku,
          barcode: found.barcode,
          description: found.description,
          unit: found.unit,
          boxSize: found.boxSize,
        },
        'Este artículo no estaba registrado en esta zona. Se guardará como sobrante.',
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo buscar el código');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  function onScanned(result: BarcodeScanningResult) {
    if (locked.current) return;
    locked.current = true;
    findByCode(result.data).finally(() => {
      // pausa para no leer el mismo código 10 veces seguidas
      setTimeout(() => {
        locked.current = false;
      }, 1500);
    });
  }

  function step(delta: number) {
    setQty(String(Math.max(0, n + delta)));
    Haptics.selectionAsync();
  }

  async function save() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/my-assignments/${id}/counts`, {
        method: 'POST',
        token,
        body: { itemId: item.id, quantity: pieces },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(`${item.description}: ${pieces} ${item.unit}`);
      setItem(null);
      setNotice(null);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar, intenta de nuevo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ---------- Cámara ---------- */}
      <View style={styles.cameraBox}>
        {permission?.granted ? (
          <CameraView
            style={FILL}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'ean13', 'ean8', 'upc_a', 'code39', 'qr'],
            }}
            onBarcodeScanned={item ? undefined : onScanned}
          />
        ) : (
          <LinearGradient colors={['#1A2E44', '#0A1220']} style={[FILL, styles.noCam]}>
            <Icon name="barcode" size={36} color={colors.accent} />
            <Text style={styles.noCamText}>Permite la cámara para escanear etiquetas</Text>
            <Pressable onPress={requestPermission} style={styles.permBtn}>
              <Text style={styles.permText}>Permitir cámara</Text>
            </Pressable>
          </LinearGradient>
        )}

        {/* Marco con esquinas */}
        <View style={styles.frame} pointerEvents="none">
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          {!item && permission?.granted && <ScanLine />}
        </View>

        {/* Barra superior */}
        <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.glassBtn} accessibilityLabel="Regresar">
              <Icon name="chevron-back" size={22} />
            </Pressable>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                ZONA {data?.zone.code ?? ''} · {counted}/{items.length}
              </Text>
            </View>
          </View>
        </SafeAreaView>

        <Text style={styles.hint}>
          {item ? 'Artículo listo para capturar' : 'Apunta al código de barras de la etiqueta'}
        </Text>
      </View>

      {/* ---------- Panel de captura ---------- */}
      <KeyboardAvoidingView
        style={styles.panelWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient colors={['#13213A', '#0B1424']} style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
            {saved && (
              <View style={styles.saved}>
                <Icon name="checkmark" size={16} color={colors.success} strokeWidth={2.6} />
                <Text style={styles.savedText} numberOfLines={1}>
                  Guardado · {saved}
                </Text>
              </View>
            )}
            <ErrorBox message={error} />

            {item ? (
              <>
                {/* Artículo */}
                <View style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Icon name="barcode" size={24} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.sku}>{item.sku}</Text>
                    <Text style={styles.itemName}>{item.description}</Text>
                    <Text style={styles.itemMeta}>
                      Unidad: {item.unit}
                      {item.boxSize ? ` · Caja de ${item.boxSize}` : ''}
                    </Text>
                  </View>
                  {current?.needsRecount && <Badge label="RECONTEO" tone="warning" />}
                </View>

                {notice && <Text style={styles.notice}>{notice}</Text>}

                {/* Por pieza / Por caja */}
                {item.boxSize ? (
                  <View style={styles.segment}>
                    {(['unit', 'box'] as const).map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setMode(m)}
                        style={[styles.segBtn, mode === m && styles.segBtnOn]}
                      >
                        <Text style={[styles.segText, mode === m && styles.segTextOn]}>
                          {m === 'unit' ? `Por ${item.unit}` : 'Por caja'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {/* Cantidad */}
                <View style={styles.stepper}>
                  <Pressable onPress={() => step(-1)} style={styles.stepBtn} accessibilityLabel="Restar">
                    <Icon name="minus" size={26} />
                  </Pressable>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <TextInput
                      value={qty}
                      onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={styles.qtyInput}
                    />
                    <Text style={styles.qtyLabel}>
                      {mode === 'box' && item.boxSize
                        ? `cajas = ${pieces} ${item.unit}s`
                        : `${item.unit}s`}
                    </Text>
                  </View>
                  <Pressable onPress={() => step(1)} style={styles.stepBtn} accessibilityLabel="Sumar">
                    <Icon name="plus" size={26} />
                  </Pressable>
                </View>

                <Button title="Guardar conteo" onPress={save} loading={busy} />
                <Button
                  title="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    setItem(null);
                    setNotice(null);
                  }}
                />
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Escanea un artículo</Text>
                <Text style={styles.emptyText}>
                  Lee la etiqueta con la cámara o escribe el código si está dañada.
                </Text>

                {manual ? (
                  <View style={styles.manualRow}>
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      placeholder="Código de barras"
                      placeholderTextColor={colors.textFaint}
                      keyboardType="number-pad"
                      autoFocus
                      onSubmitEditing={() => findByCode(code)}
                      style={styles.manualInput}
                    />
                    <Pressable onPress={() => findByCode(code)} style={styles.manualBtn}>
                      {busy ? (
                        <ActivityIndicator color={colors.onAccent} />
                      ) : (
                        <Text style={styles.manualBtnText}>Buscar</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <Button title="Escribir código" variant="ghost" onPress={() => setManual(true)} />
                )}

                {busy && !manual && <ActivityIndicator color={colors.accent} />}
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

const CORNER = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  cameraBox: { height: 360, overflow: 'hidden', backgroundColor: '#0A1220' },
  noCam: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  noCamText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  permBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.accent },
  permText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onAccent },

  frame: {
    position: 'absolute',
    width: FRAME_W,
    height: FRAME_H,
    top: 120,
    alignSelf: 'center',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
  scanLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(7, 11, 20, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 11, 20, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pillText: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 1, color: colors.text },
  hint: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },

  panelWrap: { flex: 1, marginTop: -24 },
  panel: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(95, 216, 255, 0.22)',
  },
  panelContent: { padding: 20, gap: 14, paddingBottom: 40 },

  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(94, 230, 168, 0.12)',
  },
  savedText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.success, flexShrink: 1 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(95, 216, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sku: { fontFamily: fonts.mono, fontSize: 12, color: colors.accent },
  itemName: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  itemMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  notice: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.warning,
    backgroundColor: 'rgba(255, 181, 71, 0.1)',
    padding: 10,
    borderRadius: 12,
  },

  segment: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 999, backgroundColor: colors.input },
  segBtn: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: colors.inputBorder },
  segText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  segTextOn: { color: colors.text },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    fontFamily: fonts.monoBold,
    fontSize: 48,
    color: colors.text,
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
  },
  qtyLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },

  emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  manualRow: { flexDirection: 'row', gap: 10 },
  manualInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.mono,
  },
  manualBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },
});