import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Button, ErrorBox, Field } from '../components/ui';
import { ApiError } from '../lib/api';
import { useAuth } from '../store/auth-store';
import { colors, fonts, gradients } from '../theme';

const DEMO = [
  { label: 'Coordinador', employee: '1000' },
  { label: 'Supervisor', employee: '2000' },
  { label: 'Contador', employee: '3000' },
];

export default function Login() {
  const login = useAuth((s) => s.login);
  const [employee, setEmployee] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si tarda más de 4 s, avisamos que el servidor está "despertando"
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function onSubmit() {
    if (!employee.trim() || !password) {
      setError('Escribe tu número de empleado y tu contraseña');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(employee.trim(), password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Algo salió mal, intenta de nuevo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={gradients.screen}
      locations={[0, 0.45, 1]}
      start={{ x: 0.9, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={styles.flex}
    >
      {/* Círculos decorativos tipo "radar" */}
      <Svg width={420} height={420} style={styles.radar} pointerEvents="none">
        <Circle cx={210} cy={210} r={200} stroke="#1B3350" fill="none" />
        <Circle cx={210} cy={210} r={150} stroke="#1B3350" fill="none" />
        <Circle cx={210} cy={210} r={100} stroke="#1B3350" fill="none" />
        <Line x1={10} y1={210} x2={410} y2={210} stroke="#1B3350" />
        <Line x1={210} y1={10} x2={210} y2={410} stroke="#1B3350" />
      </Svg>

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Marca */}
            <View style={styles.brand}>
              <LinearGradient
                colors={gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 7l9-4 9 4-9 4-9-4z" stroke={colors.onAccent} strokeWidth={2} strokeLinejoin="round" />
                  <Path d="M3 7v10l9 4 9-4V7" stroke={colors.onAccent} strokeWidth={2} strokeLinejoin="round" />
                  <Path d="M12 11v10" stroke={colors.onAccent} strokeWidth={2} />
                </Svg>
              </LinearGradient>
              <Text style={styles.eyebrow}>INVENTARIO FÍSICO · PLANTA</Text>
              <Text style={styles.title}>ConteoÁgil</Text>
              <Text style={styles.subtitle}>
                Cuenta por zonas, sin hojas y sin detener la operación.
              </Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
              <Field
                label="Número de empleado"
                placeholder="Ej. 1000"
                value={employee}
                onChangeText={setEmployee}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              <Field
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onSubmitEditing={onSubmit}
              />
              <ErrorBox message={error} />
              <Button title="Iniciar sesión" onPress={onSubmit} loading={loading} />
              {slow && (
                <Text style={styles.slow}>
                  Despertando el servidor, puede tardar hasta 1 minuto…
                </Text>
              )}

              {/* Accesos de demostración */}
              <View style={styles.demo}>
                <Text style={styles.demoLabel}>Acceso de demostración</Text>
                <View style={styles.demoRow}>
                  {DEMO.map((d) => (
                    <Pressable
                      key={d.employee}
                      onPress={() => {
                        setEmployee(d.employee);
                        setPassword('conteo123');
                        setError(null);
                      }}
                      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                    >
                      <Text style={styles.chipText}>{d.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.footer}>
              Propuesta para planta de refrigeración comercial · Monterrey
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  radar: { position: 'absolute', top: -40, right: -150, opacity: 0.9 },
  content: { flexGrow: 1, justifyContent: 'space-between', padding: 28, gap: 28 },
  brand: { gap: 10, marginTop: 24 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.accentDeep,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 2, color: colors.accent },
  title: { fontFamily: fonts.bold, fontSize: 40, color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  form: {
    gap: 14,
    padding: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 29, 48, 0.88)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slow: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  demo: { gap: 8, marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  demoLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textFaint },
  demoRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: 'rgba(95, 216, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
  footer: { fontFamily: fonts.regular, fontSize: 12, color: colors.textFaint, textAlign: 'center' },
});