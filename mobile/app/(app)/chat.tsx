import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../../api/client';
import { useUserStore } from '../../store/useUserStore';
import { useSessionStore } from '../../store/useSessionStore';
import ChatBubble from '../../components/ChatBubble';
import EscalationCard from '../../components/EscalationCard';
import type { ChatMessage } from '../../store/useSessionStore';

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SCREEN
// Text-based AI conversation with ሚካ (Amharic) or Araara (Oromo).
// Escalation responses are displayed as EscalationCard and may lock input.
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const user = useUserStore((s) => s.user);
  const language = user?.preferredLanguage ?? 'am';

  const {
    sessionId,
    messages,
    isInputDisabled,
    initSession,
    addMessage,
    setLoading,
    disableInput,
    clearSession,
    isLoading,
    todayMood,
  } = useSessionStore();


  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  // Generate a stable session ID once (useRef so it never causes re-renders)
  const sessionIdRef = useRef<string>(sessionId ?? uuidv4());
  const activeSessionId = sessionIdRef.current;

  // Initialise the Zustand session on mount — must NOT be called during render
  useEffect(() => {
    if (!sessionId) {
      initSession(sessionIdRef.current, language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── TanStack Query mutation for /api/chat ──────────────────────────────────
  const chatMutation = useMutation({
    mutationFn: async ({
      message,
      sid,
    }: {
      message: string;
      sid: string;
    }) => {
      const response = await apiClient.post('/api/chat', {
        message,
        session_id: sid,
        language,
        // Pass today's mood so the AI can open with mood-aware empathy
        mood_score: todayMood ?? undefined,
      });
      return response.data as {
        response_text: string;
        escalation?: boolean;
        tier?: number;
        should_disable_input?: boolean;
        session_id: string;
        turn_count: number;
      };
    },
    onMutate: ({ message }) => {
      // Optimistically add user message immediately
      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setLoading(true);
      setInputText('');
    },
    onSuccess: (data) => {
      // Defensive extraction — guard against null/undefined response text
      const aiText: string =
        (data?.response_text as string | undefined)?.trim() ?? '';

      if (data?.escalation) {
        const escalationMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: data.response_text ?? '',
          isEscalation: true,
          escalationTier: data.tier,
          shouldDisableInput: data.should_disable_input,
          timestamp: Date.now(),
        };
        addMessage(escalationMsg);
        if (data.should_disable_input) {
          disableInput();
        }
      } else {
        const aiMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          // Always fall back to a placeholder if the server returned empty
          content: aiText || (language === 'am' ? '...' : '...'),
          timestamp: Date.now(),
        };
        addMessage(aiMsg);
      }
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },

    onError: (error: Error) => {
      setLoading(false);
      Alert.alert(
        language === 'am' ? 'ስህተት ተፈጥሯል' : 'Dogoggora',
        error.message
      );
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isInputDisabled) return;
    chatMutation.mutate({ message: trimmed, sid: activeSessionId });
  }, [inputText, isLoading, isInputDisabled, activeSessionId, chatMutation]);

  async function handleEndSession() {
    try {
      await apiClient.post('/api/chat/end', { session_id: activeSessionId });
    } catch {
      // Non-critical — still clear local state
    } finally {
      clearSession();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const companionName = language === 'am' ? 'ሚካ' : 'Araara';

  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.isEscalation) {
      return <EscalationCard message={item.content} tier={item.escalationTier ?? 1} />;
    }
    return <ChatBubble message={item} />;
  };

  const ListEmptyComponent = () => {
    // Opening message adapts to whether the user logged a mood today
    const openingText = todayMood != null
      ? language === 'am'
        ? 'ዛሬ ስሜትህ/ሽ ቀርቦ ነው። ይህን ዓውሬ ምን ማሳወቅ ትፈልጋለህ/ሽ?'
        : "Har'a akkam akka jirtu naa ibsite. Maal natti himuu barbaadda?"
      : language === 'am'
        ? 'ሰላም! ዛሬ ስሜትህ/ሽ እንዴት ነው?'
        : "Nagaa! Har'a akkam jirta?";

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🤍</Text>
        <Text style={styles.emptyTitle}>{companionName}</Text>
        <Text style={styles.emptySubtitle}>{openingText}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {isLoading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#818cf8" />
          <Text style={styles.typingText}>
            {companionName} {language === 'am' ? 'ጽፎ ነው...' : 'barreessaa jira...'}
          </Text>
        </View>
      )}

      {/* End session button */}
      {messages.length > 0 && !isLoading && (
        <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.endButtonText}>
            {language === 'am' ? 'ውይይቱን ጨርስ' : 'Haasaa xumuri'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Input area */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isInputDisabled && styles.inputDisabled]}
          placeholder={
            isInputDisabled
              ? language === 'am' ? 'እባካችሁ ቀደም ሲል ወዲያውኑ ት/ኑ' : 'Dursaan qunnamaa'
              : language === 'am' ? 'ይፃፉ...' : 'Barreessi...'
          }
          placeholderTextColor="#4b5563"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={1000}
          editable={!isInputDisabled && !isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading || isInputDisabled) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading || isInputDisabled}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#818cf8',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    color: '#64748b',
    fontSize: 13,
  },
  endButton: {
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  endButtonText: {
    color: '#64748b',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#f1f5f9',
    maxHeight: 120,
    lineHeight: 20,
  },
  inputDisabled: {
    opacity: 0.4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#818cf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 16,
  },
});
