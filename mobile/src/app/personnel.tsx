import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/header';
import { Icon } from '../components/icons';
import { Sheet } from '../components/sheet';
import { Badge, Button, Card, ErrorBox, Field, Screen, type } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { ROLE_LABEL, type Role } from '../lib/types';
import { useFetch } from '../lib/use-fetch';
import { useAuth } from '../store/auth-store';
import { colors, fonts, gradients } from '../theme';

type StaffUser = {
  id: number;
  employeeNumber: string;
  name: string;
  role: Role;
  createdAt: string;
  area: { id: number; name: string } | null;
};
type AreaOpt = { id: number; name: string };
type Mode = { kind: 'create' } | { kind: 'edit'; user: StaffUser };
type Filter = Role | 'ALL';

const ROLE_OPTS: { role: Role; label: string }[] = [
  { role: 'COUNTER', label: 'Contador' },
  { role: 'SUPERVISOR', label: 'Supervisor' },
  { role: 'COORDINATOR', label: 'Coordinador' },
];
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'SUPERVISOR', label: 'Supervisores' },
  { key: 'COUNTER', label: 'Contadores' },
  { key: 'COORDINATOR', label: 'Coordinadores' },
];
const ROLE_TONE: Record<Role, 'accent' | 'warning' | 'neutral'> = {
  COORDINATOR: 'accent',
  SUPERVISOR: 'warning',
  COUNTER: 'neutral',
};

const tempPassword = () => `conteo${Math.floor(1000 + Math.random() * 9000)}`;
const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export default function Personnel() {
  const me = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const users = useFetch<StaffUser[]>('/users');
  const areas = useFetch<AreaOpt[]>('/areas');

  const [filter, setFilter] = useState<Filter>('ALL');
  const [mode, setMode] = useState<Mode | null>(null);
  const [employee, setEmployee] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('COUNTER');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const list = (users.data ?? []).filter((u) => filter === 'ALL' || u.role === filter);
  const count = (r: Role) => users.data?.filter((u) => u.role === r).length ?? 0;

  function openCreate() {
    setMode({ kind: 'create' });
    setEmployee('');
    setName('');
    setRole('COUNTER');
    setAreaId(null);
    setPassword(tempPassword());
    setFormError(null);
  }

  function openEdit(u: StaffUser) {
    setMode({ kind: 'edit', user: u });
    setName(u.name);
    setRole(u.role);
    setAreaId(u.area?.id ?? null);
    setNewPassword('');
    setFormError(null);
  }

  async function save() {
    if (!mode) return;
    setSaving(true);
    setFormError(null);
    try {
      if (mode.kind === 'create') {
        await api('/users', {
          method: 'POST',
          token,
          body: {
            employeeNumber: employee.trim(),
            name: name.trim(),
            role,
            areaId: role === 'COORDINATOR' ? undefined : areaId ?? undefined,
            password,
          },
        });
        setMode(null);
        await users.reload();
        Alert.alert(
          'Usuario creado',
          `Comparte estos datos con ${name.trim()}:\n\nNúmero de empleado: ${employee.trim()}\nContraseña: ${password}`,
        );
      } else {
        await api(`/users/${mode.user.id}`, {
          method: 'PATCH',
          token,
          body: { name: name.trim(), role, areaId: role === 'COORDINATOR' ? null : areaId },
        });
        setMode(null);
        await users.reload();
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (mode?.kind !== 'edit') return;
    if (newPassword.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api(`/users/${mode.user.id}/password`, {
        method: 'PATCH',
        token,
        body: { password: newPassword },
      });
      Alert.alert(
        'Contraseña restablecida',
        `Nueva contraseña de ${mode.user.name}:\n\n${newPassword}`,
      );
      setNewPassword('');
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo restablecer');
    } finally {
      setSaving(false);
    }
  }

  const editingSelf = mode?.kind === 'edit' && mode.user.id === me?.id;

  return (
    <Screen scroll>
      <BackHeader
        eyebrow="EQUIPO"
        title="Personal"
        right={
          <Pressable onPress={openCreate} style={styles.addBtn} accessibilityLabel="Nuevo usuario">
            <Icon name="plus" size={22} color={colors.onAccent} />
          </Pressable>
        }
      />

      <Card highlight style={styles.summary}>
        <Icon name="user" size={28} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>{users.data?.length ?? 0} personas con acceso</Text>
          <Text style={type.muted}>
            {count('SUPERVISOR')} supervisores · {count('COUNTER')} contadores · {count('COORDINATOR')}{' '}
            coordinadores
          </Text>
        </View>
      </Card>

      <View style={styles.wrap}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      {users.loading && !users.data && <ActivityIndicator color={colors.accent} />}
      <ErrorBox message={users.error} />

      {list.map((u) => (
        <Pressable key={u.id} onPress={() => openEdit(u)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
          <Card style={styles.userCard}>
            <LinearGradient colors={gradients.accent} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(u.name)}</Text>
            </LinearGradient>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>
                {u.name}
                {u.id === me?.id ? <Text style={type.muted}> (tú)</Text> : null}
              </Text>
              <Text style={type.muted}>
                #{u.employeeNumber} · {u.area?.name ?? 'Toda la planta'}
              </Text>
            </View>
            <Badge label={ROLE_LABEL[u.role].split(' ')[0].toUpperCase()} tone={ROLE_TONE[u.role]} />
          </Card>
        </Pressable>
      ))}

      <Sheet
        visible={!!mode}
        onClose={() => !saving && setMode(null)}
        eyebrow={mode?.kind === 'edit' ? `EMPLEADO #${mode.user.employeeNumber}` : 'EQUIPO'}
        title={mode?.kind === 'edit' ? 'Editar usuario' : 'Nuevo usuario'}
      >
        {mode?.kind === 'create' && (
          <Field
            label="Número de empleado"
            placeholder="Ej. 3005"
            value={employee}
            onChangeText={setEmployee}
            keyboardType="number-pad"
          />
        )}
        <Field label="Nombre completo" placeholder="Ej. Ana Martínez" value={name} onChangeText={setName} />

        <Text style={type.label}>Rol</Text>
        <View style={styles.wrap}>
          {ROLE_OPTS.map((o) => (
            <Chip
              key={o.role}
              label={o.label}
              on={role === o.role}
              onPress={() => !editingSelf && setRole(o.role)}
            />
          ))}
        </View>
        {editingSelf && <Text style={type.muted}>No puedes cambiar tu propio rol.</Text>}

        {role !== 'COORDINATOR' && (
          <>
            <Text style={type.label}>Área</Text>
            <View style={styles.wrap}>
              {(areas.data ?? []).map((a) => (
                <Chip key={a.id} label={a.name} on={areaId === a.id} onPress={() => setAreaId(a.id)} />
              ))}
            </View>
          </>
        )}

        {mode?.kind === 'create' && (
          <>
            <Field
              label="Contraseña temporal"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setPassword(tempPassword())}>
              <Text style={styles.link}>Generar otra contraseña</Text>
            </Pressable>
          </>
        )}

        <ErrorBox message={formError} />
        <Button
          title={mode?.kind === 'edit' ? 'Guardar cambios' : 'Crear usuario'}
          onPress={save}
          loading={saving}
        />

        {mode?.kind === 'edit' && (
          <View style={styles.resetBox}>
            <Text style={type.h2}>Restablecer contraseña</Text>
            <Text style={type.muted}>Úsalo si la persona olvidó su contraseña.</Text>
            <Field
              label="Nueva contraseña"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <Button title="Restablecer" variant="ghost" onPress={resetPassword} loading={saving} />
          </View>
        )}
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onAccent },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  resetBox: { gap: 10, marginTop: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
});