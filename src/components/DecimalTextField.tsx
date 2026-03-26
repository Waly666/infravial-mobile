import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  lbl: { fontSize: 13, fontWeight: '600', color: '#37474f', marginBottom: 6 },
  lblSmall: { fontSize: 12, fontWeight: '600', color: '#546e7a', marginBottom: 4 },
  inp: {
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
});

export function displayDecimalText(value: unknown, variant: 'medida' | 'coord' | 'pend'): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return '';
  if (variant === 'medida' && n === 0) return '';
  return String(n);
}

/** Valor numérico al salir del campo (permite escribir decimales sin perder el punto a mitad de frase). */
export function DecimalTextField(props: {
  label: string;
  small?: boolean;
  value: unknown;
  variant: 'medida' | 'coord' | 'pend';
  onCommit: (n: number | null) => void;
  hint?: string;
}): React.JSX.Element {
  const { label, small, value, variant, onCommit, hint } = props;
  const [text, setText] = useState(() => displayDecimalText(value, variant));
  useEffect(() => {
    setText(displayDecimalText(value, variant));
  }, [value, variant]);

  function flush(): void {
    const raw = text.trim().replace(',', '.');
    if (raw === '' || raw === '.' || raw === '-') {
      if (variant === 'coord') {
        onCommit(null);
        setText('');
      } else {
        onCommit(0);
        setText(variant === 'medida' ? '' : '0');
      }
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) {
      setText(displayDecimalText(value, variant));
      return;
    }
    const rounded = Math.round(n * 1000000) / 1000000;
    onCommit(rounded);
    setText(variant === 'medida' && rounded === 0 ? '' : String(rounded));
  }

  return (
    <View style={styles.block}>
      <Text style={small ? styles.lblSmall : styles.lbl}>{label}</Text>
      <TextInput
        style={styles.inp}
        value={text}
        onChangeText={setText}
        onEndEditing={flush}
        onBlur={flush}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numbers-and-punctuation'}
        placeholder={variant === 'coord' ? 'Ej: 4.6097' : 'Ej: 1,25'}
      />
      {hint ? <Text style={{ fontSize: 11, color: '#78909c', marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}
