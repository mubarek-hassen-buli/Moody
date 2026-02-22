import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import { useUserStore } from '../../store/useUserStore';
import type { Language } from '../../store/useUserStore';

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE OPTION DATA
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
  description: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'am',
    label: 'Amharic',
    nativeName: 'አማርኛ',
    description: 'I speak Amharic',
  },
  {
    code: 'om',
    label: 'Afan Oromo',
    nativeName: 'Afaan Oromoo',
    description: 'I speak Afan Oromo',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('am');
  const [isLoading, setIsLoading] = useState(false);

  const { setLanguage, setOnboardingComplete } = useUserStore();

  async function handleContinue() {
    setIsLoading(true);
    try {
      await apiClient.patch('/api/user/language', { language: selectedLanguage });

      setLanguage(selectedLanguage);
      setOnboardingComplete();

      router.replace('/(app)');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🌍</Text>
          <Text style={styles.title}>Choose your language</Text>
          <Text style={styles.subtitle}>
            ሚካ / Araara will speak with you in{'\n'}your preferred language from now on.
          </Text>
        </View>

        {/* Language cards */}
        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.code}
              style={[
                styles.card,
                selectedLanguage === option.code && styles.cardSelected,
              ]}
              onPress={() => setSelectedLanguage(option.code)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.nativeName}>{option.nativeName}</Text>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.description}>{option.description}</Text>
              </View>
              {selectedLanguage === option.code && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderColor: '#818cf8',
    backgroundColor: '#1e1b4b',
  },
  cardContent: {
    gap: 4,
  },
  nativeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#818cf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#818cf8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
