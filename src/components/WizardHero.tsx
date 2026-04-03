import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { radii } from '@/theme/designTokens';
import { useAppTheme } from '@/theme/ThemeProvider';

export type WizardHeroProps = {
  productTitle: string;
  productSubtitle?: string;
  step?: number;
  totalSteps?: number;
  modeLabel: string;
  statusMessages?: string[];
};

export function WizardHero({
  productTitle,
  productSubtitle,
  step,
  totalSteps,
  modeLabel,
  statusMessages,
}: WizardHeroProps): React.JSX.Element {
  const { colors } = useAppTheme();
  const pct =
    step != null && totalSteps != null && totalSteps > 0
      ? Math.min(100, (step / totalSteps) * 100)
      : null;

  return (
    <LinearGradient
      colors={[colors.gradientHeroStart, colors.gradientHeroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.topRow}>
        {modeLabel ? (
          <View style={styles.modePill}>
            <Text style={styles.modePillTxt}>{modeLabel}</Text>
          </View>
        ) : null}
        {step != null && totalSteps != null ? (
          <Text style={styles.stepTxt}>
            Paso {step} / {totalSteps}
          </Text>
        ) : null}
      </View>
      <Text style={styles.title}>{productTitle}</Text>
      {productSubtitle ? <Text style={styles.sub}>{productSubtitle}</Text> : null}
      {pct != null ? (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      ) : null}
      {statusMessages?.map((m, i) => (
        <Text key={i} style={styles.status}>
          {m}
        </Text>
      ))}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  modePillTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTxt: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 18 },
  barTrack: {
    height: 5,
    borderRadius: radii.pill,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  barFill: { height: '100%', borderRadius: radii.pill, backgroundColor: '#fff' },
  status: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
});
