import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApiBaseUrlConfig } from '@/config/ApiBaseUrlProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

const EXAMPLES = [
  'http://72.60.175.120:5001',
  'http://192.168.1.50:5001',
  'http://10.0.2.2:5001',
  'http://localhost:5001',
] as const;

export function ApiConfigScreen(): React.JSX.Element {
  const { colors } = useAppTheme();
  const { apiBaseUrl, defaultApiBaseUrl, hasCustomApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } =
    useApiBaseUrlConfig();
  const [draft, setDraft] = useState(apiBaseUrl);

  useEffect(() => {
    setDraft(apiBaseUrl);
  }, [apiBaseUrl]);

  async function save(): Promise<void> {
    const normalized = draft.trim().replace(/\/+$/, '');
    if (!normalized) {
      Alert.alert('Servidor', 'Ingresa una URL base, por ejemplo: http://72.60.175.120:5001');
      return;
    }
    if (!/^https?:\/\/.+/i.test(normalized)) {
      Alert.alert('Servidor', 'La URL debe iniciar con http:// o https://');
      return;
    }
    await setApiBaseUrl(normalized);
    Alert.alert('Listo', 'Servidor guardado en este dispositivo.');
  }

  async function restoreDefault(): Promise<void> {
    await resetApiBaseUrl();
    Alert.alert('Listo', defaultApiBaseUrl ? 'Se restauró la URL por defecto.' : 'Se limpió la URL personalizada.');
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Configuración de backend</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Aquí puedes cambiar el servidor sin editar `.env` ni recompilar la app.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>URL base actual</Text>
        <Text style={[styles.current, { color: colors.primary }]}>{apiBaseUrl || 'Sin configurar'}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {hasCustomApiBaseUrl ? 'Usando valor guardado en el teléfono.' : 'Usando valor por defecto del proyecto.'}
        </Text>
        {defaultApiBaseUrl ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>Predeterminada: {defaultApiBaseUrl}</Text>
        ) : null}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Nueva URL base</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="http://72.60.175.120:5001"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.help, { color: colors.textMuted }]}>
        Escribe solo la base, sin slash final. Ejemplos:
      </Text>
      <View style={styles.chips}>
        {EXAMPLES.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => setDraft(item)}
          >
            <Text style={{ color: colors.text }}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.warnBox, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
        <Text style={[styles.warnText, { color: colors.text }]}>
          En celular físico normalmente no sirve `localhost` ni `127.0.0.1`; usa la IP o dominio del backend.
        </Text>
      </View>

      <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => void save()}>
        <Text style={styles.primaryTxt}>Guardar servidor</Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => void restoreDefault()}
      >
        <Text style={[styles.secondaryTxt, { color: colors.text }]}>Restaurar predeterminado</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  card: { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 14 },
  label: { marginTop: 16, marginBottom: 8, fontSize: 14, fontWeight: '700' },
  current: { fontSize: 15, fontWeight: '700' },
  meta: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  help: { marginTop: 10, fontSize: 13 },
  chips: { marginTop: 10, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  warnBox: { marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 12 },
  warnText: { fontSize: 13, lineHeight: 18 },
  primaryBtn: { marginTop: 18, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { marginTop: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryTxt: { fontSize: 15, fontWeight: '700' },
});
