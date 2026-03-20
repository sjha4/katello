# Migration Guide: From Generated Clients to Spec-Driven Client

This guide covers how code was migrated from the generated Pulp client gems to the spec-driven client. Use it as a reference when updating any remaining code or understanding the changes.

## Overview of Changes

### What Was Removed

- **9 Pulp client gems** from the Gemfile:
  - `pulpcore_client`
  - `pulp_rpm_client`
  - `pulp_file_client`
  - `pulp_container_client`
  - `pulp_deb_client`
  - `pulp_ansible_client`
  - `pulp_python_client`
  - `pulp_ostree_client`
  - `pulp_certguard_client`

- **3 monkey patch files**:
  - `lib/monkeys/fix_rpm_repository_gpgcheck.rb` - Fixed nil gpgcheck handling
  - `lib/monkeys/remove_hidden_distribution.rb` - Fixed hidden field defaults in 7 distribution classes
  - `lib/monkeys/pulp_polymorphic_remote_response.rb` - Fixed Remote update return types

- **Generated client code** in `lib/pulp_generated_clients/`

### What Was Added

- `lib/katello/pulp_client/` - ~350 lines total (see [Architecture](architecture.md))

## Migration Patterns

### Pattern 1: API Client Initialization

**Before:**
```ruby
def api_client
  config = smart_proxy.pulp3_configuration(PulpRpmClient::Configuration)
  config.params_encoder = Faraday::FlatParamsEncoder
  PulpRpmClient::ApiClient.new(config)
end
```

**After:**
```ruby
def pulp_connection
  @pulp_connection ||= Katello::PulpClient::Connection.new(smart_proxy)
end
```

The Connection handles all configuration (SSL, auth, encoders) internally.

### Pattern 2: API Class Instantiation

**Before:**
```ruby
def repositories_api
  PulpRpmClient::RepositoriesRpmApi.new(api_client)
end

def remotes_api
  PulpRpmClient::RemotesRpmApi.new(api_client)
end

# ... separate API class per resource type
```

**After:**

No separate API objects needed. All operations go through `pulp_connection.call()`.

### Pattern 3: CRUD Operations

**Before (list):**
```ruby
repositories_api.list(limit: 10, offset: 0)
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_list",
  params: { limit: 10, offset: 0 })
```

**Before (create):**
```ruby
repo_data = PulpRpmClient::RpmRpmRepository.new(name: "test")
repositories_api.create(repo_data)
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_create",
  body: { name: "test" })
```

**Before (read):**
```ruby
repositories_api.read(href)
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_read",
  params: { rpm_rpm_repository_href: href })
```

**Before (partial update):**
```ruby
repositories_api.partial_update(href, { name: "new-name" })
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_partial_update",
  params: { rpm_rpm_repository_href: href },
  body: { name: "new-name" })
```

**Before (delete):**
```ruby
repositories_api.delete(href)
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_delete",
  params: { rpm_rpm_repository_href: href })
```

### Pattern 4: Sync Operations

**Before:**
```ruby
sync_data = PulpRpmClient::RpmRepositorySyncURL.new(
  remote: remote_href, mirror: true)
repositories_api.sync(repo_href, sync_data)
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_sync",
  params: { rpm_rpm_repository_href: repo_href },
  body: { remote: remote_href, mirror: true })
```

### Pattern 5: Data Model Classes

**Before:**
```ruby
data = PulpRpmClient::RepositoryAddRemoveContent.new(
  remove_content_units: ['*'])
repositories_api.modify(repo_href, data)
```

**After:**
```ruby
pulp_connection.call("repositories_rpm_rpm_modify",
  params: { rpm_rpm_repository_href: repo_href },
  body: { remove_content_units: ['*'] })
```

Data model classes are no longer needed. Pass plain Hashes as the body.

### Pattern 6: Error Handling

**Before:**
```ruby
rescue PulpRpmClient::ApiError => e
  raise e unless e.code == 404
end

rescue PulpcoreClient::ApiError => e
  # Different class for core API errors!
end
```

**After:**
```ruby
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 404
end
# Same class for ALL Pulp errors
```

### Pattern 7: Response Field Access

**Before:**
```ruby
response = repositories_api.read(href)
response.pulp_href  # Works -- typed attribute
response.name       # Works -- typed attribute
# response.new_field  # Would raise NoMethodError if field not in generated code!
```

**After:**
```ruby
response = pulp_connection.call("repositories_rpm_rpm_read",
  params: { rpm_rpm_repository_href: href })
response.pulp_href  # Works -- method_missing
response.name       # Works -- method_missing
response.new_field  # Returns nil -- no error!
```

### Pattern 8: Client Module References

**Before:**
```ruby
def client_module
  PulpRpmClient
end

def api_exception_class
  client_module::ApiError
end
```

**After:**
```ruby
# api_exception_class is now always:
Katello::PulpClient::ApiError
```

### Pattern 9: Configuration Classes

**Before:**
```ruby
# In repository type registration:
client_module_class PulpRpmClient
api_class PulpRpmClient::ApiClient
configuration_class PulpRpmClient::Configuration
```

**After:**
```ruby
# Most of these registrations are no longer needed.
# The connection handles all configuration internally.
pulp3_plugin 'rpm'
```

### Pattern 10: Remote Type Selection (YUM-specific)

**Before:**
```ruby
def get_remotes_api(href: nil, url: nil)
  if href&.start_with?('/pulp/api/v3/remotes/rpm/uln/') || url&.start_with?('uln')
    PulpRpmClient::RemotesUlnApi.new(api_client)
  else
    PulpRpmClient::RemotesRpmApi.new(api_client)
  end
end

# Usage:
get_remotes_api(href: href).partial_update(href, options)
```

**After:**
```ruby
def get_remote_operation_prefix(href: nil, url: nil)
  if href&.start_with?('/pulp/api/v3/remotes/rpm/uln/') || url&.start_with?('uln')
    "remotes_rpm_uln"
  else
    "remotes_rpm_rpm"
  end
end

# Usage:
prefix = get_remote_operation_prefix(href: href)
pulp_connection.call("#{prefix}_partial_update",
  params: { rpm_rpm_remote_href: href },
  body: options)
```

## Operation ID Naming Convention

Operation IDs follow a predictable pattern:

```
{resource}_{plugin}_{type}_{action}
```

Examples:
- `repositories_rpm_rpm_list` - List RPM repositories
- `repositories_rpm_rpm_create` - Create RPM repository
- `repositories_rpm_rpm_sync` - Sync RPM repository
- `remotes_rpm_rpm_read` - Read RPM remote
- `distributions_rpm_rpm_delete` - Delete RPM distribution
- `content_rpm_packages_list` - List RPM packages

See [Operation ID Mapping](operation_ids.md) for the complete reference.

## Common Migration Issues

### Issue: `NoMethodError` on Response

**Symptom:** Code expects a typed response object with specific method names.

**Fix:** The new `Response` wrapper uses `method_missing`, so most field accesses work identically. If the old code called a method that doesn't correspond to a JSON field name (e.g., a computed method on the generated class), you'll need to compute it yourself.

### Issue: Data Model Constructor

**Symptom:** Code creates data model instances like `PulpRpmClient::Copy.new(...)`.

**Fix:** Replace with a plain Hash. The `body:` parameter accepts Hashes directly.

### Issue: Multiple Error Classes in Rescue

**Symptom:** Code rescues `PulpRpmClient::ApiError` or `client_module::ApiError`.

**Fix:** Replace all with `Katello::PulpClient::ApiError`.

### Issue: `config.params_encoder`

**Symptom:** Code sets `Faraday::FlatParamsEncoder` on the configuration.

**Fix:** The Connection handles this internally.

## Related Documentation

- [Architecture Overview](architecture.md) - Understanding the new design
- [API Reference](api_reference.md) - Complete API documentation
- [Testing Guide](testing_guide.md) - Updating tests for the new client
