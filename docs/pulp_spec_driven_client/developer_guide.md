# Developer Guide: Pulp Spec-Driven Client

## Quick Start

All Pulp API calls in Katello go through the spec-driven client. Here is the basic pattern:

```ruby
# Get a connection (usually via an API wrapper)
connection = Katello::PulpClient::Connection.new(smart_proxy)

# Make an API call using the operation_id
response = connection.call("repositories_rpm_rpm_list",
  params: { limit: 10, offset: 0 })

# Access response fields
response.results.each do |repo|
  puts repo.name
  puts repo.pulp_href
end
```

In practice, you rarely create a `Connection` directly. The API wrapper classes (`Katello::Pulp3::Api::Core` and subclasses) manage connections for you.

## Understanding the Layers

When working on Katello's Pulp integration, you'll encounter three layers:

### 1. Dynflow Actions (`app/lib/actions/pulp3/`)

Orchestrate async workflows. They call repository service methods:

```ruby
# app/lib/actions/pulp3/repository/sync.rb
def invoke_external_task
  repo = ::Katello::Repository.find(input[:repo_id])
  output[:pulp_tasks] = repo.backend_service(smart_proxy).sync(input[:options])
end
```

You typically don't touch Pulp API details here.

### 2. Repository Services (`app/services/katello/pulp3/repository/`)

Contain business logic for each content type. They use the API wrappers:

```ruby
# app/services/katello/pulp3/repository/yum.rb
def sync(options = {})
  repository_sync_url_data = { remote: repo.remote_href, mirror: true }
  [api.repositories_api_sync(repository_reference.repository_href, repository_sync_url_data)]
end
```

### 3. API Wrappers (`app/services/katello/pulp3/api/`)

Thin wrappers that map method names to `operation_id` calls:

```ruby
# app/services/katello/pulp3/api/core.rb
def pulp_connection
  @pulp_connection ||= Katello::PulpClient::Connection.new(smart_proxy)
end
```

## Finding Operation IDs

Operation IDs are the keys to the Pulp API. Every API endpoint has one.

### Method 1: Pulp API Documentation

Visit `https://<your-pulp-server>/pulp/api/v3/docs/` in a browser. Each endpoint shows its operation ID.

### Method 2: Query the Spec Directly

```bash
# Fetch all operation IDs
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq -r '.paths[][] | select(.operationId) | .operationId' | sort

# Search for a specific operation
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq '.paths[][] | select(.operationId | contains("rpm_sync"))'
```

### Method 3: Rails Console

```ruby
proxy = SmartProxy.pulp_primary
conn = Katello::PulpClient::Connection.new(proxy)
# After first call, the spec is loaded:
conn.spec_index.operations.keys.grep(/rpm/).sort
```

### Method 4: Reference Documentation

See [Operation ID Mapping](operation_ids.md) for a categorized list.

## Common Patterns

### Listing Resources with Pagination

Pulp uses offset/limit pagination. The `fetch_from_list` helper handles this:

```ruby
def list_all(options = {})
  self.class.fetch_from_list do |page_opts|
    pulp_connection.call("repositories_rpm_rpm_list",
      params: page_opts.merge(options))
  end
end
```

### Creating a Resource

```ruby
response = pulp_connection.call("repositories_rpm_rpm_create",
  body: { name: "my-repo", retain_package_versions: 0 })
response.pulp_href  # => "/pulp/api/v3/repositories/rpm/rpm/uuid/"
```

### Reading a Resource

```ruby
response = pulp_connection.call("repositories_rpm_rpm_read",
  params: { rpm_rpm_repository_href: href })
response.name  # => "my-repo"
```

### Updating a Resource (Partial)

```ruby
pulp_connection.call("repositories_rpm_rpm_partial_update",
  params: { rpm_rpm_repository_href: href },
  body: { retain_package_versions: 5 })
```

### Deleting a Resource

```ruby
pulp_connection.call("repositories_rpm_rpm_delete",
  params: { rpm_rpm_repository_href: href })
```

### Triggering an Async Operation

Many Pulp operations return a task:

```ruby
response = pulp_connection.call("repositories_rpm_rpm_sync",
  params: { rpm_rpm_repository_href: repo_href },
  body: { remote: remote_href, mirror: true })
response.task  # => "/pulp/api/v3/tasks/uuid/"
```

### Handling 404s

```ruby
def ignore_404_exception
  yield
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 404
  nil
end

ignore_404_exception { pulp_connection.call("remotes_rpm_rpm_delete", params: { ... }) }
```

### Handling 409s (Conflict)

```ruby
def self.ignore_409_exception
  yield
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 409
  nil
end
```

## Working with Responses

### The Response is Permissive

The `Response` wrapper returns `nil` for any missing field. This is intentional -- it eliminates the need for monkey patches when Pulp adds or removes fields between versions.

```ruby
response.some_field_that_exists      # => "value"
response.some_field_that_doesnt      # => nil (no error!)
response.deeply.nested.field         # => nil (no error, even if .deeply is nil)
```

### Nested Objects

Nested hashes are wrapped automatically:

```ruby
task = pulp_connection.call("tasks_read", params: { task_href: href })
task.state                           # => "completed"
task.progress_reports                 # => [Response, ...]
task.progress_reports.first.message  # => "Downloading..."
```

### Pagination

```ruby
response = pulp_connection.call("repositories_rpm_rpm_list",
  params: { limit: 10 })
response.count     # => 42
response.results   # => [Response, Response, ...]
```

## Adding a New API Call

When you need to call a Pulp API endpoint that isn't currently used in Katello:

1. **Find the operation_id** using one of the methods above
2. **Identify the parameters** from the spec (path params vs. query params vs. body)
3. **Add a method** to the appropriate API wrapper class
4. **Call it** from a repository service or Dynflow action

Example -- adding support for listing RPM content:

```ruby
# In app/services/katello/pulp3/api/yum.rb
def content_packages_list(options = {})
  pulp_connection.call("content_rpm_packages_list", params: options)
end
```

## Version-Specific Features

Use the Capabilities module to check for features before using them:

```ruby
if Quirks::Capabilities.reclaim_space_supported?(pulp_connection.spec_index)
  pulp_connection.call("repositories_reclaim_space_reclaim", body: { ... })
end
```

## Debugging

### Inspect the Raw Response

```ruby
response = pulp_connection.call("some_operation", params: { ... })
response.http_status   # => 200
response.raw_body      # => {"pulp_href" => "...", ...}
response.http_headers  # => {"Content-Type" => "..."}
```

### Enable Faraday Logging

The connection respects the `katello/pulp_rest` logger:

```ruby
# In config or console
::Foreman::Logging.logger('katello/pulp_rest').level = :debug
```

### Inspect Available Operations

```ruby
conn = Katello::PulpClient::Connection.new(SmartProxy.pulp_primary)
# Trigger spec load
conn.call("status_read")

# Browse operations
conn.spec_index.operations.keys.sort
conn.spec_index.lookup("repositories_rpm_rpm_sync")
```

## Related Documentation

- [Architecture Overview](architecture.md) - System design and component roles
- [API Reference](api_reference.md) - Detailed API for Connection, Response, etc.
- [Operation ID Mapping](operation_ids.md) - Full list of operation IDs
- [Testing Guide](testing_guide.md) - How to write and run tests
- [Troubleshooting](troubleshooting.md) - Common errors and solutions
