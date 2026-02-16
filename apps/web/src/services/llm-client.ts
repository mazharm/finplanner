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
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(attempt: number, retryAfterHeader: string | null): number {
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attempt);
  if (retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.max(retryAfterSeconds * 1000, exponentialDelay);
    }
  }
  return exponentialDelay;
}

export function createLlmClient(apiKey: string): LlmClient {
  return {
    async sendMessage(systemPrompt: string, userMessage: string): Promise<string> {
      const requestBody = JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = getRetryDelay(attempt - 1, lastError?.cause as string | null);
          await sleep(delay);
        }

        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'anthropic-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-dangerous-direct-browser-access': 'true',
            'content-type': 'application/json',
          },
          body: requestBody,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');

          if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
            const retryAfter = response.headers.get('retry-after');
            lastError = new Error(
              `Anthropic API error ${response.status}: ${errorBody}`,
              { cause: retryAfter },
            );
            continue;
          }

          throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
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
