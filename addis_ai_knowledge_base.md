# 📚 Addis AI (IDIS AI) — Complete Platform Knowledge Base

> **Platform:** [platform.addisassistant.com](https://platform.addisassistant.com)  
> **API Base URL:** `https://api.addisassistant.com/api/v1`  
> **Contact:** info@addisassistant.com | +251 703 753 500 | Addis Ababa, Ethiopia  
> **Program:** NVIDIA Inception Program Member  

---

## 🌍 What Is Addis AI?

Addis AI is an **Ethiopian-built AI platform** providing **purpose-built language models specifically for Amharic and Afan Oromo** — not translation wrappers, but native language processing. It targets developers and enterprises in Ethiopia and the broader African market.

### Core Use Cases
- **Customer Service** — AI chatbots & voice assistants in Amharic/Oromo (reduce wait times by 70%)
- **Content Creation** — Generate articles, social media posts, marketing copy (5x faster)
- **Education** — Interactive learning, automated tutoring, native-language support
- **Agriculture & Public Services** — Voice-accessible weather forecasts, crop disease identification, market prices

---

## 🔐 Authentication

All endpoints require the `X-API-Key` header:

```http
X-API-Key: YOUR_API_KEY
```

- **Free credits:** 500 birr (ETB) to start — no commitment required
- **Pricing model:** Credit-based in Ethiopian Birr (ETB), billed per usage/tokens
- **Model name:** `Addis-፩-አሌፍ`
- **Supported languages:** `"am"` (Amharic), `"om"` (Afan Oromo)

---

## 🔌 API Endpoints

### 1. `POST /api/v1/chat_generate` — Chat / Text Generation

The primary endpoint. Supports text-only, audio-only, image+text (multimodal), and combined inputs.

#### Request (JSON — text-only)

```json
{
  "prompt": "የ ኢትዮጵያ ዋና ከተማ ምንድነው?",
  "target_language": "am",
  "conversation_history": [
    { "role": "user", "content": "ሰላም" },
    { "role": "assistant", "content": "ሰላም! እንዴት ልረዳህ?" }
  ],
  "generation_config": {
    "temperature": 0.7,
    "maxOutputTokens": 1200,
    "stream": false
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | ✅ Yes | The text prompt or question |
| `target_language` | string | ✅ Yes | `"am"` = Amharic, `"om"` = Afan Oromo |
| `conversation_history` | array | No | Array of previous messages for context |
| `generation_config` | object | No | Configuration for text generation |
| `attachment_field_names` | array | No | Field names in multipart requests |

#### generation_config Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `temperature` | number | `0.7` | Randomness/creativity (0.0–1.0) |
| `stream` | boolean | `false` | Stream response incrementally (BETA) |
| `maxOutputTokens` | number | model default | Max tokens to generate |

#### Response

```json
{
  "response_text": "አዲስ አበባ የኢትዮጵያ ዋና ከተማ ናት።",
  "finish_reason": "stop",
  "usage_metadata": {
    "prompt_token_count": 12,
    "candidates_token_count": 8,
    "total_token_count": 20
  },
  "modelVersion": "Addis-፩-አሌፍ",
  "uploaded_attachments": [],
  "transcription_raw": "<analysis>gender: male, emotion: happy</analysis> ሰላም",
  "transcription_clean": "ሰላም"
}
```

| Response Field | Type | Description |
|---|---|---|
| `response_text` | string | The generated text response |
| `finish_reason` | string | Why response ended: `"stop"`, `"length"`, etc. |
| `usage_metadata` | object | Token usage (prompt + completion + total) |
| `modelVersion` | string | Model version used |
| `uploaded_attachments` | array | Info about uploaded files (URIs, MIME types) |
| `transcription_raw` | string | Raw audio transcription with analysis metadata |
| `transcription_clean` | string | Clean transcription without analysis tags |

---

### 2. `POST /api/v1/audio` — Text-to-Speech (TTS)

Converts text into natural-sounding speech. Returns base64-encoded WAV audio.

#### Request

```json
{
  "text": "ሰላም ፣ እንደምን ነህ?",
  "language": "am",
  "stream": false
}
```

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `text` | string | ✅ Yes | Text to convert to speech |
| `language` | string | ✅ Yes | `"am"` or `"om"` |
| `stream` | boolean | No | Stream audio in chunks (default: `false`) |

#### Non-Streaming Response

```json
{ "audio": "base64-encoded-WAV-data" }
```

#### Streaming Response (when `stream: true`)

```json
{"audio_chunk": "base64-encoded-chunk", "index": 0}
{"audio_chunk": "base64-encoded-chunk", "index": 1}
```

#### Advanced TTS Options (from schema)

```json
{
  "text": "...",
  "language": "am",
  "voice_id": "female-1",
  "output_format": "mp3",
  "speed": 1.0,
  "pitch": 0.0
}
```

| Parameter | Type | Default | Range |
|---|---|---|---|
| `voice_id` | string | — | `"female-1"`, `"male-1"` |
| `output_format` | string | `"mp3"` | `"mp3"`, `"wav"`, `"ogg"` |
| `speed` | number | `1.0` | 0.5–1.5 |
| `pitch` | number | `0.0` | -1.0 to 1.0 |

---

## 📥 Input Types for `/chat_generate`

### 1. Text-only
Standard JSON with `prompt` field. Set `Content-Type: application/json`.

### 2. Audio-only
Submit via `multipart/form-data` with field name `chat_audio_input`. API transcribes and uses it as the prompt.

**Supported audio formats:**
- WAV: `audio/wav`, `audio/x-wav`, `audio/wave`
- MP3: `audio/mpeg`, `audio/mp3`, `audio/x-mp3`
- M4A/MP4: `audio/mp4`, `audio/x-m4a`
- WebM/Ogg/FLAC: `audio/webm`, `audio/ogg`, `audio/flac`

### 3. Combined Text + Audio
Include both `chat_audio_input` and `prompt` in the `request_data` JSON.

### 4. Image + Text (Multimodal)
Use `multipart/form-data`. **ALL JSON must go inside a `request_data` field.**

```bash
curl -X POST https://api.addisassistant.com/api/v1/chat_generate \
  -H "X-API-Key: YOUR_KEY" \
  -F "image1=@/path/to/image.jpg" \
  -F 'request_data={"prompt":"Describe this image","target_language":"am","attachment_field_names":["image1"]};type=application/json'
```

> ⚠️ **Critical Rule:** For JSON requests → parameters go directly in body. For multipart → ALL parameters must be wrapped inside `request_data`.

---

## 📐 Full Schema Reference

### Message Object
```json
{
  "role": "user | assistant | system",
  "content": "Message text",
  "name": "optional author identifier"
}
```

### Usage Information Object
```json
{
  "prompt_token_count": 12,
  "candidates_token_count": 8,
  "total_token_count": 20
}
```

### Rate Limit Response Headers
```
x-ratelimit-limit: 60          // Requests allowed per time window
x-ratelimit-remaining: 59      // Requests remaining in current window
x-ratelimit-reset: 1677803439  // Unix timestamp when limit resets
```

### Speech-to-Text Response Schema
```json
{
  "id": "unique-transcription-id",
  "text": "transcribed text",
  "language": "am",
  "duration": 12.5,
  "timestamps": [
    { "text": "word", "start": 0.0, "end": 0.5 }
  ],
  "segments": [
    { "id": 0, "text": "segment", "start": 0.0, "end": 2.0, "confidence": 0.98 }
  ]
}
```

---

## ❌ Error Codes Reference

### Error Response Format
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "A user-friendly error message",
    "target": "optional field indicating target (e.g., language)"
  }
}
```

### Authentication Errors

| Code | HTTP | Description | Fix |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid API key | Check `X-API-Key` header |
| `FORBIDDEN` | 403 | Key valid but lacks permission | Verify key permissions |

### Input Validation Errors

| Code | HTTP | Description | Fix |
|---|---|---|---|
| `INVALID_INPUT` | 400 | Missing/invalid parameters | Check all required fields |
| `INVALID_JSON` | 400 | Malformed JSON body | Fix JSON formatting |
| `UNSUPPORTED_LANGUAGE` | 400 | Wrong language code | Use only `"am"` or `"om"` |

### File & Attachment Errors

| Code | HTTP | Description | Fix |
|---|---|---|---|
| `ATTACHMENT_FAILED` | 400 | Upload failed | Check format, size, `attachment_field_names` |
| `TRANSCRIPTION_FAILED` | 400 | Audio couldn't be processed | Check audio quality/format |

### TTS & Server Errors

| Code | HTTP | Description | Fix |
|---|---|---|---|
| `TTS_FAILED` | 500 | TTS conversion failed | Check text length and language |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method | Use POST for all endpoints |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Retry with backoff |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down | Retry with exponential backoff |

### HTTP Status Codes Summary

| Status | Category | Meaning |
|---|---|---|
| 200 | Success | Request successful |
| 400 | Client Error | Bad request (missing/invalid params) |
| 401 | Client Error | Unauthorized (bad/missing API key) |
| 403 | Client Error | Forbidden (insufficient permissions) |
| 404 | Client Error | Resource not found |
| 405 | Client Error | Method not allowed |
| 429 | Client Error | Too many requests (rate limit exceeded) |
| 500 | Server Error | Internal server error |
| 503 | Server Error | Service unavailable |

> ⚠️ **429 Rate Limit:** Response includes a `Retry-After` header with seconds to wait before retrying.

---

## 🏗️ Integration Architecture

### The Golden Rule: Server-Side Proxy

**Never call the Addis AI API directly from the browser/client.**

```
Client App  →  Your Server (holds API key securely)  →  Addis AI API
```

**Why server-side?**
- API key never exposed to users
- Prevents CORS issues
- Add caching, rate limiting, business logic
- Cost control and usage tracking
- Input validation and sanitization

---

## 💻 Code Examples

### JavaScript (Vanilla)

```javascript
class AddisAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.addisassistant.com/api/v1";
    this.conversationHistory = [];
  }

  async sendMessage(message, targetLanguage = "am") {
    const response = await fetch(`${this.baseUrl}/chat_generate`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: message,
        target_language: targetLanguage,
        conversation_history: this.conversationHistory,
        generation_config: { temperature: 0.7 },
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    this.conversationHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: data.response_text }
    );
    return data;
  }

  async textToSpeech(text, language = "am") {
    const response = await fetch(`${this.baseUrl}/audio`, {
      method: "POST",
      headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    const data = await response.json();
    return data.audio; // Base64-encoded WAV
  }

  clearConversation() {
    this.conversationHistory = [];
  }
}
```

### Python (Basic)

```python
import requests

def chat_generate(prompt, target_language="am", conversation_history=None):
    url = "https://api.addisassistant.com/api/v1/chat_generate"
    headers = {
        "X-API-Key": "YOUR_API_KEY",
        "Content-Type": "application/json"
    }
    data = {
        "prompt": prompt,
        "target_language": target_language,
        "conversation_history": conversation_history or [],
        "generation_config": {"temperature": 0.7}
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

# Usage
result = chat_generate("What is the capital of Ethiopia?", "am")
print(result["response_text"])
```

### Python (With Retry & Exponential Backoff)

```python
import requests, time, random, logging

def call_api_with_backoff(prompt, target_language, max_retries=5):
    api_key = "YOUR_API_KEY"
    url = "https://api.addisassistant.com/api/v1/chat_generate"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    data = {"prompt": prompt, "target_language": target_language}
    
    retry_count = 0
    while retry_count < max_retries:
        try:
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "1"))
                jitter = random.uniform(0, 0.1) * retry_after
                backoff = retry_after * (2 ** retry_count) + jitter
                print(f"Rate limited. Retrying in {backoff:.2f}s")
                time.sleep(backoff)
                retry_count += 1
                continue
            
            if response.status_code >= 500:
                backoff = 2 ** retry_count
                time.sleep(backoff)
                retry_count += 1
                continue
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            retry_count += 1
            time.sleep(2 ** retry_count)
    
    return None
```

### Node.js Express Proxy (Recommended Architecture)

```javascript
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const ADDIS_AI_API_KEY = process.env.ADDIS_AI_API_KEY;
const ADDIS_AI_BASE_URL = "https://api.addisassistant.com/api/v1";

// Simple in-memory cache (use Redis in production)
const cache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 hour

// Per-IP rate limiter
const requestCounts = {};
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 60 * 1000;

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  if (!requestCounts[ip] || requestCounts[ip].resetTime < now) {
    requestCounts[ip] = { count: 1, resetTime: now + RATE_WINDOW };
  } else if (requestCounts[ip].count >= RATE_LIMIT) {
    return res.status(429).json({ error: "Rate limit exceeded." });
  } else {
    requestCounts[ip].count++;
  }
  next();
}

// Chat endpoint
app.post("/api/chat", rateLimiter, async (req, res) => {
  const { prompt, target_language, conversation_history, generation_config } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await axios.post(
      `${ADDIS_AI_BASE_URL}/chat_generate`,
      { prompt, target_language: target_language || "am", conversation_history: conversation_history || [], generation_config: generation_config || { temperature: 0.7 } },
      { headers: { "Content-Type": "application/json", "X-API-Key": ADDIS_AI_API_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data || "Internal server error" });
  }
});

// TTS endpoint with caching
app.post("/api/tts", rateLimiter, async (req, res) => {
  const { text, language } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  const cacheKey = `tts:${language}:${text}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (cached.expiry > Date.now()) return res.json(cached.data);
    cache.delete(cacheKey);
  }

  try {
    const response = await axios.post(
      `${ADDIS_AI_BASE_URL}/audio`,
      { text, language: language || "am" },
      { headers: { "Content-Type": "application/json", "X-API-Key": ADDIS_AI_API_KEY } }
    );
    cache.set(cacheKey, { data: response.data, expiry: Date.now() + CACHE_TTL });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: "TTS failed" });
  }
});

app.listen(3000, () => console.log("Proxy running on port 3000"));
```

### Python FastAPI Proxy

```python
import os, requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ADDIS_AI_API_KEY = os.getenv("ADDIS_AI_API_KEY")
ADDIS_AI_BASE_URL = "https://api.addisassistant.com/api/v1"

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    prompt: str
    target_language: str = "am"
    conversation_history: Optional[List[Message]] = None
    generation_config: Optional[dict] = None

@app.post("/api/chat")
async def chat(request: ChatRequest):
    response = requests.post(
        f"{ADDIS_AI_BASE_URL}/chat_generate",
        json=request.dict(),
        headers={"X-API-Key": ADDIS_AI_API_KEY, "Content-Type": "application/json"}
    )
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    return response.json()
```

### React Component

```jsx
import React, { useState, useRef } from "react";

const AddisAIChat = ({ apiKey }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("https://api.addisassistant.com/api/v1/chat_generate", {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          target_language: "am",
          conversation_history: history,
          generation_config: { temperature: 0.7 }
        }),
      });
      const data = await response.json();
      const assistantMsg = { role: "assistant", content: data.response_text };
      setMessages(prev => [...prev, assistantMsg]);
      setHistory(prev => [...prev, userMsg, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "system", content: "Error: " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {messages.map((m, i) => <div key={i} className={m.role}>{m.content}</div>)}
      {isLoading && <div>Thinking...</div>}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === "Enter" && sendMessage()} />
      <button onClick={sendMessage} disabled={isLoading}>Send</button>
    </div>
  );
};

export default AddisAIChat;
```

---

## 🛡️ Error Handling Best Practices

### Check for Error Status First

```javascript
const data = await response.json();
if (data.status === "error") {
  switch (data.error.code) {
    case "INVALID_INPUT":       // Handle missing fields
    case "UNSUPPORTED_LANGUAGE": // Handle wrong language code
    case "UNAUTHORIZED":        // Handle bad API key
    case "TTS_FAILED":          // Handle TTS issues
    case "INTERNAL_ERROR":
    case "SERVICE_UNAVAILABLE": // Retry with backoff
    default:                    // Show error to user
  }
}
```

### Exponential Backoff (JavaScript)

```javascript
async function retryWithBackoff(requestFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Handle 429 Rate Limit

```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After") || 60;
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  return callAddisAI(params); // retry
}
```

### Streaming Error Handling

```javascript
const eventSource = new EventSource(`${apiUrl}?x_api_key=${apiKey}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.error) { eventSource.close(); handleError(data.error); return; }
  processChunk(data);
};
eventSource.onerror = () => { eventSource.close(); handleReconnect(); };
```

---

## 💰 Cost Optimization — Best Practices to Minimize API Consumption

### 1. 🗄️ Cache Everything Possible
TTS is especially cache-friendly: same text + language = identical audio output.
```javascript
const cacheKey = `tts:${language}:${text}`;
// Set TTL to 1 hour or longer for static content
```

### 2. ⏱️ Debounce User Input
Never fire on every keystroke. Wait 300–500ms after the user stops typing.

### 3. 📜 Trim Conversation History
Every old message in `conversation_history` adds to `prompt_token_count`. Options:
- Cap history at last N turns (e.g., last 10 messages)
- Summarize older turns into a single system message
- Use session timeouts to reset inactive conversations

### 4. 🎯 Control `maxOutputTokens`
Set it to what you actually need. Avoid unlimited generation.
```json
"generation_config": { "temperature": 0.7, "maxOutputTokens": 500 }
```

### 5. 🚦 Implement Your Own Rate Limiter
Add per-user/per-IP limits on your proxy *before* touching the Addis AI API.
- 100 requests/hour per IP is a reasonable starting default
- Prevents runaway costs from bugs or abuse

### 6. 🔁 Retry Smartly — Don't Spam
On 429 or 5xx errors, use **exponential backoff with jitter**:
```
Wait = base_delay × 2^attempt + random_jitter
```

### 7. 🌊 Use Streaming Only When Needed
Streaming is a BETA feature for chat. Only use it when showing live text to users. For background/batch jobs, use non-streaming.

### 8. 📊 Monitor `usage_metadata`
Log `total_token_count` per request. Set alerts for unusual spikes. Identify expensive queries and optimize them.

### 9. 🔗 Connection Pooling (High Volume)
Reuse HTTP connections instead of opening new ones per request:
```javascript
const { HttpsAgent } = require("agentkeepalive");
const keepaliveAgent = new HttpsAgent({ maxSockets: 100, timeout: 60000 });
```

### 10. 🧹 Compress Files Before Sending
For multimodal requests, compress images and audio before sending to reduce upload time and processing cost.

---

## 🔒 Security Checklist

- [ ] **Never expose API key in frontend/client code**
- [ ] Store API key in environment variables (`.env` file, never in git)
- [ ] Rotate API keys regularly
- [ ] Validate and sanitize all user inputs before forwarding to Addis AI
- [ ] Implement user authentication on your proxy server
- [ ] Add per-user rate limiting
- [ ] Log all errors (but sanitize sensitive data — strip `X-API-Key` from logs)
- [ ] Use HTTPS for all communications
- [ ] Implement security headers on your proxy API
- [ ] Set up CORS correctly (restrict to your own domains in production)

---

## 🚀 Deployment Considerations

### Environment Setup
```env
ADDIS_AI_API_KEY=your_api_key_here
PORT=3000
```

### Docker (Node.js Proxy)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "app.js"]
```

### Scalability Strategies
- **Horizontal scaling** — Deploy multiple proxy instances
- **Load balancing** — Distribute requests across instances
- **Async task queues** — For non-real-time / batch requests (e.g., BullMQ, Celery)
- **Redis caching** — Shared cache across all proxy instances
- **Monitoring** — Track API call volumes, response times, error rates, usage patterns

---

## 📋 Quick Reference Card

| Task | Endpoint | Method | Content-Type |
|---|---|---|---|
| Chat / Text Generation | `/api/v1/chat_generate` | POST | `application/json` |
| Chat + Image/Audio | `/api/v1/chat_generate` | POST | `multipart/form-data` |
| Text-to-Speech | `/api/v1/audio` | POST | `application/json` |

| Language | Code |
|---|---|
| Amharic | `"am"` |
| Afan Oromo | `"om"` |

| Error Code | Retry? |
|---|---|
| `UNAUTHORIZED` | ❌ Fix API key |
| `INVALID_INPUT` | ❌ Fix request |
| `UNSUPPORTED_LANGUAGE` | ❌ Use `am` or `om` |
| `TTS_FAILED` | ⚠️ Maybe |
| `INTERNAL_ERROR` | ✅ Yes, with backoff |
| `SERVICE_UNAVAILABLE` | ✅ Yes, with backoff |
| `429 Rate Limit` | ✅ Yes, after `Retry-After` |

---

*Document generated from official Addis AI documentation at platform.addisassistant.com*
