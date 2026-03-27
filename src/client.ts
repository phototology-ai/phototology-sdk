import { fetchWithRetry } from './retry';
import { PhototologyError } from './errors';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ModulesResponse,
  PhototologyClientConfig,
} from './types';

const DEFAULT_BASE_URL = 'https://api.phototology.com';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 60_000;

/**
 * Phototology API client.
 *
 * Named export (no default) per project convention.
 *
 * @example
 * ```ts
 * import { PhototologyClient } from '@phototology/sdk';
 *
 * const client = new PhototologyClient({ apiKey: 'pt_test_...' });
 * const result = await client.analyze({ imageUrl: 'https://example.com/photo.jpg' });
 * ```
 */
export class PhototologyClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  /** Unix ms timestamp — if set and in the future, delay until this time. */
  private rateLimitResetAt: number = 0;

  constructor(config?: PhototologyClientConfig) {
    const apiKey = config?.apiKey ?? process.env.PHOTOTOLOGY_API_KEY;
    if (!apiKey) {
      throw new PhototologyError(
        'API key is required. Pass apiKey in config or set PHOTOTOLOGY_API_KEY environment variable.',
        { code: 'CONFIG_ERROR', status: 0, retryable: false, requestId: 'none' },
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Analyze a photo (or multiple photos).
   *
   * Returns a discriminated union — check `outputSchema` to narrow the output type.
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    // Route to v2 when bespoke extraction is requested
    const path = request.extract ? '/v2/analyze' : '/v1/analyze';
    const response = await this.request('POST', path, request);
    return response.json() as Promise<AnalyzeResponse>;
  }

  /**
   * List available analysis modules and presets.
   */
  async modules(): Promise<ModulesResponse> {
    const response = await this.request('GET', '/v1/modules');
    return response.json() as Promise<ModulesResponse>;
  }

  /** Send an authenticated request with retry and pre-emptive rate limit backoff. */
  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    // Pre-emptive backoff: if we know we're rate-limited, wait until reset
    const now = Date.now();
    if (this.rateLimitResetAt > now) {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitResetAt - now));
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    const response = await fetchWithRetry(url, init, {
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    });

    // Track rate limit state from response headers
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      const reset = response.headers.get('x-ratelimit-reset');
      if (reset) {
        this.rateLimitResetAt = parseInt(reset, 10) * 1000; // Unix seconds → ms
      }
    } else {
      this.rateLimitResetAt = 0;
    }

    return response;
  }
}
