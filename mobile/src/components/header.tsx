import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Icon } from './icons';
import { type } from './ui';

export function BackHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} style={styles.btn} accessibilityLabel="Regresar">
        <Icon name="chevron-back" size={22} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.eyebrow}>{eyebrow}</Text>
        <Text style={type.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});