# Pulp Generated Clients Troubleshooting Guide

This guide covers common issues encountered when working with vendored Pulp API clients in Katello.

## Architecture Overview

Katello vendors Pulp API clients as generated Ruby code under `app/lib/katello/pulp3/generated_clients/`. These replace the external `pulpcore_client`, `pulp_rpm_client`, and similar gems. The clients are generated from OpenAPI specifications stored in `vendor/pulp/specs/`.

## Common Issues

### 1. NameError: uninitialized constant PulpcoreClient

**Symptom:**
```
NameError: uninitialized constant PulpcoreClient
```

**Cause:** The generated client code is not being loaded by Rails autoloading.

**Solution:**
- Verify the generated client directories exist under `app/lib/katello/pulp3/generated_clients/`.
- Check that the Katello engine initializer is configured to add the generated client paths to the autoload paths.
- Run `bundle exec rake katello:pulp:generate_clients` if the directories are missing.

### 2. NoMethodError on Pulp API Objects

**Symptom:**
```
NoMethodError: undefined method 'new_api_method' for PulpRpmClient::RepositoriesRpmApi
```

**Cause:** The generated client version does not match the Pulp server version. The server has a newer API that the generated client does not include.

**Solution:**
- Regenerate clients from the running Pulp instance. See the [update workflow](./pulp_client_update_workflow.md).
- Verify the Pulp instance version matches what you expect:
  ```bash
  curl -k https://your-pulp-instance/pulp/api/v3/status/ | python3 -m json.tool
  ```

### 3. Monkey Patch Errors After Client Update

**Symptom:** Errors in files under `lib/monkeys/` after regenerating clients, such as:
```
TypeError: superclass mismatch for class SomeClass
```
or
```
NameError: undefined method 'patched_method' for class
```

**Cause:** Monkey patches reference specific class structures or methods that changed in the new client version.

**Solution:**

Review and update each monkey patch file:

| File | Purpose | What to check |
|---|---|---|
| `lib/monkeys/pulp_polymorphic_remote_response.rb` | Handles polymorphic remote type deserialization | Verify remote class names and `openapi_one_of` definitions match |
| `lib/monkeys/fix_rpm_repository_gpgcheck.rb` | Patches RPM repository gpgcheck attribute | Verify the attribute still exists and has the same name |
| `lib/monkeys/remove_hidden_distribution.rb` | Removes hidden field from distribution models | Verify the distribution classes and attribute names |

### 4. API Version Mismatch (409 or 400 Errors)

**Symptom:** HTTP 409 Conflict or 400 Bad Request errors when Katello communicates with Pulp.

**Cause:** The generated client sends request bodies or parameters that the Pulp server does not expect (or vice versa).

**Solution:**
- Compare the spec version in `vendor/pulp/specs/` with the running Pulp server version.
- Refetch specs and regenerate clients from the correct Pulp instance.
- Check the Pulp server logs (`/var/log/pulp/` or `journalctl -u pulpcore*`) for detailed error messages.

### 5. Client Generation Fails

**Symptom:** The `katello:pulp:generate_clients` rake task fails.

**Common causes and solutions:**

**a) openapi-generator not installed:**
```
Error: openapi-generator-cli: command not found
```
Install it:
```bash
npm install -g @openapitools/openapi-generator-cli
# or
brew install openapi-generator
```

**b) Invalid OpenAPI spec:**
```
Error: Unable to parse spec
```
Check if the fetched spec is valid JSON:
```bash
python3 -m json.tool vendor/pulp/specs/pulpcore.json
```
Re-fetch the spec from a healthy Pulp instance.

**c) Java not installed** (openapi-generator requires Java):
```
Error: JAVA_HOME not set
```
Install Java 11+:
```bash
sudo dnf install java-11-openjdk
```

### 6. Faraday Version Conflicts

**Symptom:**
```
Bundler could not find compatible versions for gem "faraday"
```

**Cause:** The generated clients may declare faraday dependencies that conflict with Katello's pinned version.

**Solution:**
- Katello pins faraday to `>= 1.10.2, < 1.11.0` for compatibility with `foreman_azure_rm`.
- If generated client gemspecs declare incompatible faraday versions, the vendored clients should have their internal dependency declarations adjusted or removed since they are loaded directly, not as gems.

### 7. Missing Content Type Client

**Symptom:** A specific content type (e.g., Python, OSTree) fails while others work.

**Cause:** The client for that content type was not generated or the Pulp plugin was not installed on the source instance.

**Solution:**
- Check that the plugin is installed on your Pulp instance:
  ```bash
  curl -k https://your-pulp-instance/pulp/api/v3/status/ | python3 -c "
  import sys, json
  data = json.load(sys.stdin)
  for p in data['versions']:
      print(f\"{p['component']}: {p['version']}\")
  "
  ```
- Verify the spec file exists in `vendor/pulp/specs/`.
- Regenerate the specific client:
  ```bash
  bundle exec rake katello:pulp:generate_clients PLUGIN=pulp_python
  ```

### 8. Test Failures with VCR Cassettes

**Symptom:** Tests that use VCR cassettes fail after updating clients because recorded HTTP responses no longer match expected object structures.

**Solution:**
1. Delete the affected cassette files:
   ```bash
   rm test/fixtures/vcr_cassettes/katello/services/pulp3/<cassette>.yml
   ```
2. Re-run the tests against a live Pulp instance to re-record:
   ```bash
   ktest test/path/to/test_file.rb
   ```
3. Commit the updated cassettes.

### 9. SSL/TLS Certificate Errors

**Symptom:**
```
SSL_connect returned=1 errno=0 state=error: certificate verify failed
```

**Cause:** The generated client is attempting to verify the Pulp server's SSL certificate.

**Solution:**
- For development, ensure your Pulp instance's CA certificate is trusted.
- The Smart Proxy configuration in Foreman should include the proper SSL settings.
- Check `smart_proxy.pulp3_configuration` is properly setting SSL options.

## Debugging Tips

### Inspect the Generated Client Code

The generated client code is plain Ruby. You can read it directly:

```bash
ls app/lib/katello/pulp3/generated_clients/pulpcore_client/lib/pulpcore_client/
```

Key files in each client:
- `api/` -- API endpoint wrapper classes
- `models/` -- Request/response model classes
- `api_client.rb` -- HTTP client configuration
- `configuration.rb` -- Client configuration (base URL, auth, SSL)

### Enable HTTP Debug Logging

To see the raw HTTP requests the client makes:

```ruby
# In Rails console
config = PulpcoreClient::Configuration.new
config.debugging = true
client = PulpcoreClient::ApiClient.new(config)
```

### Compare Specs Between Versions

To understand what changed between Pulp versions:

```bash
# Diff the old and new specs
diff <(python3 -m json.tool vendor/pulp/specs/pulpcore.json.old) \
     <(python3 -m json.tool vendor/pulp/specs/pulpcore.json)
```

### Check Client Module Classes at Runtime

```ruby
# In Rails console
PulpcoreClient.constants.select { |c| PulpcoreClient.const_get(c).is_a?(Class) }
PulpRpmClient::RepositoriesRpmApi.instance_methods(false)
```

## Getting Help

- [Katello Development Forum](https://community.theforeman.org/)
- [Pulp Documentation](https://docs.pulpproject.org/)
- [Pulp Client Update Workflow](./pulp_client_update_workflow.md)
- [Katello Developer Matrix Channel](https://matrix.to/#/#theforeman-dev:matrix.org)
