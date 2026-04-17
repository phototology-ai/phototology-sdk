# @phototology/sdk

**Analyze once. Remember forever.**

TypeScript SDK for [Phototology](https://api.phototology.com/v1/docs), the harness for visual intelligence. One governed layer every photo-aware agent, app, and workflow calls into. Perceptual-hash registry: second access of the same photo costs zero credits.

[![npm version](https://img.shields.io/npm/v/@phototology/sdk)](https://www.npmjs.com/package/@phototology/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Migrating from 0.2.0 to 1.0.0

Registry v2 replaced the historical `analyses[]` array with a per-lens map on a single `PhotoRecord`. If you previously used `client.lookup()`:

```typescript
// 0.2.0 (old)
const result = lookupResponse.results[sha];
for (const analysis of result.analyses ?? []) {
  console.log(analysis.modulesUsed, analysis.output);
}

// 1.0.0 (new)
const result = lookupResponse.results[sha];
if (result.photo) {
  for (const [lensName, entry] of Object.entries(result.photo.lenses)) {
    console.log(lensName, entry.output, entry.version, entry.producedAt);
  }
}
```

A photo is now a single record keyed by sha256. Each lens produces one entry and is updated in place on refresh. See the `client.lookup()` reference below.

## Install

```bash
npm install @phototology/sdk
```

## Quick Start

```typescript
import { PhototologyClient } from '@phototology/sdk';

const client = new PhototologyClient({ apiKey: 'pt_live_...' });

const result = await client.analyze({
  imageUrl: 'https://example.com/photo.jpg',
  preset: 'full-analysis',
});

console.log(result.output);           // Structured analysis data
console.log(result.usage.totalTokens); // Token usage
```

## Scaffolding CLI

Get started instantly with zero configuration:

```bash
npx @phototology/sdk
```

This creates a `.env` file and a working `analyze-example.ts` script. Set `PHOTOTOLOGY_API_KEY` beforehand or paste it when prompted.

Keys starting with `pt_test_` use the test sandbox (instant responses, zero cost, deterministic fixtures).

## API Reference

### `client.analyze(request)`

Analyze one or more images with AI vision.

```typescript
const result = await client.analyze({
  // Image input (one of):
  imageUrl: 'https://example.com/photo.jpg',
  imageBase64: '...',           // or base64-encoded image
  images: [{ url: '...' }],    // or multiple images

  // Module selection (one of):
  preset: 'full-analysis',      // full-analysis | quick-scan | automobile | claims | property | ecommerce | memorial | vehicle-condition
  modules: ['dating', 'people', 'location'], // or explicit module list
  modulesAdd: ['entities'],    // add to preset
  modulesRemove: ['moderation'],  // remove from preset

  // Context
  context: {
    knownPeople: [{ name: 'Alice', birthYear: 1950 }],
    vehicle: { vin: '...', mileage: 45000 },
    customInstructions: 'Focus on architectural details',
  },

  // Options
  options: {
    includeEmbedding: true,     // 1408-dim vector for similarity search
    includeFingerprint: true,   // pHash, dHash, sha256
  },

  // Registry v2
  refresh: false,               // true = bypass projection cache, re-run LLM for every requested lens (billed normally)
});

result.id;                      // "ana_7f3a9c2e"
result.outputSchema;            // "photo" | "vehicle"
result.output;                  // Structured analysis data
result.usage.totalTokens;       // Token count
result.usage.estimatedCostUsd;  // Cost estimate
result.usage.creditsCharged;    // Credits billed on this call (0 on a full registry cache hit)
result.embedding;               // number[] (if requested)
result.fingerprint;             // { pHash, dHash, sha256 } (if requested)
result.warnings;                // string[]
result.meta.processingTimeMs;   // Processing time
```

#### Delta billing

Phototology keys each photo to your API key by perceptual hash. The second call on the same image bills zero credits for every lens that was already run. Only lenses that are new to this photo are sent to the LLM and counted. A full cache hit returns instantly with `usage.creditsCharged === 0`.

Pass `refresh: true` to force every requested lens to re-run. The call is billed normally.

### `client.lookup(request)`

Look up previously analyzed photos by fingerprint or image. Free, no credits charged.

```typescript
// Direct fingerprint lookup (GET fast path)
const byHash = await client.lookup({ sha256: 'e3b0c442...' });

// Or fuzzy lookup by pHash (Hamming distance)
const byPhash = await client.lookup({ pHash: 'fc1c149afbf4c899', threshold: 5 });

// Or submit one or more images (POST path)
const byImage = await client.lookup({
  images: ['https://example.com/photo.jpg'],
});

const record = byHash.results['e3b0c442...'];
record.matchType;             // 'exact' | 'fuzzy' | 'none'
record.hammingDistance;       // number (fuzzy matches only)
record.photo;                 // PhotoRecord — omitted on 'none'

if (record.photo) {
  record.photo.sha256;
  record.photo.firstAnalyzedAt;
  record.photo.lastAnalyzedAt;
  record.photo.totalCreditsSpent;
  record.photo.analyzeCallCount;
  record.photo.lenses;        // Record<string, LensIndexEntry>

  for (const [lens, entry] of Object.entries(record.photo.lenses)) {
    entry.output;             // Full lens output
    entry.version;            // Lens schema version
    entry.producedAt;         // When this lens last ran
    entry.coRunHash;          // Stable hash of the sibling-lens set at that run
    entry.provider;           // 'gemini' | 'openai' | 'anthropic'
  }
}
```

### `client.modules()`

List available analysis modules and presets.

```typescript
const { modules, presets } = await client.modules();

// modules: [{ name, description, category, outputFields }]
// presets: [{ name, description, modules }]
```

## Error Handling

All API errors extend `PhototologyError` with typed subclasses for ergonomic catch patterns:

```typescript
import {
  PhototologyError,
  AuthenticationError,
  ValidationError,
  RateLimitedError,
  ParseError,
  InternalError,
  ProviderError,
} from '@phototology/sdk';

try {
  await client.analyze({ imageUrl: '...' });
} catch (err) {
  if (err instanceof RateLimitedError) {
    // 429 — retry after backoff
    console.log(`Rate limited. Retry after ${err.retryAfter}s`);
  } else if (err instanceof AuthenticationError) {
    // 401 — invalid or expired API key
    console.log('Check your API key');
  } else if (err instanceof ValidationError) {
    // 400 — bad input, invalid image, content filtered
    console.log(`Validation error: ${err.message}`);
  } else if (err instanceof ProviderError) {
    // 502 — upstream AI provider unavailable (retryable)
    console.log(`Provider issue: ${err.message}`);
  } else if (err instanceof ParseError) {
    // 500 — AI returned unparseable output (retryable)
    console.log(`Parse error: ${err.message}`);
  } else if (err instanceof InternalError) {
    // 500 — server error (not retryable)
    console.log(`Internal error: ${err.message}`);
  } else if (err instanceof PhototologyError) {
    // Base class catch-all
    console.log(`${err.code}: ${err.message} (retryable: ${err.retryable})`);
  }
}
```

Every error includes: `code` (string), `status` (HTTP status), `retryable` (boolean), `requestId` (string).

## Configuration

```typescript
const client = new PhototologyClient({
  apiKey: 'pt_live_...',       // Required (or set PHOTOTOLOGY_API_KEY env var)
  baseUrl: 'https://...',      // Default: https://api.phototology.com
  maxRetries: 3,               // Default: 3 (retries on retryable errors)
  timeout: 60_000,             // Default: 60s
});
```

### Self-Hosted

Point the SDK at your own Phototology API instance:

```typescript
const client = new PhototologyClient({
  apiKey: 'pt_live_...',
  baseUrl: 'https://your-instance.example.com',
});
```

## TypeScript

All types are exported:

```typescript
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  PhotoAnalyzeResponse,
  VehicleAnalyzeResponse,
  ModulesResponse,
  LookupRequest,
  LookupResponse,
  LookupResult,
  PhotoRecord,
  LensIndexEntry,
  PhototologyClientConfig,
} from '@phototology/sdk';
```

The response is a discriminated union on `outputSchema` — narrow with a type guard:

```typescript
if (result.outputSchema === 'photo') {
  // result is PhotoAnalyzeResponse
}
```

## Built-in Retry

The SDK automatically retries on retryable errors (429, 502, 500 with `PARSE_FAILED`) with exponential backoff. Rate limit headers (`x-ratelimit-remaining`, `x-ratelimit-reset`) are respected for pre-emptive backoff.

## Links

- [API Documentation](https://api.phototology.com/v1/docs)
- [OpenAPI Spec](https://api.phototology.com/v1/openapi.json)
- [MCP Server](https://www.npmjs.com/package/@phototology/mcp) — use Phototology from AI coding assistants
- [GitHub](https://github.com/nlakios/family-photo-chronology/tree/main/packages/phototology-sdk)

## License

MIT
