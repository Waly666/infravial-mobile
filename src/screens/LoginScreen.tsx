import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApiBaseUrlConfig } from '@/config/ApiBaseUrlProvider';
import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/ThemeProvider';

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, busy } = useAuth();
  const { colors } = useAppTheme();
  const { apiBaseUrl, ready } = useApiBaseUrlConfig();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(): Promise<void> {
    setError(null);
    if (!apiBaseUrl) {
      setError('Configura la URL del backend antes de ingresar.');
      return;
    }
    try {
      await login({ user: cedula.trim(), password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de inicio de sesión');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text }]}>InfraVial</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Ingreso encuestador / admin</Text>

        {!ready || !apiBaseUrl ? (
          <Text style={[styles.warn, { color: colors.warning, backgroundColor: colors.surfaceAlt }]}>
            Configura primero la dirección del backend desde el botón "Configurar servidor".
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={2}>
            API: {apiBaseUrl}
          </Text>
        )}

        <Pressable
          style={[styles.configBtn, { borderColor: colors.primary, backgroundColor: colors.surfaceAlt }]}
          onPress={() => navigation.navigate('ApiConfig')}
        >
          <Text style={[styles.configBtnTxt, { color: colors.primary }]}>Configurar servidor</Text>
        </Pressable>

        <Text style={[styles.label, { color: colors.text }]}>Usuario (cédula)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          autoCapitalize="none"
          autoCorrect={false}
          value={cedula}
          onChangeText={setCedula}
          placeholder="Ej. 1234567890"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
        />

        <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
        />

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }, busy && styles.buttonDisabled]}
          onPress={() => void onSubmit()}
          disabled={busy || !ready || !apiBaseUrl || !cedula.trim() || !password}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  logo: {
    width: 104,
    height: 104,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    textAlign: 'center',
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
  },
  warn: {
    marginTop: 12,
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
  },
  configBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  configBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  error: {
    marginTop: 14,
    fontSize: 14,
  },
  button: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
