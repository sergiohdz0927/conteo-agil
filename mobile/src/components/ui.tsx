import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, gradients } from '../theme';

// ---------- Tipografía ----------
export const type = StyleSheet.create({
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.6, color: colors.accent },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  h2: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.textMuted },
  mono: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.text },
});

// ---------- Pantalla con fondo degradado ----------
export function Screen({
  children,
  scroll = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={gradients.screen}
      locations={[0, 0.45, 1]}
      start={{ x: 0.85, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={styles.flex}
    >
      <SafeAreaView style={styles.flex} edges={['top']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, style]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, style]}>{children}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---------- Tarjeta ----------
export function Card({
  children,
  highlight = false,
  style,
}: {
  children: ReactNode;
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (highlight) {
    return (
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.cardHighlight, style]}
      >
        {children}
      </LinearGradient>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Botón ----------
export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const off = disabled || loading;

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={off}
        style={({ pressed }) => [styles.btn, styles.btnGhost, (pressed || off) && styles.dim]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.btnGhostText}>{title}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [(pressed || off) && styles.dim]}>
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, styles.btnShadow]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.btnText}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ---------- Campo de texto ----------
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

// ---------- Mensaje de error ----------
export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ---------- Barra de progreso ----------
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track}>
      {color ? (
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      ) : (
        <LinearGradient
          colors={[colors.accentDeep, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct}%` }]}
        />
      )}
    </View>
  );
}

// ---------- Etiqueta de estado ----------
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const bg = {
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    neutral: colors.inputBorder,
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, tone === 'neutral' && { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 40 },
  card: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: { borderColor: colors.borderAccent },
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnShadow: {
    shadowColor: colors.accentDeep,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent, letterSpacing: 0.3 },
  btnGhost: { borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: 'rgba(10, 18, 32, 0.6)' },
  btnGhostText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  dim: { opacity: 0.6 },
  field: { gap: 7 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  error: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 122, 122, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.35)',
  },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.onAccent, letterSpacing: 0.5 },
});