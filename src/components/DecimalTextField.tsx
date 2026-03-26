import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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

function comparableDecimalValue(input: string, variant: 'medida' | 'coord' | 'pend'): string {
  const raw = input.trim().replace(',', '.');
  if (!raw) return variant === 'medida' ? '' : '0';
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  const rounded = Math.round(n * 1000000) / 1000000;
  if (variant === 'medida' && rounded === 0) return '';
  return String(rounded);
}

function preserveDecimalText(input: string): string {
  const raw = input.trim().replace(',', '.');
  if (raw.startsWith('-.')) return raw.replace('-.', '-0.');
  if (raw.startsWith('.')) return `0${raw}`;
  return raw;
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
  const keepVisualRef = useRef<string | null>(null);

  useEffect(() => {
    const next = displayDecimalText(value, variant);
    if (keepVisualRef.current && comparableDecimalValue(keepVisualRef.current, variant) === comparableDecimalValue(next, variant)) {
      setText(keepVisualRef.current);
      return;
    }
    setText(next);
  }, [value, variant]);

  function flush(): void {
    const raw = preserveDecimalText(text);
    if (raw === '' || raw === '.' || raw === '-') {
      if (variant === 'coord') {
        onCommit(null);
        keepVisualRef.current = '';
        setText('');
      } else {
        onCommit(0);
        keepVisualRef.current = variant === 'medida' ? '' : '0';
        setText(keepVisualRef.current);
      }
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) {
      keepVisualRef.current = null;
      setText(displayDecimalText(value, variant));
      return;
    }
    const rounded = Math.round(n * 1000000) / 1000000;
    onCommit(rounded);
    keepVisualRef.current = variant === 'medida' && rounded === 0 ? '' : raw;
    setText(keepVisualRef.current);
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
        keyboardType="decimal-pad"
        placeholder={variant === 'coord' ? 'Ej: 4.6097' : 'Ej: 1,25'}
      />
      {hint ? <Text style={{ fontSize: 11, color: '#78909c', marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}
