# Migrating Tests from Generated Clients to Spec-Driven PulpClient

This guide documents how to update existing Pulp3 tests to use the new
spec-driven `Katello::PulpClient::Connection` instead of per-gem generated
client classes (`PulpcoreClient`, `PulpRpmClient`, `PulpFileClient`, etc.).

## Overview

The spec-driven client replaces all generated Pulp client gems with a single
`Connection` that reads the Pulp OpenAPI spec at runtime. Instead of
instantiating gem-specific API classes, you call operations by their
`operation_id` string.

## Quick Reference

| Old Pattern | New Pattern |
|---|---|
| `PulpcoreClient::TasksApi.new(client).list(limit: 10)` | `conn.call('tasks_list', params: { limit: 10 })` |
| `PulpRpmClient::RepositoriesRpmApi.new(client).list(...)` | `conn.call('repositories_rpm_rpm_list', params: { ... })` |
| `api.remotes_api.create(remote_data)` | `conn.call('remotes_rpm_rpm_create', body: remote_opts)` |
| `api.distributions_api.delete(href)` | `conn.call('distributions_rpm_rpm_delete', params: { rpm_rpm_distribution_href: href })` |
| `PulpcoreClient::ApiError` | `Katello::PulpClient::ApiError` |
| `e.code` | `e.code` (or `e.status`) |
| `response.pulp_href` | `response.pulp_href` (same) |
| `response.results` | `response.results` (same) |
| `response.count` | `response.count` (same) |

## Detailed Migration Steps

### 1. Replace API class instantiation

**Before:**
```ruby
def setup
  @primary = SmartProxy.pulp_primary
  core = Katello::Pulp3::Api::Core.new(@primary)
  @tasks_api = core.tasks_api  # => PulpcoreClient::TasksApi
end

def test_list_tasks
  result = @tasks_api.list(limit: 1)
  assert result.results.any?
end
```

**After:**
```ruby
def setup
  @primary = SmartProxy.pulp_primary
  @conn = TestPulpClientHelper.pulp_connection(@primary)
end

def test_list_tasks
  result = @conn.call('tasks_list', params: { limit: 1 })
  assert result.results.any?
end
```

### 2. Replace data model classes with Hashes

The generated clients used model classes (e.g., `PulpRpmClient::Copy`,
`PulpRpmClient::RpmRpmRemote`). The spec-driven client accepts plain Hashes.

**Before:**
```ruby
data = PulpRpmClient::Copy.new
data.config = [{ source_repo_version: "...", dest_repo: "...", content: [...] }]
data.dependency_solving = false
copy_api.copy_content(data)
```

**After:**
```ruby
body = {
  config: [{ source_repo_version: "...", dest_repo: "...", content: [...] }],
  dependency_solving: false,
}
conn.call('copy_content', body: body)
```

### 3. Replace exception handling

**Before:**
```ruby
rescue PulpcoreClient::ApiError => e
  raise e unless e.code == 404
end
```

**After:**
```ruby
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 404
end
```

### 4. Update stub/mock expectations

**Before:**
```ruby
PulpRpmClient::RepositoriesRpmVersionsApi.any_instance.expects(:delete).returns({})
PulpcoreClient::ExportersPulpApi.expects(:new)
```

**After:**
Stub the connection's `call` method instead:
```ruby
conn = TestPulpClientHelper.pulp_connection(@proxy)
conn.expects(:call).with('repositories_rpm_rpm_versions_delete',
  has_entries(params: has_key(:rpm_rpm_repository_version_href))).returns(
    Katello::PulpClient::Response.new(OpenStruct.new(status: 202, headers: {}, body: {}))
  )
```

Or stub at the service layer (preferred):
```ruby
service.expects(:delete_version).returns({})
```

### 5. Replace response field access

The `Response` class supports both method-style and hash-style access:

```ruby
response = conn.call('repositories_rpm_rpm_read', params: { ... })
response.pulp_href    # method-style
response['pulp_href'] # hash-style
response.to_h         # convert to plain Hash
```

### 6. Update VCR cassette patterns

Tests using `VCR::TestCase` continue to work unchanged. The cassette naming
and request matching remain the same. The only difference is that the shared
spec cassette is pre-loaded once via `TestPulpClientHelper.setup`.

For tests that manually open VCR cassettes:
```ruby
# No change needed - VCR still intercepts HTTP calls from Connection
VCR.use_cassette('my_cassette') do
  result = conn.call('repositories_rpm_rpm_list', params: { limit: 10 })
end
```

## Common Operation IDs

Find operation IDs in the Pulp API docs or by inspecting the spec:

| Generated API Method | Operation ID |
|---|---|
| `TasksApi#list` | `tasks_list` |
| `TasksApi#read` | `tasks_read` |
| `TasksApi#tasks_cancel` | `tasks_cancel` |
| `RepositoriesRpmApi#list` | `repositories_rpm_rpm_list` |
| `RepositoriesRpmApi#create` | `repositories_rpm_rpm_create` |
| `RepositoriesRpmApi#delete` | `repositories_rpm_rpm_delete` |
| `RemotesRpmApi#create` | `remotes_rpm_rpm_create` |
| `RemotesRpmApi#list` | `remotes_rpm_rpm_list` |
| `DistributionsRpmApi#create` | `distributions_rpm_rpm_create` |
| `DistributionsRpmApi#delete` | `distributions_rpm_rpm_delete` |
| `PublicationsRpmApi#list` | `publications_rpm_rpm_list` |
| `RpmCopyApi#copy_content` | `copy_content` |
| `ContentPackagegroupsApi#list` | `content_rpm_packagegroups_list` |
| `UploadsApi#create` | `uploads_create` |
| `UploadsApi#update` | `uploads_update` |
| `ExportersPulpApi#create` | `exporters_core_pulp_create` |
| `ImportersPulpApi#create` | `importers_core_pulp_create` |
| `OrphansCleanupApi#cleanup` | `orphans_cleanup_cleanup` |
| `RepairApi#post` | `repair_post` |
| `SigningServicesApi#list` | `signing_services_list` |

## Troubleshooting

**Q: My test can't find an operation_id.**
A: Check the Pulp OpenAPI spec at `/pulp/api/v3/docs/api.json` for the exact
`operationId`. Names may differ slightly from the generated client method names.

**Q: VCR cassettes don't match after migration.**
A: The HTTP requests should be identical since the underlying URLs and methods
haven't changed. If you changed request body format (e.g., from model `.to_json`
to a plain Hash), you may need to re-record the cassette with `mode=all`.

**Q: How do I pass path parameters?**
A: Include them in the `params` hash. The Connection automatically routes
parameters to path vs query based on the OpenAPI spec definition.
```ruby
conn.call('repositories_rpm_rpm_delete',
  params: { rpm_rpm_repository_href: '/pulp/api/v3/repositories/rpm/rpm/UUID/' })
```
