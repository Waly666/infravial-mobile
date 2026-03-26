import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getApiBaseUrl } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';

export function LoginScreen(): React.JSX.Element {
  const { login, busy } = useAuth();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const apiUrl = getApiBaseUrl();

  async function onSubmit(): Promise<void> {
    setError(null);
    if (!apiUrl) {
      setError('Configura EXPO_PUBLIC_API_BASE_URL antes de ingresar (ver .env.example).');
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
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>InfraVial</Text>
        <Text style={styles.subtitle}>Ingreso encuestador / admin</Text>

        {!apiUrl ? (
          <Text style={styles.warn}>
            Falta API en entorno. Añade EXPO_PUBLIC_API_BASE_URL en `.env` y reinicia Expo.
          </Text>
        ) : (
          <Text style={styles.hint} numberOfLines={2}>
            API: {apiUrl}
          </Text>
        )}

        <Text style={styles.label}>Usuario (cédula)</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={cedula}
          onChangeText={setCedula}
          placeholder="Ej. 1234567890"
          editable={!busy}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          editable={!busy}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={() => void onSubmit()}
          disabled={busy || !cedula.trim() || !password}
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
    backgroundColor: '#eef1f5',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a2332',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#5c6570',
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: '#7a8794',
  },
  warn: {
    marginTop: 12,
    fontSize: 13,
    color: '#a66a00',
    backgroundColor: '#fff7e6',
    padding: 10,
    borderRadius: 8,
  },
  label: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: '600',
    color: '#3d4a5c',
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d5dbe3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: '#1a2332',
  },
  error: {
    marginTop: 14,
    color: '#b3261e',
    fontSize: 14,
  },
  button: {
    marginTop: 22,
    backgroundColor: '#1e5a8a',
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
