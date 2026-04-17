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
  | 'INTERNAL_ERROR'
  | 'SCHEMA_GENERATION_FAILED'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'SCHEMA_NOT_FOUND'
  | 'BESPOKE_SAFETY_BLOCKED'
  | 'BESPOKE_EXTRACTION_FAILED';

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

/** Bespoke extraction configuration for v2/analyze. */
export interface ExtractConfig {
  /** Natural language prompt describing what to extract. Max 500 chars. Mutually exclusive with schema/schemaId. */
  prompt?: string;
  /** Developer-provided JSON Schema. Mutually exclusive with prompt/schemaId. */
  schema?: Record<string, unknown>;
  /** Previously saved schema ID. Mutually exclusive with prompt/schema. */
  schemaId?: string;
}

/** Bespoke metadata in the analysis response. */
export interface BespokeMetadata {
  /** ID of the schema used (for reuse via schemaId). */
  schemaId: string;
  /** How the schema was resolved. */
  inputMode: 'prompt' | 'schema' | 'saved';
  /** Whether the schema was found in cache (previously generated from same prompt). */
  schemaCacheHit: boolean;
  /** Number of fields in the bespoke schema. */
  fieldCount: number;
}

/** Request body for POST /v1/analyze. */
export interface AnalyzeRequest {
  /** Single image URL. Mutually exclusive with imageBase64 and images. */
  imageUrl?: string;
  /** Single image as base64. Mutually exclusive with imageUrl and images. */
  imageBase64?: string;
  /** Multiple images. Mutually exclusive with imageUrl/imageBase64. */
  images?: ImageInput[];

  /** Analysis preset (e.g. 'full-analysis', 'vehicle-condition'). */
  preset?: string;
  /** Explicit module list (alternative to preset). */
  modules?: string[];
  /** Modules to add to the preset. */
  modulesAdd?: string[];
  /** Modules to remove from the preset. */
  modulesRemove?: string[];
  /** Per-module configuration (e.g. { describe: { domain: 'automotive' } }). */
  moduleOptions?: Record<string, Record<string, unknown>>;

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

  /** Bespoke extraction configuration. When present, routes to /v2/analyze. */
  extract?: ExtractConfig;
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
  /** Number of credits charged for this analysis. */
  creditsCharged?: number;
}

/** Vendor of the AI model that produced the analysis. EU AI Act Art. 50 disclosure. */
export type AnalyzeVendor = 'google' | 'openai' | 'anthropic';

/** Response metadata. */
export interface AnalyzeMeta {
  processingTimeMs: number;
  provider: string;
  promptHash: string;
  requestId: string;
  /**
   * EU AI Act Art. 50 transparency flag — always `true`. The `/v1/analyze`
   * endpoint always runs a generative model, so responses are always
   * AI-generated.
   */
  ai_generated: true;
  /** Model identifier (e.g. `"gemini-2.0-flash"`, `"gpt-4o"`). */
  model: string;
  /** Canonical vendor of the model used. */
  vendor: AnalyzeVendor;
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

/** Credits payload attached to 402 PLAN_LIMIT_EXCEEDED responses. */
export interface ErrorCredits {
  /** Credits required by the request. */
  needed: number;
  /** Community pool balance. */
  community: number;
  /** Purchased pool balance. */
  purchased: number;
  /** community + purchased. */
  total: number;
  /** Days until community pool refills. Omitted when user has no community pool. */
  resetsInDays?: number;
}

/** Standard error response from the API. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId: string;
    /** Populated on 402 PLAN_LIMIT_EXCEEDED with dual-pool credit info. */
    credits?: ErrorCredits;
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

/** Request for looking up a previously analyzed photo. */
export interface LookupRequest {
  /** Image URLs to look up. */
  images?: string[];
  /** Base64-encoded images to look up. */
  imagesBase64?: string[];
  /** SHA-256 hash for direct lookup (GET fast path). */
  sha256?: string;
  /** Perceptual hash for fuzzy lookup (GET fast path). */
  pHash?: string;
  /** Hamming distance threshold for fuzzy matching (default: 5). */
  threshold?: number;
}

/** A single analysis record from the registry. */
export interface AnalysisRecord {
  analysisId: string;
  output: Record<string, unknown>;
  modulesUsed: string[];
  moduleVersions: Record<string, string> | null;
  bespokeSchemaId: string | null;
  schemaHash: string | null;
  provider: string;
  creditsCharged: number;
  createdAt: string;
}

/** Lookup result for a single image. */
export interface LookupResult {
  matchType: 'exact' | 'fuzzy' | 'none';
  hammingDistance?: number;
  analyses: AnalysisRecord[];
}

/** Lookup response from the API. */
export interface LookupResponse {
  object: 'lookup';
  results: Record<string, LookupResult>;
  meta: {
    imagesSubmitted: number;
    imagesMatched: number;
    processingTimeMs: number;
    requestId: string;
  };
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
  /**
   * Optional User-Agent string. Prepended to the SDK default so server-side
   * observability can identify callers. Example: `"my-app/1.2.0"`.
   * Final UA sent: `"<userAgent> @phototology/sdk/<version>"`.
   */
  userAgent?: string;
}
