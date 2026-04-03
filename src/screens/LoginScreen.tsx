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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_COPYRIGHT_FOOTER } from '@/constants/branding';
import { useApiBaseUrlConfig } from '@/config/ApiBaseUrlProvider';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radii, shadowCard, space } from '@/theme/designTokens';

export function LoginScreen(): React.JSX.Element {
  const { login, busy } = useAuth();
  const { colors, theme } = useAppTheme();
  const { apiBaseUrl, ready } = useApiBaseUrlConfig();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const cardShadow = shadowCard(theme);

  async function onSubmit(): Promise<void> {
    setError(null);
    if (!apiBaseUrl?.trim()) {
      setError('No hay URL de servidor disponible.');
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.gradientHeroStart, colors.background, colors.gradientHeroEnd]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientFill}
      >
        <View style={styles.loginColumn}>
          <View style={styles.centerWrap}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
            <LinearGradient
              colors={[colors.gradientCtaStart, colors.gradientCtaEnd]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.cardTopAccent}
            />
            <View style={styles.cardInner}>
              <View style={[styles.logoRing, { borderColor: colors.primarySoft }]}>
                <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>InfraVial</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Inventario vial en campo</Text>

              {!ready ? (
                <View style={[styles.warnBox, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
                  <ActivityIndicator size="small" color={colors.warning} />
                  <Text style={[styles.warnTxt, { color: colors.text }]}>Preparando conexión…</Text>
                </View>
              ) : (
                <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={2}>
                  Servidor: {apiBaseUrl}
                </Text>
              )}

              <Text style={[styles.label, { color: colors.textMuted }]}>Usuario (cédula)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                value={cedula}
                onChangeText={setCedula}
                placeholder="Ej. 1234567890"
                placeholderTextColor={colors.textMuted}
                editable={!busy}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Contraseña</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                  },
                ]}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                editable={!busy}
              />

              {error ? (
                <View style={[styles.errRow, { backgroundColor: colors.dangerSoft }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
                  <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void onSubmit()}
                disabled={busy || !ready || !apiBaseUrl?.trim() || !cedula.trim() || !password}
                style={({ pressed }) => [
                  styles.btnOuter,
                  (busy || !ready || !apiBaseUrl?.trim() || !cedula.trim() || !password) && styles.btnDisabled,
                  pressed && !(busy || !cedula.trim() || !password) && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <LinearGradient
                  colors={[colors.gradientCtaStart, colors.gradientCtaEnd]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.btnGrad}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Entrar</Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
          </View>
          <Text
            style={[
              styles.footerCopy,
              {
                color: 'rgba(255,255,255,0.88)',
                paddingBottom: Math.max(insets.bottom, 12) + 8,
              },
            ]}
          >
            {APP_COPYRIGHT_FOOTER}
          </Text>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradientFill: {
    flex: 1,
  },
  loginColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  footerCopy: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingHorizontal: space.lg,
    lineHeight: 16,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTopAccent: {
    height: 5,
    width: '100%',
  },
  cardInner: {
    padding: space.xl,
  },
  logoRing: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  logo: {
    width: 88,
    height: 88,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  hint: {
    marginTop: space.md,
    fontSize: 11,
    textAlign: 'center',
  },
  warnBox: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  warnTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  label: {
    marginTop: space.lg,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    fontWeight: '500',
  },
  errRow: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: space.sm,
    borderRadius: radii.sm,
  },
  error: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  btnOuter: {
    marginTop: space.xl,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
