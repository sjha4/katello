# Troubleshooting Guide

## Common Errors

### "Unknown operation_id: xxx"

**Symptom:** `Katello::PulpClient::ApiError` with a message about an unknown operation ID.

**Causes:**
1. **Typo in operation ID** -- Check the spelling. Use `connection.spec_index.operations.keys.grep(/keyword/)` to search.
2. **Plugin not installed** -- The Pulp instance doesn't have the required plugin. Check `connection.spec_index.plugin_versions`.
3. **Operation renamed in Pulp upgrade** -- Compare the old and new specs (see [Upgrade Procedure](upgrade_procedure.md)).

**Fix:**
```ruby
# In Rails console, find the correct operation ID:
conn = Katello::PulpClient::Connection.new(SmartProxy.pulp_primary)
conn.spec_index.operations.keys.grep(/rpm/).grep(/sync/)
# => ["repositories_rpm_rpm_sync"]
```

### HTTP 400 Bad Request

**Symptom:** `ApiError` with status 400.

**Causes:**
1. **Missing required parameter** -- Check the spec for required path/query/body parameters.
2. **Wrong parameter location** -- A path parameter was passed in the body or vice versa.
3. **Invalid parameter value** -- Pulp rejected a value (check the response body for details).

**Debug:**
```ruby
begin
  connection.call("some_operation", params: { ... }, body: { ... })
rescue Katello::PulpClient::ApiError => e
  puts e.body  # Pulp's error message with field-level details
end
```

### HTTP 404 Not Found

**Symptom:** `ApiError` with status 404.

**Causes:**
1. **Invalid href** -- The resource doesn't exist in Pulp (deleted, wrong ID).
2. **Wrong path parameter name** -- The param key doesn't match what the spec expects.

**Pattern for safe 404 handling:**
```ruby
def ignore_404_exception
  yield
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 404
  nil
end
```

### HTTP 409 Conflict

**Symptom:** `ApiError` with status 409.

**Cause:** Resource already exists or is in use.

**Pattern:**
```ruby
def self.ignore_409_exception
  yield
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 409
  nil
end
```

### Response Field Returns Nil Unexpectedly

**Symptom:** `response.some_field` returns nil when you expect a value.

**Causes:**
1. **Field name mismatch** -- The JSON field name differs from what you're calling. Check `response.raw_body` to see actual field names.
2. **Field removed in Pulp upgrade** -- The field no longer exists in the response.
3. **Field is in nested object** -- You may need `response.nested_object.field` instead of `response.field`.

**Debug:**
```ruby
response = connection.call("some_operation", params: { ... })
puts response.raw_body.inspect  # See all actual fields
puts response.raw_body.keys     # List top-level field names
```

### Spec Fetch Failure

**Symptom:** Error when the connection first tries to load the OpenAPI spec.

**Causes:**
1. **Pulp is down** -- Check that the Pulp service is running.
2. **Network issue** -- DNS, firewall, or proxy blocking the request.
3. **SSL certificate issue** -- Expired or mismatched certificates.
4. **Authentication failure** -- Wrong username/password in SmartProxy settings.

**Debug:**
```bash
# Test manually:
curl -v -u admin:password \
  --cacert /etc/pki/katello/certs/katello-server-ca.crt \
  https://<pulp-host>/pulp/api/v3/docs/api.json | head -100

# Check SmartProxy config:
rails console
> sp = SmartProxy.pulp_primary
> sp.pulp3_url
> sp.setting('Pulpcore', 'pulp_url')
```

### Slow First API Call

**Symptom:** The first Pulp API call in a request is noticeably slower.

**Cause:** The OpenAPI spec (~1-2MB JSON) is fetched and parsed on first use.

**Expected behavior:** ~100ms for fetch + parse. Subsequent calls use the cached index.

**If it's significantly slower:**
1. Check network latency to the Pulp server
2. Check if the spec response is unusually large
3. The connection caches the spec in memory -- ensure connections aren't being recreated unnecessarily

### Async Task Not Returned

**Symptom:** Expected a task href but got a different response.

**Cause:** Some operations return the resource directly (200/201) instead of a task (202) depending on the Pulp version or whether changes were actually needed.

**Fix:** Use `ResponseQuirks.extract_task(response)` which handles both cases, or check `response.task` (returns nil if not present).

## Debugging Techniques

### Inspect the Spec Index

```ruby
conn = Katello::PulpClient::Connection.new(SmartProxy.pulp_primary)

# List all operations for a plugin
conn.spec_index.operations.keys.grep(/rpm/).sort

# Look up a specific operation
conn.spec_index.lookup("repositories_rpm_rpm_sync")
# => { method: "post", path: "...", path_params: [...], query_params: [...] }

# Check installed plugin versions
conn.spec_index.plugin_versions
# => {"core"=>"3.85.0", "rpm"=>"3.32.3", ...}
```

### Enable HTTP Logging

```ruby
# In Rails console or config:
::Foreman::Logging.logger('katello/pulp_rest').level = :debug
```

This logs all HTTP requests and responses made by the Faraday client.

### Inspect Raw Response

```ruby
response = conn.call("some_operation", params: { ... })
puts "Status: #{response.http_status}"
puts "Headers: #{response.http_headers}"
puts "Body: #{JSON.pretty_generate(response.raw_body)}"
```

### Compare with Direct curl

```bash
# Make the same request manually to verify:
curl -v -u admin:password \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"remote": "/pulp/api/v3/remotes/rpm/rpm/uuid/"}' \
  https://<pulp-host>/pulp/api/v3/repositories/rpm/rpm/<uuid>/sync/
```

### Check Available Operations

```ruby
# In Rails console:
conn = Katello::PulpClient::Connection.new(SmartProxy.pulp_primary)

# Search by keyword
conn.spec_index.operations.keys.grep(/content/).grep(/rpm/).sort

# Check if a specific operation exists
conn.spec_index.operation?("repositories_rpm_rpm_sync")

# Get full details
op = conn.spec_index.lookup("repositories_rpm_rpm_sync")
puts "Method: #{op[:method]}"
puts "Path: #{op[:path]}"
puts "Path params: #{op[:path_params]}"
puts "Query params: #{op[:query_params]}"
```

## Getting Help

- Check the [Developer Guide](developer_guide.md) for usage patterns
- Check the [API Reference](api_reference.md) for method signatures
- Check the [Quirks System](quirks_system.md) if you suspect a Pulp version issue
- Check the [Upgrade Procedure](upgrade_procedure.md) if the problem appeared after a Pulp upgrade
- File issues at the Katello project tracker
