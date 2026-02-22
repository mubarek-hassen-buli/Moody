import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import apiClient from '../../api/client';
import { useUserStore } from '../../store/useUserStore';

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CLIENT (mobile — auth only)
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type AuthMode = 'sign_in' | 'sign_up';

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setSession = useUserStore((s) => s.setSession);

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      let authResult;

      if (mode === 'sign_up') {
        authResult = await supabase.auth.signUp({ email, password });
      } else {
        authResult = await supabase.auth.signInWithPassword({ email, password });
      }

      if (authResult.error) {
        Alert.alert('Authentication Error', authResult.error.message);
        return;
      }

      const supabaseUser = authResult.data.user;
      const accessToken = authResult.data.session?.access_token;

      if (!supabaseUser || !accessToken) {
        Alert.alert('Error', 'Authentication failed. Please try again.');
        return;
      }

      // Sync user record to Neon DB
      const syncResponse = await apiClient.post('/api/auth/sync', undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { user: appUser } = syncResponse.data;

      // Store session globally
      setSession(
        {
          id: appUser.id,
          email: appUser.email,
          displayName: appUser.displayName,
          preferredLanguage: appUser.preferredLanguage ?? 'am',
          onboardingComplete: appUser.onboardingComplete ?? false,
        },
        accessToken
      );

      // Route based on onboarding status
      if (!appUser.onboardingComplete) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(app)');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ሙዲ</Text>
          <Text style={styles.tagline}>Your mental wellness companion</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {mode === 'sign_in' ? 'Welcome back' : 'Create account'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'sign_in' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle mode */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() =>
              setMode((prev) => (prev === 'sign_in' ? 'sign_up' : 'sign_in'))
            }
          >
            <Text style={styles.toggleText}>
              {mode === 'sign_in'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 48,
    color: '#818cf8',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f1f5f9',
  },
  button: {
    backgroundColor: '#818cf8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    paddingTop: 4,
  },
  toggleText: {
    color: '#818cf8',
    fontSize: 14,
  },
});
