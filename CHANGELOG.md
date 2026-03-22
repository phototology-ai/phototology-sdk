# @phototology/sdk Changelog

## 0.2.0 (2026-03-22)

### Breaking Changes

- **`PLAN_LIMIT_EXCEEDED` HTTP status changed from 403 to 402.** If your code checks `error.status === 403` for plan limits, update to `402` or use `error instanceof PlanLimitError`.
- **`ApiKeyTier` narrowed from 4 values to 2.** Only `'starter'` and `'growth'` tiers exist. The `'free'`, `'developer'`, and `'enterprise'` tiers are removed.

### Added

- `PlanLimitError` -- new error subclass for `PLAN_LIMIT_EXCEEDED` (HTTP 402). Thrown when a Starter tier user exceeds their free image quota.

## 0.1.1 (2026-03-21)

- Initial release
