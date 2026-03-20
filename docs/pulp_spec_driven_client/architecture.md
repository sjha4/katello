# Pulp Spec-Driven Client Architecture

## Overview

Katello communicates with Pulp (a content management system) through its REST API. Previously, this was done via **9 auto-generated Ruby client gems** totaling ~30,000 lines of code. The spec-driven client replaces all of them with ~350 lines of hand-written Ruby that reads Pulp's OpenAPI specification at runtime.

The core idea: instead of generating code from the OpenAPI spec at build time, parse the spec at runtime and route API calls dynamically by `operation_id`.

## Core Components

```
lib/katello/pulp_client/
├── connection.rb           # HTTP client: spec fetch, call routing, SSL/auth
├── spec_index.rb           # OpenAPI spec parser, operation_id lookup index
├── response.rb             # Permissive response wrapper (method_missing)
├── api_error.rb            # Unified error class for all Pulp API failures
└── quirks/
    ├── spec_quirks.rb      # Patch incorrect specs before indexing
    ├── capabilities.rb     # Feature gates for version-specific operations
    └── response_quirks.rb  # Handle behavioral differences (204 vs 202)
```

### Connection (`connection.rb`)

The central component. Initialized with a `SmartProxy` instance, it:

1. Fetches the OpenAPI spec from the proxy's Pulp instance (`/pulp/api/v3/docs/api.json`) on first use
2. Builds a `SpecIndex` for O(1) operation lookup
3. Routes API calls via `call(operation_id, params:, body:)`
4. Handles SSL client certificates, basic auth, and Correlation-ID headers
5. Caches the parsed spec in memory for the lifetime of the connection

Each `SmartProxy` gets its own `Connection` instance with isolated configuration, supporting multi-proxy deployments.

### SpecIndex (`spec_index.rb`)

Parses the OpenAPI JSON and builds a flat Hash:

```ruby
{
  "repositories_rpm_rpm_sync" => {
    method: "post",
    path: "/pulp/api/v3/repositories/rpm/rpm/{rpm_rpm_repository_href}sync/",
    path_params: ["rpm_rpm_repository_href"],
    query_params: []
  },
  # ... all other operations
}
```

Also extracts plugin versions from the spec's `info.x-pulp-app-versions` field, enabling version-based feature gating.

### Response (`response.rb`)

A permissive wrapper around HTTP responses that:

- Provides method-style access to JSON fields via `method_missing` (e.g., `response.pulp_href`)
- Returns `nil` for missing fields instead of raising errors
- Wraps nested Hashes and Arrays automatically
- Provides pagination helpers (`results`, `count`)
- Exposes raw HTTP status, headers, and body

This design eliminates the entire category of monkey patches that were needed to handle missing or changed fields in generated client response classes.

### ApiError (`api_error.rb`)

A single unified error class replacing the per-gem `ApiError` classes (`PulpcoreClient::ApiError`, `PulpRpmClient::ApiError`, etc.):

- Carries HTTP `status`, response `body`, and `operation_id`
- Provides `code` alias for `status` for backward compatibility with `e.code` checks
- Truncates long response bodies in error messages

### Quirks System (`quirks/`)

Three modules that handle the realities of Pulp API inconsistencies across versions:

- **SpecQuirks**: Mutates the raw spec hash before indexing to fix known issues (e.g., removing incorrect enum constraints on `gpgcheck` fields)
- **Capabilities**: Version-aware feature gates that check plugin versions or operation availability before attempting calls
- **ResponseQuirks**: Normalizes behavioral differences like operations that return 202 (async task) in one version and 204 (no content) in another

## How It Works

### Request Flow

```
Katello Code
    │
    ▼
API Wrapper (e.g., Pulp3::Api::Yum)
    │  calls pulp_connection.call("operation_id", params:, body:)
    │
    ▼
Connection
    │  1. Fetch spec (first call only)
    │  2. Look up operation_id in SpecIndex
    │  3. Substitute path parameters
    │  4. Build Faraday request (method, URL, query params, JSON body)
    │  5. Add auth headers (SSL certs or basic auth)
    │  6. Add Correlation-ID header
    │  7. Execute HTTP request
    │
    ▼
Response
    │  Wrap JSON body for permissive field access
    │
    ▼
Katello Code
    accesses response.pulp_href, response.task, response.results, etc.
```

### Spec Lifecycle

```
SmartProxy registered
    │
    ▼
First API call to this proxy
    │
    ▼
Connection fetches /pulp/api/v3/docs/api.json
    │
    ▼
SpecQuirks.apply!(spec_hash)     ← fix known spec issues
    │
    ▼
SpecIndex.new(spec_hash)         ← build operation lookup
    │
    ▼
Cached in Connection instance    ← reused for all subsequent calls
```

## Integration with Katello

### Layer Diagram

```
┌──────────────────────────────────────────────────┐
│  Dynflow Actions (async task orchestration)       │
│  e.g., Actions::Pulp3::Repository::Sync          │
├──────────────────────────────────────────────────┤
│  Repository Services                              │
│  e.g., Katello::Pulp3::Repository::Yum           │
│  (business logic: sync params, content filtering) │
├──────────────────────────────────────────────────┤
│  API Wrappers                                     │
│  e.g., Katello::Pulp3::Api::Yum < Api::Core      │
│  (thin layer: maps methods to operation_ids)      │
├──────────────────────────────────────────────────┤
│  PulpClient::Connection                           │
│  (HTTP transport: spec parsing, request routing)  │
├──────────────────────────────────────────────────┤
│  Faraday (HTTP library)                           │
├──────────────────────────────────────────────────┤
│  Pulp REST API                                    │
└──────────────────────────────────────────────────┘
```

### SmartProxy Configuration

Each `SmartProxy` with the `Pulpcore` feature provides:

- **Pulp URL**: `smart_proxy.setting('Pulpcore', 'pulp_url')`
- **SSL certificates**: Client cert/key for mutual TLS
- **Credentials**: Optional username/password for basic auth
- **Mirror flag**: Whether this proxy is a content mirror

The `Connection` reads these settings from the `SmartProxy` model via the same `pulp3_configuration` mechanism used previously.

## Comparison to Generated Clients

| Aspect | Generated Clients | Spec-Driven Client |
|--------|------------------|-------------------|
| Code volume | ~30,000 lines across 9 gems | ~350 lines |
| Maintenance | Regenerate when Pulp updates | Update quirks if needed |
| Type safety | Ruby objects with typed fields | Hash/method_missing access |
| Error handling | 9 separate ApiError classes | 1 unified ApiError |
| Version compat | Monkey patches (3 files, 400+ lines) | Quirks system (~70 lines) |
| API discovery | Hardcoded at generation time | Runtime from live spec |
| Multi-proxy | Separate config objects per gem | One Connection per SmartProxy |
| Dependencies | 9 gems in Gemfile | 0 additional gems |

## Related Documentation

- [Developer Guide](developer_guide.md) - How to work with the client day-to-day
- [API Reference](api_reference.md) - Connection, Response, and ApiError API docs
- [Operation ID Mapping](operation_ids.md) - Complete operation_id reference
- [Quirks System](quirks_system.md) - Adding and managing quirks
- [Migration Guide](migration_guide.md) - Migrating from generated clients
