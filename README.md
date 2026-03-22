# @phototology/sdk

TypeScript SDK for the [Phototology](https://api.phototology.com/v1/docs) AI vision API.

[![npm version](https://img.shields.io/npm/v/@phototology/sdk)](https://www.npmjs.com/package/@phototology/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

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
  preset: 'photo-analysis',
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
  preset: 'photo-analysis',    // photo-analysis | memorial | vehicle-condition | quick-scan
  modules: ['dating', 'people', 'location'], // or explicit module list
  modulesAdd: ['entities'],    // add to preset
  modulesRemove: ['quality'],  // remove from preset

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
});

result.id;                      // "ana_7f3a9c2e"
result.outputSchema;            // "photo" | "vehicle"
result.output;                  // Structured analysis data
result.usage.totalTokens;       // Token count
result.usage.estimatedCostUsd;  // Cost estimate
result.embedding;               // number[] (if requested)
result.fingerprint;             // { pHash, dHash, sha256 } (if requested)
result.warnings;                // string[]
result.meta.processingTimeMs;   // Processing time
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
