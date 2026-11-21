import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Button, Card, ErrorBox, Screen, type } from '../components/ui';
import { int, money } from '../lib/format';
import type { Campaign, LineStatus, ReportLine, Summary } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { colors, fonts } from '../theme';

type ReportData = { campaign: Campaign; generatedAt: string; summary: Summary; lines: ReportLine[] };

const LINE: Record<LineStatus, { label: string; color: string }> = {
  OK: { label: 'Cuadra', color: colors.success },
  DIFF: { label: 'Diferencia', color: colors.danger },
  RECOUNT: { label: 'Reconteo', color: colors.warning },
  PENDING: { label: 'Pendiente', color: colors.textFaint },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildHtml(r: ReportData) {
  const s = r.summary;
  const rows = r.lines
    .map(
      (l) => `<tr>
        <td>${esc(l.area.name)} · ${esc(l.zone.code)}</td>
        <td><b>${esc(l.item.description)}</b><br/><span class="sku">${esc(l.item.sku)}</span></td>
        <td class="n">${l.expected}</td>
        <td class="n">${l.finalQty ?? '—'}</td>
        <td class="n ${(l.diff ?? 0) < 0 ? 'neg' : (l.diff ?? 0) > 0 ? 'pos' : ''}">${l.diff === null ? '—' : (l.diff > 0 ? '+' : '') + l.diff}</td>
        <td class="n">${l.value === null ? '—' : money(l.value)}</td>
        <td>${LINE[l.status].label}</td>
      </tr>`,
    )
    .join('');

  return `<html><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0B1424;padding:28px}
    h1{margin:0;font-size:24px} .muted{color:#5A6B85;font-size:12px}
    .band{height:6px;background:linear-gradient(90deg,#5FD8FF,#2C8CFF);border-radius:3px;margin:12px 0 18px}
    .kpis{display:flex;gap:10px;margin-bottom:18px}
    .kpi{flex:1;border:1px solid #D5DEEA;border-radius:10px;padding:10px}
    .kpi b{display:block;font-size:20px;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{text-align:left;background:#0B1424;color:#fff;padding:7px}
    td{padding:7px;border-bottom:1px solid #E3E9F2;vertical-align:top}
    .n{text-align:right;font-family:Menlo,monospace} .neg{color:#D23B3B} .pos{color:#1E9E63}
    .sku{color:#2C8CFF;font-family:Menlo,monospace;font-size:10px}
  </style></head><body>
    <div class="muted">CONTEOÁGIL · REPORTE DE INVENTARIO FÍSICO</div>
    <h1>${esc(r.campaign.name)}</h1>
    <div class="muted">Generado el ${new Date(r.generatedAt).toLocaleString()}</div>
    <div class="band"></div>
    <div class="kpis">
      <div class="kpi">Avance<b>${s.progress}%</b></div>
      <div class="kpi">Exactitud<b>${s.accuracy === null ? '—' : s.accuracy + '%'}</b></div>
      <div class="kpi">Diferencias<b>${s.discrepancies}</b></div>
      <div class="kpi">Valor neto<b>${money(s.netValue)}</b></div>
    </div>
    <table><thead><tr>
      <th>Zona</th><th>Artículo</th><th>Sistema</th><th>Contado</th><th>Dif.</th><th>Valor</th><th>Estado</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
}

export default function Report() {
  const campaigns = useFetch<Campaign[]>('/campaigns');
  const [selected, setSelected] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const list = campaigns.data ?? [];
  const campaignId =
    selected ?? list.find((c) => c.status === 'ACTIVE')?.id ?? list[0]?.id ?? null;
  const report = useFetch<ReportData>(campaignId ? `/campaigns/${campaignId}/report` : null);
  const r = report.data;

  // Agrupar líneas por área
  const groups = new Map<string, ReportLine[]>();
  for (const l of r?.lines ?? []) groups.set(l.area.name, [...(groups.get(l.area.name) ?? []), l]);

  const countBy = (st: LineStatus) => r?.lines.filter((l) => l.status === st).length ?? 0;

  async function exportPdf() {
    if (!r) return;
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(r) });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('No se pudo exportar', 'Intenta de nuevo');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen scroll>
      <BackHeader eyebrow="RESULTADOS" title="Reporte final" />

      {/* Selector de campaña */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {list.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setSelected(c.id)}
            style={[styles.chip, c.id === campaignId && styles.chipOn]}
          >
            <Text style={[styles.chipText, c.id === campaignId && styles.chipTextOn]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {(campaigns.loading || report.loading) && !r && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={campaigns.error ?? report.error} />

      {r && (
        <>
          {/* KPIs */}
          <View style={styles.grid}>
            <Card highlight style={styles.kpi}>
              <Text style={styles.kpiLabel}>AVANCE</Text>
              <Text style={type.mono}>{r.summary.progress}%</Text>
            </Card>
            <Card highlight style={styles.kpi}>
              <Text style={styles.kpiLabel}>EXACTITUD</Text>
              <Text style={[type.mono, { color: colors.success }]}>
                {r.summary.accuracy === null ? '—' : `${r.summary.accuracy}%`}
              </Text>
            </Card>
            <Card style={styles.kpi}>
              <Text style={styles.kpiLabel}>DIFERENCIAS</Text>
              <Text style={[type.mono, { color: colors.warning }]}>{r.summary.discrepancies}</Text>
            </Card>
            <Card style={styles.kpi}>
              <Text style={styles.kpiLabel}>VALOR NETO</Text>
              <Text
                style={[type.mono, { fontSize: 17, color: r.summary.netValue < 0 ? colors.danger : colors.success }]}
              >
                {money(r.summary.netValue)}
              </Text>
            </Card>
          </View>

          {/* Estado de las líneas */}
          <Card>
            <Text style={type.h2}>Estado de los artículos</Text>
            <View style={styles.legend}>
              {(['OK', 'DIFF', 'RECOUNT', 'PENDING'] as LineStatus[]).map((st) => (
                <View key={st} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: LINE[st].color }]} />
                  <Text style={type.muted}>
                    {LINE[st].label}: <Text style={styles.legendNum}>{countBy(st)}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Button title="Exportar PDF" onPress={exportPdf} loading={exporting} />

          {/* Detalle por área */}
          {[...groups.entries()].map(([area, lines]) => (
            <Card key={area}>
              <Text style={type.h2}>{area}</Text>
              {lines.map((l) => (
                <View key={`${l.zone.id}-${l.item.id}`} style={styles.line}>
                  <View style={[styles.dot, { backgroundColor: LINE[l.status].color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {l.item.description}
                    </Text>
                    <Text style={styles.lineMeta}>
                      Zona {l.zone.code} · sistema {int(l.expected)} · contado{' '}
                      {l.finalQty === null ? '—' : int(l.finalQty)}
                    </Text>
                  </View>
                  <Text style={[styles.lineDiff, { color: l.status === 'DIFF' ? ((l.diff ?? 0) < 0 ? colors.danger : colors.success) : LINE[l.status].color }]}>
                    {l.diff === null ? LINE[l.status].label : `${l.diff > 0 ? '+' : ''}${l.diff}`}
                  </Text>
                </View>
              ))}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48%', flexGrow: 1, gap: 4 },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendNum: { fontFamily: fonts.monoBold, color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  lineMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  lineDiff: { fontFamily: fonts.monoBold, fontSize: 13 },
});