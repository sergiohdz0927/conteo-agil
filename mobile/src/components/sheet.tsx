import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';
import { type } from './ui';

export function Sheet({
  visible,
  onClose,
  eyebrow,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
          <Text style={type.title}>{title}</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 12, paddingTop: 6 }}
            style={{ maxHeight: 520 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  sheet: {
    backgroundColor: '#101B2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(95, 216, 255, 0.22)',
    padding: 20,
    paddingBottom: 40,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.inputBorder,
    marginBottom: 6,
  },
});