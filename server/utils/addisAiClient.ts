import axios, { AxiosInstance } from 'axios';
import type { LanguageCode } from '../safety/escalationFilter.js';
import type { ConversationMessage } from './promptBuilder.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
}

export interface ChatRequest {
  prompt: string;
  target_language: LanguageCode;
  conversation_history?: ConversationMessage[];
  generation_config?: GenerationConfig;
  attachment_field_names?: string[];
}

export interface ChatResponse {
  response_text: string;
  finish_reason: string;
  usage_metadata: {
    prompt_token_count: number;
    candidates_token_count: number;
    total_token_count: number;
  };
  modelVersion: string;
  transcription_clean?: string;
  transcription_raw?: string;
}

export interface TtsRequest {
  text: string;
  language: LanguageCode;
  stream?: boolean;
  voice_id?: string;
  output_format?: string;
  speed?: number;
  pitch?: number;
}

export interface TtsResponse {
  audio: string; // base64-encoded WAV/MP3
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDIS AI API CLIENT
// All calls to Addis AI are server-side only. The API key never reaches
// the client app. Retries with exponential backoff on 429 and 5xx errors.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;

class AddisAiClient {
  private readonly http: AxiosInstance;

  constructor() {
    if (!process.env.ADDIS_AI_API_KEY) {
      throw new Error('ADDIS_AI_API_KEY environment variable is required');
    }

    this.http = axios.create({
      baseURL:
        process.env.ADDIS_AI_BASE_URL ??
        'https://api.addisassistant.com/api/v1',
      headers: {
        'X-API-Key': process.env.ADDIS_AI_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30_000, // 30 second timeout
    });
  }

  /**
   * Sends a chat/generation request to Addis AI.
   * Retries automatically on 429 (rate limit) and 5xx (server) errors.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.withRetry(() =>
      this.http.post<ChatResponse>('/chat_generate', request)
    );
  }

  /**
   * Sends a multipart voice request to Addis AI.
   * The FormData is built by the calling route — passed through here with
   * the correct content-type header.
   */
  async voiceChat(formData: FormData): Promise<ChatResponse> {
    return this.withRetry(() =>
      this.http.post<ChatResponse>('/chat_generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  }

  /**
   * Converts text to speech using Addis AI TTS.
   */
  async tts(request: TtsRequest): Promise<TtsResponse> {
    return this.withRetry(() =>
      this.http.post<TtsResponse>('/audio', request)
    );
  }

  /**
   * Wraps an Axios call with exponential-backoff retry logic.
   * Respects `Retry-After` header on 429 responses.
   * Logs errors but never exposes the API key in logs.
   */
  private async withRetry<T>(
    fn: () => Promise<{ data: T }>,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await fn();
      return response.data;
    } catch (error: unknown) {
      if (!axios.isAxiosError(error)) throw error;

      const status = error.response?.status ?? 0;

      if (attempt >= MAX_RETRIES) {
        const code = (error.response?.data as { error?: { code?: string } })
          ?.error?.code;
        throw new Error(
          `Addis AI request failed after ${MAX_RETRIES} attempts. Status: ${status}, Code: ${code}`
        );
      }

      if (status === 429) {
        const retryAfter = parseInt(
          error.response?.headers?.['retry-after'] ?? '5',
          10
        );
        const jitter = Math.random() * 500; // Add up to 500ms jitter
        const delay = retryAfter * 1000 * Math.pow(2, attempt - 1) + jitter;
        await this.sleep(delay);
        return this.withRetry(fn, attempt + 1);
      }

      if (status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await this.sleep(delay);
        return this.withRetry(fn, attempt + 1);
      }

      // 4xx (except 429) — do not retry, surface the error
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const addisAiClient = new AddisAiClient();
