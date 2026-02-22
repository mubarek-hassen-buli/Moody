import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUserStore } from '../../store/useUserStore';

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY SCREEN (Phase 1 placeholder)
// Full implementation (MoodChart + conversation summaries) is in Phase 3.
// ─────────────────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const language = useUserStore((s) => s.user?.preferredLanguage ?? 'am');

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📊</Text>
      <Text style={styles.title}>
        {language === 'am' ? 'የስሜት ታሪክ' : 'Seenaa Mood'}
      </Text>
      <Text style={styles.subtitle}>
        {language === 'am'
          ? 'ከሙዲ ጋር ሲጀምሩ የስሜት ቻርቱ ይታያል'
          : "Erga Moody waliin jalqabdaniin booda chaartiin ni mul'ata"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
