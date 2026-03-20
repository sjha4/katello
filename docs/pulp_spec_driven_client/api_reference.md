# PulpClient API Reference

## Katello::PulpClient::Connection

The main HTTP client for communicating with Pulp.

### Constructor

```ruby
connection = Katello::PulpClient::Connection.new(smart_proxy)
```

**Parameters:**
- `smart_proxy` - A `SmartProxy` instance with the `Pulpcore` feature enabled

The connection lazily fetches and caches the OpenAPI spec on first use. SSL certificates and authentication are configured automatically from the SmartProxy's settings.

### `call(operation_id, params: {}, body: nil)`

Execute a Pulp API operation.

```ruby
response = connection.call(
  "repositories_rpm_rpm_sync",
  params: { rpm_rpm_repository_href: repo_href },
  body: { remote: remote_href, mirror: true }
)
```

**Parameters:**
- `operation_id` (String) - The OpenAPI operation ID (see [Operation ID Mapping](operation_ids.md))
- `params:` (Hash) - Path and query parameters. Path parameters are substituted into the URL template; remaining params become query string parameters.
- `body:` (Hash, nil) - Request body, serialized as JSON. Pass `nil` for GET/DELETE requests.

**Returns:** `Katello::PulpClient::Response`

**Raises:** `Katello::PulpClient::ApiError` for non-2xx HTTP responses

### `spec_index`

Access the parsed OpenAPI spec index.

```ruby
connection.spec_index.plugin_versions
# => {"core"=>"3.85.0", "rpm"=>"3.32.3", ...}

connection.spec_index.operation?("repositories_rpm_rpm_sync")
# => true
```

**Returns:** `Katello::PulpClient::SpecIndex`

---

## Katello::PulpClient::Response

Permissive wrapper around Pulp API responses.

### Field Access

Access JSON fields as methods or Hash keys. Returns `nil` for missing fields.

```ruby
response = connection.call("repositories_rpm_rpm_read",
  params: { rpm_rpm_repository_href: href })

response.pulp_href      # => "/pulp/api/v3/repositories/rpm/rpm/abc123/"
response.name            # => "my-repo"
response.nonexistent     # => nil (no error)
response['pulp_href']    # => same as above, Hash-style access
```

### Pagination

```ruby
response = connection.call("repositories_rpm_rpm_list",
  params: { limit: 10, offset: 0 })

response.count    # => 42 (total count from Pulp)
response.results  # => [Response, Response, ...] (wrapped result objects)
response.results.first.name  # => "repo-1"
```

### Raw Data

```ruby
response.http_status   # => 200
response.http_headers  # => {"Content-Type" => "application/json", ...}
response.raw_body      # => parsed JSON (Hash or Array)
response.to_h          # => Hash representation
```

### Nested Objects

Nested hashes are automatically wrapped as `Response` objects:

```ruby
response = connection.call("tasks_read", params: { task_href: href })
response.progress_reports.first.message  # => "Downloading artifacts"
```

---

## Katello::PulpClient::ApiError

Unified error class for all Pulp API failures.

### Attributes

```ruby
begin
  connection.call("nonexistent_operation")
rescue Katello::PulpClient::ApiError => e
  e.message       # => "Pulp API error (nonexistent_operation) HTTP 404 - ..."
  e.status        # => 404
  e.code          # => 404 (alias for status, backward compatible)
  e.body          # => {"detail" => "Not found."}
  e.operation_id  # => "nonexistent_operation"
end
```

### Catching Errors

```ruby
# Catch all Pulp errors
rescue Katello::PulpClient::ApiError => e

# Check for specific HTTP status
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 404  # ignore 404s
```

---

## Katello::PulpClient::SpecIndex

Parsed OpenAPI specification with O(1) operation lookup.

### `lookup(operation_id)`

```ruby
spec_index.lookup("repositories_rpm_rpm_sync")
# => {
#   method: "post",
#   path: "/pulp/api/v3/repositories/rpm/rpm/{rpm_rpm_repository_href}sync/",
#   path_params: ["rpm_rpm_repository_href"],
#   query_params: []
# }
```

**Returns:** Hash with operation details, or `nil` if not found

### `operation?(operation_id)`

```ruby
spec_index.operation?("repositories_rpm_rpm_sync")  # => true
spec_index.operation?("fake_operation")              # => false
```

### `plugin_versions`

```ruby
spec_index.plugin_versions
# => {
#   "core" => "3.85.0",
#   "rpm" => "3.32.3",
#   "file" => "3.1.0",
#   "container" => "2.24.0",
#   ...
# }
```

---

## Katello::PulpClient::Quirks::Capabilities

Version-aware feature gates.

```ruby
# Check plugin version
Capabilities.plugin_version_gte?(spec_index, 'core', '3.23')
# => true/false

# Check if an operation exists in the spec
Capabilities.operation_available?(spec_index, 'repositories_reclaim_space_reclaim')
# => true/false

# Named capability checks
Capabilities.domains_supported?(spec_index)        # core >= 3.23
Capabilities.reclaim_space_supported?(spec_index)   # operation exists
```

---

## Katello::PulpClient::Quirks::SpecQuirks

Applied automatically during spec parsing. Mutates the spec hash to fix known issues.

```ruby
# Called internally by Connection during spec load:
SpecQuirks.apply!(spec_hash)
```

Current fixes:
- `fix_rpm_gpgcheck_enum`: Removes incorrect enum constraints on `gpgcheck` and `repo_gpgcheck` fields in RPM repository schemas

---

## Katello::PulpClient::Quirks::ResponseQuirks

Normalizes behavioral differences in Pulp responses.

```ruby
ResponseQuirks.normalize_delete_response(response)
ResponseQuirks.extract_task(response)
```

## Related Documentation

- [Architecture Overview](architecture.md) - How all components fit together
- [Developer Guide](developer_guide.md) - Day-to-day usage patterns
- [Operation ID Mapping](operation_ids.md) - Finding the right operation_id
