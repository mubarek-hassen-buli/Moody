import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION CARD
// Displayed instead of a normal ChatBubble when the safety layer fires.
// Tier 1: red/urgent styling + phone number prominence
// Tier 2: amber/warning styling + phone number
// ─────────────────────────────────────────────────────────────────────────────

interface EscalationCardProps {
  message: string;
  tier: number;
}

const HOTLINE = '+251111550909'; // Call-ready format (no dashes)
const HOTLINE_DISPLAY = '+251-111-550-909';

export default function EscalationCard({ message, tier }: EscalationCardProps) {
  const isTier1 = tier === 1;

  function callHotline() {
    Linking.openURL(`tel:${HOTLINE}`).catch(() => {
      // Silently handle if device cannot make calls
    });
  }

  return (
    <View style={[styles.card, isTier1 ? styles.cardTier1 : styles.cardTier2]}>
      {/* Icon + header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{isTier1 ? '🆘' : '💙'}</Text>
        <Text style={[styles.title, isTier1 ? styles.titleTier1 : styles.titleTier2]}>
          {isTier1 ? 'Emergency Support' : 'We\'re Here for You'}
        </Text>
      </View>

      {/* Message text */}
      <Text style={styles.message}>{message}</Text>

      {/* Call button */}
      <TouchableOpacity
        style={[
          styles.callButton,
          isTier1 ? styles.callButtonTier1 : styles.callButtonTier2,
        ]}
        onPress={callHotline}
        accessibilityLabel={`Call hotline ${HOTLINE_DISPLAY}`}
        accessibilityRole="button"
      >
        <Text style={styles.callIcon}>📞</Text>
        <View style={styles.callTextGroup}>
          <Text style={styles.callLabel}>Crisis Helpline</Text>
          <Text style={styles.callNumber}>{HOTLINE_DISPLAY}</Text>
        </View>
        <Text style={styles.callArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginVertical: 8,
    gap: 14,
    borderWidth: 1,
  },
  cardTier1: {
    backgroundColor: '#1f0b0b',
    borderColor: '#7f1d1d',
  },
  cardTier2: {
    backgroundColor: '#1c1505',
    borderColor: '#78350f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  titleTier1: {
    color: '#fca5a5',
  },
  titleTier2: {
    color: '#fcd34d',
  },
  message: {
    fontSize: 14,
    color: '#e5e7eb',
    lineHeight: 22,
  },
  callButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callButtonTier1: {
    backgroundColor: '#dc2626',
  },
  callButtonTier2: {
    backgroundColor: '#d97706',
  },
  callIcon: {
    fontSize: 20,
  },
  callTextGroup: {
    flex: 1,
    gap: 2,
  },
  callLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  callNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  callArrow: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.7)',
  },
});
