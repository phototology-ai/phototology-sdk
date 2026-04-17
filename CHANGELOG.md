# @phototology/sdk Changelog

## 1.0.0 (2026-04-17)

Registry v2 ships. Photos are persistent per API key: the second call on the same image bills zero credits for lenses already run.

### Breaking Changes

- **`LookupResult.analyses[]` is gone.** Replaced by `LookupResult.photo?: PhotoRecord`. A photo is now a single record keyed by `sha256`, with `lenses: Record<string, LensIndexEntry>` — one entry per lens, updated in place on refresh. Historical runs are no longer returned. See the README migration section for before/after code.
- `AnalysisRecord` type removed. Use `LensIndexEntry` (per-lens) and `PhotoRecord` (per-photo) instead.

### Added

- `AnalyzeRequest.refresh?: boolean` — pass `true` to bypass the projection cache and force a fresh LLM run for every requested lens. Billed normally.
- `AnalyzeUsage.creditsCharged?: number` — credits billed on this specific call. Zero on a full registry cache hit.
- New exported types: `PhotoRecord`, `LensIndexEntry`, `LookupResponse`, `LookupResult`, `LookupRequest`.
- Vocabulary aligned with the Phototology brand rename: "lenses" everywhere (was "modules").

## 0.2.0 (2026-03-22)

### Breaking Changes

- **`PLAN_LIMIT_EXCEEDED` HTTP status changed from 403 to 402.** If your code checks `error.status === 403` for plan limits, update to `402` or use `error instanceof PlanLimitError`.
- **`ApiKeyTier` narrowed from 4 values to 2.** Only `'starter'` and `'growth'` tiers exist. The `'free'`, `'developer'`, and `'enterprise'` tiers are removed.

### Added

- `PlanLimitError` -- new error subclass for `PLAN_LIMIT_EXCEEDED` (HTTP 402). Thrown when a Starter tier user exceeds their free image quota.

## 0.1.1 (2026-03-21)

- Initial release
