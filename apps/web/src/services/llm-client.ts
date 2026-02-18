/**
 * Browser-side Claude LLM client.
 *
 * Implements the LlmClient interface using direct fetch to the Anthropic API
 * with the `anthropic-dangerous-direct-browser-access` header.
 * The API key is retrieved from IndexedDB (never stored in localStorage or URLs).
 */
import type { LlmClient } from '@finplanner/claude';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 4096;

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 90_000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);
const MIN_REQUEST_INTERVAL_MS = 5_000;
const MAX_REQUESTS_PER_HOUR = 50;

let lastRequestTime = 0;
let requestCountThisHour = 0;
let hourWindowStart = Date.now();

function redactApiKeys(text: string): string {
  return text
    .replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[API_KEY_REDACTED]')
    .replace(/\b(Bearer\s+)[a-zA-Z0-9._~+\/-]{20,}/gi, '$1[TOKEN_REDACTED]');
}

interface RetryInfo {
  retryAfterMs: number | null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function getRetryDelay(attempt: number, retryInfo: RetryInfo): number {
  const jitter = Math.random() * 500;
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attempt) + jitter;
  if (retryInfo.retryAfterMs !== null && retryInfo.retryAfterMs > 0) {
    return Math.max(retryInfo.retryAfterMs, exponentialDelay);
  }
  return exponentialDelay;
}

function parseRetryAfterHeader(header: string | null): number | null {
  if (!header) return null;

  // Try parsing as seconds (integer)
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  // Try parsing as HTTP-date
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delayMs = date - Date.now();
    return delayMs > 0 ? delayMs : null;
  }

  return null;
}

/**
 * Create an LLM client for the Anthropic API.
 *
 * @param apiKey - The Anthropic API key
 * @param modelId - Optional model ID override
 * @param externalSignal - Optional AbortSignal for caller-initiated cancellation
 */
export function createLlmClient(apiKey: string, modelId?: string, externalSignal?: AbortSignal): LlmClient {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key is required');
  }
  if (!apiKey.startsWith('sk-ant-') || apiKey.length < 30) {
    throw new Error('Invalid API key format. Key must start with "sk-ant-" and be at least 30 characters.');
  }
  return {
    async sendMessage(systemPrompt: string, userMessage: string): Promise<string> {
      // Client-side rate limiting
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await sleep(MIN_REQUEST_INTERVAL_MS - elapsed, externalSignal);
      }
      lastRequestTime = Date.now();

      // Per-hour request budget
      if (Date.now() - hourWindowStart > 3_600_000) {
        // Reset the window
        hourWindowStart = Date.now();
        requestCountThisHour = 0;
      }
      requestCountThisHour++;
      if (requestCountThisHour > MAX_REQUESTS_PER_HOUR) {
        throw new Error(`Hourly API request limit (${MAX_REQUESTS_PER_HOUR}) exceeded. Please wait before making more requests.`);
      }

      const requestBody = JSON.stringify({
        model: modelId || DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      let lastError: Error | undefined;
      let lastRetryInfo: RetryInfo = { retryAfterMs: null };

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Check for external cancellation before each attempt
        if (externalSignal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        if (attempt > 0) {
          const delay = getRetryDelay(attempt - 1, lastRetryInfo);
          await sleep(delay, externalSignal);
        }

        // Create an internal AbortController for timeouts, chained to the external signal
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        // If the external signal aborts, also abort this request
        const onExternalAbort = () => controller.abort();
        externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

        let response: Response;
        try {
          response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': ANTHROPIC_VERSION,
              'anthropic-dangerous-direct-browser-access': 'true',
              'content-type': 'application/json',
            },
            body: requestBody,
            signal: controller.signal,
          });
        } catch (err) {
          clearTimeout(timeout);
          externalSignal?.removeEventListener('abort', onExternalAbort);

          // If the external signal caused the abort, propagate as AbortError
          if (externalSignal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          if (err instanceof DOMException && err.name === 'AbortError') {
            if (attempt < MAX_RETRIES) {
              lastError = new Error(`Anthropic API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
              lastRetryInfo = { retryAfterMs: null };
              continue;
            }
            throw new Error(`Anthropic API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
          }
          throw err;
        } finally {
          clearTimeout(timeout);
          externalSignal?.removeEventListener('abort', onExternalAbort);
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');

          const sanitizedBody = redactApiKeys(errorBody).substring(0, 500);

          if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
            const retryAfterMs = parseRetryAfterHeader(response.headers.get('retry-after'));
            lastError = new Error(
              `Anthropic API error ${response.status}: ${sanitizedBody}`,
            );
            lastRetryInfo = { retryAfterMs };
            continue;
          }

          throw new Error(`Anthropic API error ${response.status}: ${sanitizedBody}`);
        }

        const data = await response.json();
        const textBlock = data.content?.find(
          (block: { type: string }) => block.type === 'text',
        );
        if (!textBlock?.text) {
          throw new Error('No text content in Anthropic API response');
        }
        return textBlock.text;
      }

      // Unreachable in practice — the loop either returns or throws on the last attempt
      throw lastError ?? new Error('Anthropic API request failed after retries');
    },
  };
}
