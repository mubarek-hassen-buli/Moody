import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import { useUserStore } from '../../store/useUserStore';
import { useSessionStore } from '../../store/useSessionStore';
import MoodSelector from '../../components/MoodSelector';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MOOD_STORAGE_KEY = '@moody/daily_mood';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SCREEN — Daily mood check-in (once per day) + navigation to chat/voice
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const user = useUserStore((s) => s.user);
  const language = user?.preferredLanguage ?? 'am';

  const { todayMood, moodDate, setTodayMood } = useSessionStore();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gentleNudge, setGentleNudge] = useState(false);

  // ── Check AsyncStorage on mount for today's saved mood ───────────────────
  useEffect(() => {
    async function restoreTodayMood() {
      try {
        const stored = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
        if (stored) {
          const { score, date } = JSON.parse(stored) as {
            score: number;
            date: string;
          };
          if (date === getTodayDateString()) {
            // Already logged today — restore into store
            setTodayMood(score, date);
          } else {
            // New day — clear old entry
            await AsyncStorage.removeItem(MOOD_STORAGE_KEY);
          }
        }
      } catch {
        // Non-critical if storage read fails
      }
    }
    restoreTodayMood();
  }, []);

  // ── Already logged today — skip the check-in form ────────────────────────
  const alreadyLoggedToday =
    todayMood !== null && moodDate === getTodayDateString();

  // Greeting based on language
  const greeting =
    language === 'am'
      ? `ሰላም ${user?.displayName ?? ''}! እንዴት ነህ/ሽ ዛሬ?`
      : `Nagaa ${user?.displayName ?? ''}! Har'a akkam jirta?`;

  async function handleMoodSubmit() {
    if (selectedMood === null) {
      Alert.alert(
        language === 'am' ? 'ስሜት ይምረጡ' : 'Mood filadhu',
        language === 'am'
          ? 'እባክህ/ሽ ዛሬ ስሜትህን/ሽን ምረጥ/ጪ'
          : "Mee har'a akkam akka jirtu select godhi"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const today = getTodayDateString();

      const response = await apiClient.post('/api/mood', {
        mood_score: selectedMood,
        language,
      });

      // Persist to AsyncStorage so it survives app restarts within the same day
      await AsyncStorage.setItem(
        MOOD_STORAGE_KEY,
        JSON.stringify({ score: selectedMood, date: today })
      );

      // Update Zustand store
      setTodayMood(selectedMood, today);

      if (response.data.gentle_nudge) {
        setGentleNudge(true);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error saving mood';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting}</Text>
        {language === 'am' ? (
          <Text style={styles.subGreeting}>ሚካ ዛሬ ጎናህ/ሽ ለማዋሬ ዝናዋለች</Text>
        ) : (
          <Text style={styles.subGreeting}>
            Araara har'a si cinaa jiraachuuf qophii dha
          </Text>
        )}
      </View>

      {/* Gentle Nudge Banner */}
      {gentleNudge && (
        <View style={styles.nudgeBanner}>
          <Text style={styles.nudgeEmoji}>💙</Text>
          <Text style={styles.nudgeText}>
            {language === 'am'
              ? 'ለ3 ተከታታይ ቀናት ጥሩ ስሜት እያልተሰማህ/ሽ ነው። ከሚካ ጋር ላውራ?'
              : 'Guyyaa 3 walitti aansanii dhiphina keessa jirta. Wajjin haasofnu?'}
          </Text>
        </View>
      )}

      {/* Mood Check-in — only if not already done today */}
      {!alreadyLoggedToday ? (
        <View style={styles.moodCard}>
          <Text style={styles.cardTitle}>
            {language === 'am'
              ? '⚡ ዛሬ ስሜትህ/ሽ ምን ይመስላል?'
              : "⚡ Har'a akkam jirta?"}
          </Text>

          <MoodSelector selected={selectedMood} onSelect={setSelectedMood} />

          <TouchableOpacity
            style={[
              styles.submitButton,
              (selectedMood === null || isSubmitting) && styles.submitDisabled,
            ]}
            onPress={handleMoodSubmit}
            disabled={selectedMood === null || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {language === 'am' ? 'አስቀምጥ' : "Kaa'i"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Already logged — show confirmation card with today's mood */
        <View style={styles.loggedCard}>
          <Text style={styles.loggedEmoji}>
            {['😢', '😕', '😐', '🙂', '😊'][todayMood! - 1]}
          </Text>
          <Text style={styles.loggedText}>
            {language === 'am'
              ? 'ዛሬ ስሜትህ/ሽ ተቀምጧል'
              : "Har'a mood kee kaawwame"}
          </Text>
          <Text style={styles.loggedSub}>
            {language === 'am'
              ? 'ነዋ! ሚካ ዝናዋለች'
              : 'Gaarii! Araara qophii dha'}
          </Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>
          {language === 'am'
            ? 'ምን ማድረግ ትፈልጋለህ/ሽ?'
            : 'Maal gochuu barbaadda?'}
        </Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(app)/chat')}
        >
          <Text style={styles.actionEmoji}>💬</Text>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionTitle}>
              {language === 'am' ? 'ሚካ ጋር አውራ' : 'Araara wajjin haasofii'}
            </Text>
            <Text style={styles.actionSubtitle}>
              {language === 'am'
                ? 'የጽሁፍ ውይይት ጀምር'
                : 'Barreessaan haasofuu jalqabi'}
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  greetingSection: {
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: 32,
  },
  subGreeting: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  nudgeBanner: {
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa',
  },
  nudgeEmoji: {
    fontSize: 22,
  },
  nudgeText: {
    flex: 1,
    color: '#bfdbfe',
    fontSize: 14,
    lineHeight: 20,
  },
  moodCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    gap: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  submitButton: {
    backgroundColor: '#818cf8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loggedCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  loggedEmoji: {
    fontSize: 44,
  },
  loggedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  loggedSub: {
    fontSize: 13,
    color: '#475569',
  },
  actionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionTextGroup: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  actionArrow: {
    fontSize: 22,
    color: '#475569',
  },
});
