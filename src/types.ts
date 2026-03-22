/** Known platform error codes (matches API PlatformErrorCode). */
export type PlatformErrorCode =
  | 'VALIDATION_FAILED'
  | 'AUTH_FAILED'
  | 'PLAN_LIMIT_EXCEEDED'
  | 'IMAGE_INVALID'
  | 'IMAGE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'CONTENT_FILTERED'
  | 'PARSE_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

/** Image in a multi-image request. */
export interface ImageInput {
  url?: string;
  base64?: string;
}

/** Person context for analysis. */
export interface PersonContext {
  name: string;
  birthYear?: number;
  deathYear?: number;
  role?: string;
}

/** Vehicle context for analysis. */
export interface VehicleContext {
  vin?: string;
  mileage?: number;
  year?: number;
  make?: string;
  model?: string;
}

/** Request body for POST /v1/analyze. */
export interface AnalyzeRequest {
  /** Single image URL. Mutually exclusive with imageBase64 and images. */
  imageUrl?: string;
  /** Single image as base64. Mutually exclusive with imageUrl and images. */
  imageBase64?: string;
  /** Multiple images. Mutually exclusive with imageUrl/imageBase64. */
  images?: ImageInput[];

  /** Analysis preset (e.g. 'photo-analysis', 'vehicle-condition'). */
  preset?: string;
  /** Explicit module list (alternative to preset). */
  modules?: string[];
  /** Modules to add to the preset. */
  modulesAdd?: string[];
  /** Modules to remove from the preset. */
  modulesRemove?: string[];

  /** Domain context. */
  context?: {
    knownPeople?: PersonContext[];
    vehicle?: VehicleContext;
    customInstructions?: string;
  };

  /** Processing options. */
  options?: {
    includeEmbedding?: boolean;
    includeFingerprint?: boolean;
  };
}

/** Photo analysis output (opaque record — fields vary by modules used). */
export type PhotoOutput = Record<string, unknown>;

/** Vehicle condition output (opaque record — fields vary by modules used). */
export type VehicleOutput = Record<string, unknown>;

/** Usage information from analysis. */
export interface AnalyzeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  modulesUsed: string[];
}

/** Response metadata. */
export interface AnalyzeMeta {
  processingTimeMs: number;
  provider: string;
  promptHash: string;
  requestId: string;
}

/** Fingerprint data (when requested). */
export interface Fingerprint {
  pHash: string;
  dHash: string;
  sha256: string;
}

/** Base response shape shared by both output schemas. */
interface AnalyzeResponseBase {
  id: string;
  object: 'analysis';
  schemaVersion: string;
  createdAt: string;
  usage: AnalyzeUsage;
  warnings: string[];
  meta: AnalyzeMeta;
  embedding?: number[];
  fingerprint?: Fingerprint;
}

/** Response when outputSchema is 'photo'. */
export interface PhotoAnalyzeResponse extends AnalyzeResponseBase {
  outputSchema: 'photo';
  output: PhotoOutput;
}

/** Response when outputSchema is 'vehicle'. */
export interface VehicleAnalyzeResponse extends AnalyzeResponseBase {
  outputSchema: 'vehicle';
  output: VehicleOutput;
}

/** Discriminated union — narrows output type based on outputSchema. */
export type AnalyzeResponse = PhotoAnalyzeResponse | VehicleAnalyzeResponse;

/** Standard error response from the API. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId: string;
  };
}

/** Single module in the modules discovery response. */
export interface ModuleInfo {
  name: string;
  description: string;
  category: string;
  outputFields: string[];
}

/** Single preset in the modules discovery response. */
export interface PresetInfo {
  name: string;
  description: string;
  modules: string[];
}

/** Response from GET /v1/modules. */
export interface ModulesResponse {
  modules: ModuleInfo[];
  presets: PresetInfo[];
}

/** SDK client configuration. */
export interface PhototologyClientConfig {
  /** API key (pt_live_ or pt_test_ prefix). Also reads PHOTOTOLOGY_API_KEY env. */
  apiKey?: string;
  /** Base URL for the API. Default: https://api.phototology.com */
  baseUrl?: string;
  /** Maximum number of retries on retryable errors. Default: 3 */
  maxRetries?: number;
  /** Request timeout in milliseconds. Default: 60000 */
  timeout?: number;
}
