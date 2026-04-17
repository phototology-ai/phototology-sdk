import { fetchWithRetry } from './retry';
import { PhototologyError } from './errors';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  LookupRequest,
  LookupResponse,
  ModulesResponse,
  PhototologyClientConfig,
} from './types';

const DEFAULT_BASE_URL = 'https://api.phototology.com';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 60_000;

// Bumped when a release needs to flip User-Agent reporting (see CHANGELOG).
// Kept as a string literal rather than a package.json read so Node and edge
// runtimes behave identically.
const SDK_VERSION = '1.0.1';
const DEFAULT_USER_AGENT = `@phototology/sdk/${SDK_VERSION}`;

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
  private readonly userAgent: string;
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
    this.userAgent = config?.userAgent
      ? `${config.userAgent} ${DEFAULT_USER_AGENT}`
      : DEFAULT_USER_AGENT;
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
    return safeJson<AnalyzeResponse>(response);
  }

  /**
   * List available analysis modules and presets.
   */
  async modules(): Promise<ModulesResponse> {
    const response = await this.request('GET', '/v1/modules');
    return safeJson<ModulesResponse>(response);
  }

  /**
   * Look up previously analyzed photos by image or hash.
   *
   * POST /v2/lookup when images are provided.
   * GET /v2/lookup when sha256 or pHash is provided (fast path).
   *
   * Lookups are free and do not consume credits.
   */
  async lookup(request: LookupRequest): Promise<LookupResponse> {
    // Use GET fast path when client provides a hash directly
    if (request.sha256 || request.pHash) {
      const params = new URLSearchParams();
      if (request.sha256) params.set('sha256', request.sha256);
      if (request.pHash) params.set('pHash', request.pHash);
      if (request.threshold !== undefined) params.set('threshold', String(request.threshold));
      const response = await this.request('GET', `/v2/lookup?${params.toString()}`);
      return safeJson<LookupResponse>(response);
    }

    // POST path for image-based lookup
    const response = await this.request('POST', '/v2/lookup', {
      images: request.images,
      images_base64: request.imagesBase64,
      threshold: request.threshold,
    });
    return safeJson<LookupResponse>(response);
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
      'User-Agent': this.userAgent,
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
    } else if (remaining !== null) {
      this.rateLimitResetAt = 0;
    }

    return response;
  }
}

async function safeJson<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new PhototologyError('Server returned non-JSON response', {
      code: 'PARSE_FAILED',
      status: response.status,
      retryable: false,
      requestId: 'unknown',
    });
  }
}
