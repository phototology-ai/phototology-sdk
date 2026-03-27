// @phototology/sdk — TypeScript client for the Phototology AI vision API

// Client
export { PhototologyClient } from './client';

// Types
export type {
  AnalyzeRequest,
  AnalyzeResponse,
  PhotoAnalyzeResponse,
  VehicleAnalyzeResponse,
  PhotoOutput,
  VehicleOutput,
  AnalyzeUsage,
  AnalyzeMeta,
  Fingerprint,
  ImageInput,
  PersonContext,
  VehicleContext,
  ExtractConfig,
  BespokeMetadata,
  ModulesResponse,
  ModuleInfo,
  PresetInfo,
  ErrorResponse,
  PlatformErrorCode,
  PhototologyClientConfig,
} from './types';

// Errors
export {
  PhototologyError,
  AuthenticationError,
  ValidationError,
  RateLimitedError,
  ParseError,
  InternalError,
  ProviderError,
  PlanLimitError,
} from './errors';
