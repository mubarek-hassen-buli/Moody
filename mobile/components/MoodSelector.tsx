import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// MOOD SELECTOR
// 5 emoji options corresponding to mood scores 1–5.
// Selected item has a highlighted background + scale transform handled by opacity.
// ─────────────────────────────────────────────────────────────────────────────

interface MoodOption {
  score: number;
  emoji: string;
  label_am: string;
  label_om: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { score: 1, emoji: '😞', label_am: 'ጥሩ አይደለም', label_om: 'Gaarii miti' },
  { score: 2, emoji: '😔', label_am: 'ደካማ', label_om: 'Dadhabaa' },
  { score: 3, emoji: '😐', label_am: 'ማካከለኛ', label_om: 'Gidduu' },
  { score: 4, emoji: '🙂', label_am: 'ጥሩ', label_om: 'Gaarii' },
  { score: 5, emoji: '😊', label_am: 'በጣም ጥሩ', label_om: 'Baay\'ee gaarii' },
];

interface MoodSelectorProps {
  selected: number | null;
  onSelect: (score: number) => void;
  language?: 'am' | 'om';
}

export default function MoodSelector({
  selected,
  onSelect,
  language = 'am',
}: MoodSelectorProps) {
  return (
    <View style={styles.container}>
      {MOOD_OPTIONS.map((option) => {
        const isSelected = selected === option.score;
        return (
          <TouchableOpacity
            key={option.score}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onSelect(option.score)}
            accessibilityLabel={
              language === 'am' ? option.label_am : option.label_om
            }
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.emoji, isSelected && styles.emojiSelected]}>
              {option.emoji}
            </Text>
            <Text
              style={[
                styles.label,
                isSelected ? styles.labelSelected : styles.labelDefault,
              ]}
              numberOfLines={2}
            >
              {language === 'am' ? option.label_am : option.label_om}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  optionSelected: {
    borderColor: '#818cf8',
    backgroundColor: '#1e1b4b',
  },
  emoji: {
    fontSize: 28,
    opacity: 0.6,
  },
  emojiSelected: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  labelDefault: {
    color: '#64748b',
  },
  labelSelected: {
    color: '#a5b4fc',
    fontWeight: '600',
  },
});
