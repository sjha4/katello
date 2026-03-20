# Quirks System Documentation

## What Are Quirks?

Quirks handle the realities of Pulp API inconsistencies across versions. They replace the 3 monkey patch files (~400 lines) that previously worked around issues in the generated client gems.

The quirks system has three components:

| Component | Purpose | When Applied |
|-----------|---------|-------------|
| **SpecQuirks** | Fix incorrect OpenAPI spec definitions | During spec parsing |
| **Capabilities** | Gate features by plugin version | Before making API calls |
| **ResponseQuirks** | Normalize response differences | After receiving responses |

## SpecQuirks

**File:** `lib/katello/pulp_client/quirks/spec_quirks.rb`

Applied once when the OpenAPI spec is first loaded. Mutates the raw spec hash to fix known issues before the `SpecIndex` is built.

### How It Works

```ruby
# Called automatically by Connection during spec load:
Katello::PulpClient::Quirks::SpecQuirks.apply!(spec_hash)
```

### Current Quirks

#### `fix_rpm_gpgcheck_enum`

**Problem:** The Pulp RPM spec defines `gpgcheck` and `repo_gpgcheck` with an enum of `[0, 1]`, but the API actually returns `nil` for these fields in some versions. The generated client would raise `ArgumentError` when deserializing responses with nil values.

**Previous fix:** `lib/monkeys/fix_rpm_repository_gpgcheck.rb` -- a 38-line monkey patch that overrode the setter methods on `RpmRpmRepositoryResponse` and `RpmRpmPublicationResponse`.

**Quirk fix:** Remove the `enum` constraint from the spec so the `SpecIndex` doesn't validate these values:

```ruby
def self.fix_rpm_gpgcheck_enum(spec_hash)
  schemas = spec_hash.dig('components', 'schemas') || {}
  %w[rpm.RpmRepository rpm.RpmRepositoryResponse].each do |schema_name|
    schema = schemas[schema_name]
    next unless schema
    %w[gpgcheck repo_gpgcheck].each do |field|
      prop = schema.dig('properties', field)
      prop&.delete('enum')
    end
  end
end
```

### Adding a New Spec Quirk

1. Identify the spec issue (incorrect schema, missing field, wrong type)
2. Add a method to `SpecQuirks`:

```ruby
def self.fix_my_issue(spec_hash)
  # Mutate spec_hash to fix the issue
  schema = spec_hash.dig('components', 'schemas', 'SomeSchema')
  return unless schema
  # ... apply fix
end
```

3. Call it from `apply!`:

```ruby
def self.apply!(spec_hash)
  fix_rpm_gpgcheck_enum(spec_hash)
  fix_my_issue(spec_hash)  # Add here
end
```

4. Add a comment explaining what the quirk fixes and a link to the upstream issue

## Capabilities

**File:** `lib/katello/pulp_client/quirks/capabilities.rb`

Runtime feature gates. Check whether an operation or feature is available before attempting it.

### How It Works

```ruby
spec_index = connection.spec_index

# Check plugin version
if Capabilities.plugin_version_gte?(spec_index, 'core', '3.23')
  # Use domain-aware API
end

# Check if an operation exists
if Capabilities.operation_available?(spec_index, 'repositories_reclaim_space_reclaim')
  # Use reclaim space API
end

# Named checks
Capabilities.domains_supported?(spec_index)
Capabilities.reclaim_space_supported?(spec_index)
```

### Adding a New Capability Check

```ruby
# In capabilities.rb:

# Describe what the capability is and when it was added
def self.my_new_feature_supported?(spec_index)
  plugin_version_gte?(spec_index, 'rpm', '3.35')
end
```

### When to Use Capabilities vs. SpecQuirks

- **Capabilities**: The feature genuinely doesn't exist in older versions. Use to gate code paths.
- **SpecQuirks**: The feature exists but the spec is wrong. Fix the spec so the client works correctly.

## ResponseQuirks

**File:** `lib/katello/pulp_client/quirks/response_quirks.rb`

Normalizes differences in how Pulp responds across versions or endpoint types.

### How It Works

```ruby
response = connection.call("some_operation", params: { ... })
task_href = ResponseQuirks.extract_task(response)
```

### Current Quirks

#### `normalize_delete_response`

Some delete operations return 202 (async task) in newer versions but returned 204 (no content) in older versions. This normalizer ensures consistent handling.

#### `extract_task`

Distribution create/update may return either a task href (202 async) or the resource directly (200/201). This extracts the task href when present.

### Adding a New Response Quirk

```ruby
# In response_quirks.rb:

# Describe the behavioral difference
def self.handle_my_case(response)
  if response.http_status == 204
    # Handle no-content case
  else
    # Normal case
    response
  end
end
```

## Quirks vs. Old Monkey Patches

The quirks system replaces three monkey patch files. Here's how they map:

### `fix_rpm_repository_gpgcheck.rb` (38 lines)

**Problem:** Generated `RpmRpmRepositoryResponse` didn't accept nil for gpgcheck fields.

**Old approach:** Monkey-patched setter methods on generated classes to allow nil.

**New approach:** `SpecQuirks.fix_rpm_gpgcheck_enum` removes the enum constraint from the spec. The `Response` wrapper returns whatever value (including nil) is in the JSON, no validation needed.

### `remove_hidden_distribution.rb` (383 lines)

**Problem:** 7 distribution classes (`RpmRpmDistribution`, `FileFileDistribution`, etc.) set `hidden = false` by default in their constructors. When Katello passed distribution options without explicitly setting `hidden`, the generated client would send `hidden: false` even though Katello wanted to omit it.

**Old approach:** 7 separate monkey patches, each copying the entire constructor of a generated class and commenting out the `self.hidden = false` line.

**New approach:** Not needed. The spec-driven client sends only the fields you explicitly include in the `body:` Hash. No default values are injected.

### `pulp_polymorphic_remote_response.rb` (85 lines)

**Problem:** Pulpcore 3.90 introduced polymorphic responses on Remote update endpoints (202 with task vs. 204 with no changes). Ruby bindings generated with 3.90+ schemas had incorrect default return types, causing deserialization to produce objects with all-nil attributes.

**Old approach:** Monkey-patched 8 Remote API classes to override `partial_update_with_http_info` and `update_with_http_info`, forcing `debug_return_type` to `AsyncOperationResponse`.

**New approach:** Not needed. The spec-driven client doesn't deserialize into typed objects. The `Response` wrapper handles whatever JSON comes back, and the response status code tells you whether it was async (202) or no-op (204).

## Maintaining Quirks Over Time

### When to Add Quirks

- Pulp publishes a spec with a bug that affects your usage
- A new Pulp version changes behavior in a way that breaks existing Katello code
- You need to support multiple Pulp versions simultaneously

### When to Remove Quirks

- The upstream Pulp issue is fixed and Katello no longer supports the broken version
- The quirk is no longer relevant (e.g., the field or endpoint was removed)

### Best Practices

1. Always include a comment explaining WHY the quirk exists
2. Link to the upstream Pulp issue when available
3. Note the Pulp version(s) affected
4. Add a TODO with the condition for removal (e.g., "remove when Katello drops support for pulpcore < 3.90")

## Related Documentation

- [Architecture Overview](architecture.md) - Where quirks fit in the system
- [Upgrade Procedure](upgrade_procedure.md) - Managing quirks during Pulp upgrades
- [Troubleshooting](troubleshooting.md) - Debugging quirks-related issues
