import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApiBaseUrlConfig } from '@/config/ApiBaseUrlProvider';
import { isApiBaseUrlLocked } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { useNetworkMode } from '@/connectivity/NetworkModeProvider';
import { APP_COPYRIGHT_FOOTER } from '@/constants/branding';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radii, shadowCard, space } from '@/theme/designTokens';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, busy } = useAuth();
  const { mode, setMode, colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { mode: networkMode, setMode: setNetworkMode } = useNetworkMode();
  const { apiBaseUrl, hasCustomApiBaseUrl } = useApiBaseUrlConfig();
  const online = useOnlineStatus();
  const { jornada, loading: jornadaLoading, error: jornadaErr, refresh: refreshJornada } =
    useJornadaActiva();
  useFocusEffect(
    useCallback(() => {
      void refreshJornada();
    }, [refreshJornada]),
  );

  const cardShadow = shadowCard(theme);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.gradientHeroStart, colors.gradientHeroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: 'rgba(255,255,255,0.22)' },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: online ? '#86efac' : '#fca5a5' },
              ]}
            />
            <Text style={styles.statusPillTxt}>
              {online ? 'En línea' : 'Sin conexión'}
            </Text>
          </View>
        </View>
        <Text style={styles.heroHello} numberOfLines={2}>
          Hola,{' '}
          <Text style={styles.heroName}>
            {user?.nombres} {user?.apellidos}
          </Text>
        </Text>
        <Text style={styles.heroMeta}>
          Cédula {user?.user} · Rol {user?.rol}
        </Text>
      </LinearGradient>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
        <View style={styles.sectionHead}>
          <MaterialCommunityIcons name="server-network" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Servidor / API</Text>
        </View>
        <Text style={[styles.monoLine, { color: colors.primary }]} numberOfLines={2}>
          {apiBaseUrl || 'Sin configurar'}
        </Text>
        <Text style={[styles.cardSub, { color: colors.textMuted }]}>
          {isApiBaseUrlLocked()
            ? 'Esta instalación usa la API de producción fija (no editable).'
            : hasCustomApiBaseUrl
              ? 'URL personalizada en este dispositivo (solo desarrollo).'
              : 'Por defecto producción. En desarrollo puedes cambiar el servidor abajo.'}
        </Text>
        {!isApiBaseUrlLocked() ? (
          <Pressable
            style={({ pressed }) => [
              styles.linkPill,
              { borderColor: colors.accent, backgroundColor: colors.accentSoft },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => navigation.navigate('ApiConfig')}
          >
            <Text style={[styles.linkPillTxt, { color: colors.accent }]}>Cambiar servidor</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.h3, { color: colors.text }]}>Apariencia</Text>
      <View style={styles.chipRow}>
        {(['system', 'light', 'dark'] as const).map((m) => (
          <Pressable
            key={m}
            style={({ pressed }) => [
              styles.modeChip,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
              mode === m && {
                borderColor: colors.primary,
                backgroundColor: colors.primarySoft,
              },
              pressed && { opacity: 0.92 },
            ]}
            onPress={() => void setMode(m)}
          >
            <MaterialCommunityIcons
              name={m === 'system' ? 'theme-light-dark' : m === 'light' ? 'white-balance-sunny' : 'weather-night'}
              size={16}
              color={mode === m ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.modeChipTxt,
                { color: colors.text },
                mode === m && { color: colors.primary, fontWeight: '800' },
              ]}
            >
              {m === 'system' ? 'Sistema' : m === 'light' ? 'Claro' : 'Oscuro'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.h3, { color: colors.text }]}>Modo de trabajo</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        En campo suele ir mejor offline; online para sincronizar.
      </Text>
      <View style={styles.chipRow}>
        {(['offline', 'online'] as const).map((nm) => (
          <Pressable
            key={nm}
            style={({ pressed }) => [
              styles.modeChip,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
              networkMode === nm && {
                borderColor: colors.accent,
                backgroundColor: colors.accentSoft,
              },
              pressed && { opacity: 0.92 },
            ]}
            onPress={() => void setNetworkMode(nm)}
          >
            <MaterialCommunityIcons
              name={nm === 'offline' ? 'cloud-off-outline' : 'cloud-sync-outline'}
              size={16}
              color={networkMode === nm ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.modeChipTxt,
                { color: colors.text },
                networkMode === nm && { color: colors.accent, fontWeight: '800' },
              ]}
            >
              {nm === 'offline' ? 'Offline' : 'Online'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.h3, { color: colors.text }]}>Jornada activa</Text>
      {jornadaLoading ? (
        <ActivityIndicator style={{ marginVertical: space.md }} color={colors.primary} />
      ) : jornada ? (
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.success,
              borderWidth: 1.5,
            },
            cardShadow,
          ]}
        >
          <View style={[styles.jornadaBadge, { backgroundColor: colors.successSoft }]}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.success} />
            <Text style={[styles.jornadaBadgeTxt, { color: colors.success }]}>Jornada OK</Text>
          </View>
          <Text style={[styles.jornadaMain, { color: colors.text }]}>
            {jornada.municipio ?? '—'}, {jornada.dpto ?? '—'}
          </Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Supervisor: {jornada.supervisor ?? '—'} · {jornada.localidad ?? '—'}
          </Text>
          <Text style={[styles.idTiny, { color: colors.textMuted }]} selectable>
            {jornada._id}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.warning,
              borderWidth: 1.5,
            },
            cardShadow,
          ]}
        >
          <View style={[styles.jornadaBadge, { backgroundColor: colors.warningSoft }]}>
            <MaterialCommunityIcons name="alert-decagram-outline" size={18} color={colors.warning} />
            <Text style={[styles.jornadaBadgeTxt, { color: colors.warning }]}>Sin jornada</Text>
          </View>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            {jornadaErr
              ? jornadaErr
              : 'No hay jornada activa; no podrás crear perfiles nuevos hasta que un admin abra una.'}
          </Text>
        </View>
      )}

      <Text style={[styles.note, { color: colors.textMuted }]}>
        El inventario principal son los{' '}
        <Text style={{ fontWeight: '800', color: colors.primary }}>perfiles viales</Text>: pestaña Perfiles,
        luego encuesta u offline en Sincronización.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.logout,
          { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
          busy && styles.logoutDisabled,
          pressed && !busy && { opacity: 0.88 },
        ]}
        onPress={() => void logout()}
        disabled={busy}
      >
        <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
        <Text style={[styles.logoutTxt, { color: colors.danger }]}>Cerrar sesión</Text>
      </Pressable>

      <Text style={[styles.footerCopy, { color: colors.textMuted }]}>{APP_COPYRIGHT_FOOTER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {},
  hero: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    marginBottom: space.lg,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: space.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  statusPillTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  heroHello: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  heroMeta: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    marginHorizontal: space.lg,
    marginBottom: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: space.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: space.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  monoLine: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  linkPill: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  linkPillTxt: {
    fontWeight: '800',
    fontSize: 14,
  },
  h3: {
    marginLeft: space.lg,
    marginBottom: space.sm,
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    fontSize: 13,
    lineHeight: 19,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.lg,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeChipTxt: {
    fontSize: 13,
    fontWeight: '600',
  },
  jornadaBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    marginBottom: space.sm,
  },
  jornadaBadgeTxt: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  jornadaMain: {
    fontSize: 18,
    fontWeight: '800',
  },
  idTiny: {
    marginTop: 8,
    fontSize: 10,
    opacity: 0.85,
  },
  note: {
    marginHorizontal: space.lg,
    marginTop: 8,
    marginBottom: space.xl,
    fontSize: 14,
    lineHeight: 21,
  },
  logout: {
    marginHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  logoutDisabled: { opacity: 0.45 },
  logoutTxt: {
    fontSize: 16,
    fontWeight: '800',
  },
  footerCopy: {
    marginTop: 28,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.25,
    lineHeight: 16,
    paddingHorizontal: space.lg,
    opacity: 0.92,
  },
});
