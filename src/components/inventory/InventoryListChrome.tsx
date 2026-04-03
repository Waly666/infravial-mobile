import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { JornadaActivaDto } from '@/types/jornada';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radii, shadowCard, space } from '@/theme/designTokens';

export const LIST_HORIZONTAL_PAD = space.lg;

export function ListOnlineBanner(props: { online: boolean; count?: number }): React.JSX.Element {
  const { online, count } = props;
  const { colors, theme } = useAppTheme();
  const cardSh = shadowCard(theme);
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.surface, borderColor: colors.border },
        cardSh,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: online ? colors.success : colors.danger },
        ]}
      />
      <Text style={[styles.bannerTxt, { color: colors.text }]}>
        {online ? 'En línea' : 'Sin conexión'}
      </Text>
      {count !== undefined ? (
        <View style={[styles.countPill, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.countPillTxt, { color: colors.primary }]}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ListJornadaStripe(props: {
  jornada: JornadaActivaDto | null;
  okDetail?: string;
  warnMessage: string;
}): React.JSX.Element {
  const { jornada, okDetail, warnMessage } = props;
  const { colors } = useAppTheme();
  if (jornada) {
    const detail =
      okDetail ?? `${jornada.municipio ?? '—'} · ${jornada.supervisor ?? '—'}`;
    return (
      <View
        style={[
          styles.jStripe,
          {
            backgroundColor: colors.successSoft,
            borderColor: colors.success,
          },
        ]}
      >
        <MaterialCommunityIcons name="briefcase-check-outline" size={18} color={colors.success} />
        <Text style={[styles.jStripeTxt, { color: colors.text }]} numberOfLines={3}>
          Jornada activa · {detail}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.jStripe,
        {
          backgroundColor: colors.warningSoft,
          borderColor: colors.warning,
        },
      ]}
    >
      <MaterialCommunityIcons name="alert-decagram-outline" size={18} color={colors.warning} />
      <Text style={[styles.jStripeTxt, { color: colors.text }]} numberOfLines={4}>
        {warnMessage}
      </Text>
    </View>
  );
}

export function ListGradientCta(props: {
  label: string;
  /** Icono a la izquierda (p. ej. Phosphor con `weight="fill"` y color blanco). */
  leading: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  const { label, leading, onPress, disabled } = props;
  const { colors, theme } = useAppTheme();
  const cardSh = shadowCard(theme);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.ctaOuter,
        (!disabled && pressed && { opacity: 0.92 }) as object,
        disabled && styles.ctaDis,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={[colors.gradientCtaStart, colors.gradientCtaEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.ctaInner, cardSh]}
      >
        {leading}
        <Text style={styles.ctaTxt}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function ListHint(props: { children: string }): React.JSX.Element {
  const { colors } = useAppTheme();
  return (
    <Text style={[styles.hint, { color: colors.textMuted }]}>{props.children}</Text>
  );
}

export function ListSearchField(props: TextInputProps): React.JSX.Element {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.searchWrap,
        { backgroundColor: colors.inputBg, borderColor: colors.border },
      ]}
    >
      <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
      <TextInput
        {...props}
        style={[styles.searchInput, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

export function ListResultCount(props: { total: number; filtered: number }): React.JSX.Element {
  const { total, filtered } = props;
  const { colors } = useAppTheme();
  const same = total === filtered;
  return (
    <Text style={[styles.resultCount, { color: colors.textMuted }]}>
      {same ? `${filtered} registro${filtered === 1 ? '' : 's'}` : `${filtered} de ${total} mostrados`}
    </Text>
  );
}

export function ListRecordCard(props: { children: ReactNode }): React.JSX.Element {
  const { children } = props;
  const { colors, theme } = useAppTheme();
  const cardSh = shadowCard(theme);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        cardSh,
      ]}
    >
      <LinearGradient
        colors={[colors.gradientCtaStart, colors.accent]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.cardAccent}
      />
      {children}
    </View>
  );
}

export function ListCardActions(props: { children: ReactNode }): React.JSX.Element {
  return <View style={styles.cardActions}>{props.children}</View>;
}

export function ListPillButton(props: {
  label: string;
  onPress: () => void;
  variant?: 'neutral' | 'primary' | 'danger';
}): React.JSX.Element {
  const { label, onPress, variant = 'neutral' } = props;
  const { colors } = useAppTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pillBtn,
        {
          backgroundColor: isDanger ? colors.dangerSoft : colors.surfaceAlt,
          borderColor: isDanger ? colors.danger : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.pillBtnTxt,
          {
            color: isDanger ? colors.danger : isPrimary ? colors.primary : colors.text,
            fontWeight: '800',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ListEmptyState(props: {
  /** Si se pasa `iconNode`, tiene prioridad sobre `icon`. */
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconNode?: ReactNode;
  /** Fondo del círculo del icono (p. ej. rgba del color del acento). */
  iconHaloColor?: string;
  title: string;
  hint?: string;
}): React.JSX.Element {
  const { icon = 'clipboard-text-search-outline', iconNode, iconHaloColor, title, hint } = props;
  const { colors } = useAppTheme();
  const halo = iconHaloColor ?? colors.primarySoft;
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyCircle, { backgroundColor: halo }]}>
        {iconNode ?? <MaterialCommunityIcons name={icon} size={44} color={colors.primary} />}
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function ListLoadingBlock(): React.JSX.Element {
  const { colors } = useAppTheme();
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingTxt, { color: colors.textMuted }]}>Cargando…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bannerTxt: { flex: 1, fontWeight: '700', fontSize: 14 },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  countPillTxt: { fontWeight: '800', fontSize: 13 },
  jStripe: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  jStripeTxt: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  ctaOuter: { borderRadius: radii.lg, overflow: 'hidden' },
  ctaDis: { opacity: 0.45 },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 16,
    borderRadius: radii.lg,
  },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: -0.2 },
  hint: { fontSize: 12, marginTop: space.sm, marginBottom: space.md, lineHeight: 17 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 8 },
  resultCount: { marginTop: space.xs, marginBottom: space.sm, fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: radii.lg,
    padding: space.md + 2,
    marginBottom: space.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: {
    alignSelf: 'flex-start',
    width: 56,
    height: 5,
    borderRadius: radii.pill,
    marginBottom: space.md,
  },
  cardActions: {
    marginTop: space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: space.sm,
  },
  pillBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  pillBtnTxt: { fontSize: 12 },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: space.xl,
  },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2 },
  emptyHint: { fontSize: 14, textAlign: 'center', marginTop: space.sm, lineHeight: 21 },
  loadingBlock: { paddingVertical: 48, alignItems: 'center', gap: space.md },
  loadingTxt: { fontSize: 14, fontWeight: '600' },
});
