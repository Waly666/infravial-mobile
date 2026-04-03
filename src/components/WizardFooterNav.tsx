import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii } from '@/theme/designTokens';
import { useAppTheme } from '@/theme/ThemeProvider';

export type WizardFooterNavProps = {
  showPrev?: boolean;
  onPrev?: () => void;
  prevDisabled?: boolean;
  prevLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
};

export function WizardFooterNav({
  showPrev = true,
  onPrev,
  prevDisabled,
  prevLabel = 'Anterior',
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
}: WizardFooterNavProps): React.JSX.Element {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const blocked = Boolean(primaryDisabled || primaryLoading);

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 12 + insets.bottom,
        },
      ]}
    >
      {showPrev ? (
        <Pressable
          style={[
            styles.navBtn,
            { borderColor: colors.border },
            prevDisabled && styles.dis,
          ]}
          disabled={prevDisabled}
          onPress={onPrev}
        >
          <Text style={[styles.navTxt, { color: colors.text }]}>{prevLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.primaryOuter, showPrev ? styles.primaryFlex : styles.primaryFull]}
        disabled={blocked}
        onPress={onPrimary}
      >
        <LinearGradient
          colors={[colors.gradientCtaStart, colors.gradientCtaEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.navPriInner, blocked && styles.dis]}
        >
          {primaryLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.navPriTxt}>{primaryLabel}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    alignItems: 'stretch',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTxt: { fontWeight: '700', fontSize: 15 },
  primaryOuter: { borderRadius: radii.sm, overflow: 'hidden' },
  primaryFlex: { flex: 1 },
  primaryFull: { flex: 1 },
  navPriInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  navPriTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  dis: { opacity: 0.45 },
});
