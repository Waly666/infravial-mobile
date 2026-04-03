import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radii } from '@/theme/designTokens';
import { useAppTheme } from '@/theme/ThemeProvider';

export function WizardChipRow<T extends string>(props: {
  label: string;
  value: string;
  options: readonly T[];
  onSelect: (v: T) => void;
}): React.JSX.Element {
  const { label, value, options, onSelect } = props;
  const { colors } = useAppTheme();

  return (
    <View style={styles.block}>
      <Text style={[styles.lbl, { color: colors.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable
              key={String(o)}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? colors.primary : colors.surface,
                  borderColor: on ? colors.primary : colors.border,
                  borderWidth: on ? 2 : 1.5,
                },
              ]}
              onPress={() => onSelect(o)}
            >
              <Text
                style={[
                  styles.chipTxt,
                  { color: on ? '#fff' : colors.text, fontWeight: on ? '800' : '600' },
                ]}
                numberOfLines={2}
              >
                {String(o)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  lbl: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'nowrap', paddingBottom: 2 },
  chip: {
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    maxWidth: 280,
  },
  chipTxt: { fontSize: 12, lineHeight: 16 },
});
