# Testing Guide: Pulp Spec-Driven Client

## Test Organization

Tests related to the Pulp client live in:

```
test/
├── services/katello/pulp3/
│   ├── api/
│   │   └── client_api_test.rb         # API wrapper tests
│   ├── repository/
│   │   └── *.rb                        # Per-content-type tests
│   └── *.rb                            # Service tests
├── lib/katello/pulp_client/
│   ├── connection_test.rb              # Connection unit tests
│   ├── spec_index_test.rb             # SpecIndex unit tests
│   ├── response_test.rb              # Response unit tests
│   └── api_error_test.rb             # ApiError unit tests
└── fixtures/vcr_cassettes/
    └── shared/
        └── pulp_openapi_spec.yml      # Shared spec cassette
```

## Running Tests

```bash
# All Katello tests
cd $GITDIR/foreman
bundle exec rake test:katello

# Individual test file
cd $GITDIR/katello
ktest test/services/katello/pulp3/api/client_api_test.rb

# Specific test method
ktest test/services/katello/pulp3/api/client_api_test.rb -n test_method_name
```

## VCR and Spec Caching

The spec-driven client fetches the OpenAPI spec from Pulp on first use. In tests, this fetch is recorded in a shared VCR cassette to avoid hitting the live server:

```ruby
module TestPulpClientHelper
  mattr_accessor :spec_cache

  def self.setup
    VCR.use_cassette('shared/pulp_openapi_spec', record: :once) do
      self.spec_cache = Katello::PulpClient::Connection.load_spec(
        SmartProxy.pulp_primary)
    end
  end

  def pulp_connection(smart_proxy = SmartProxy.pulp_primary)
    Katello::PulpClient::Connection.new(smart_proxy,
      spec: TestPulpClientHelper.spec_cache)
  end
end
```

The spec is loaded once for the entire test suite and reused across all tests.

## Writing Tests

### Unit Testing PulpClient Components

Test the client components in isolation:

```ruby
class SpecIndexTest < ActiveSupport::TestCase
  def setup
    @spec_hash = {
      'info' => { 'x-pulp-app-versions' => { 'core' => '3.85.0' } },
      'paths' => {
        '/pulp/api/v3/repositories/rpm/rpm/' => {
          'get' => {
            'operationId' => 'repositories_rpm_rpm_list',
            'parameters' => [
              { 'name' => 'limit', 'in' => 'query' },
              { 'name' => 'offset', 'in' => 'query' }
            ]
          }
        }
      }
    }
    @index = Katello::PulpClient::SpecIndex.new(@spec_hash)
  end

  test "looks up operation by ID" do
    op = @index.lookup('repositories_rpm_rpm_list')
    assert_equal 'get', op[:method]
    assert_includes op[:query_params], 'limit'
  end

  test "returns nil for unknown operations" do
    assert_nil @index.lookup('nonexistent')
  end

  test "extracts plugin versions" do
    assert_equal '3.85.0', @index.plugin_versions['core']
  end
end
```

### Testing Response Wrapper

```ruby
class ResponseTest < ActiveSupport::TestCase
  def mock_response(body, status: 200)
    OpenStruct.new(status: status, headers: {}, body: body)
  end

  test "provides method access to fields" do
    response = Katello::PulpClient::Response.new(
      mock_response({ 'name' => 'test', 'pulp_href' => '/pulp/...' }))
    assert_equal 'test', response.name
    assert_equal '/pulp/...', response.pulp_href
  end

  test "returns nil for missing fields" do
    response = Katello::PulpClient::Response.new(
      mock_response({ 'name' => 'test' }))
    assert_nil response.nonexistent_field
  end

  test "wraps nested hashes" do
    response = Katello::PulpClient::Response.new(
      mock_response({ 'nested' => { 'key' => 'value' } }))
    assert_equal 'value', response.nested.key
  end

  test "handles pagination" do
    response = Katello::PulpClient::Response.new(
      mock_response({ 'count' => 2, 'results' => [
        { 'name' => 'a' }, { 'name' => 'b' }
      ]}))
    assert_equal 2, response.count
    assert_equal 'a', response.results.first.name
  end
end
```

### Testing API Wrappers

```ruby
class CoreApiTest < ActiveSupport::TestCase
  include Katello::Pulp3Support

  def setup
    @primary = SmartProxy.pulp_primary
  end

  test "sets correlation ID in header if request ID present" do
    cid = 'abc123'
    ::Logging.mdc['request'] = cid
    conn = Katello::Pulp3::Api::Core.new(@primary).pulp_connection
    # Verify header is set (implementation-specific assertion)
  end
end
```

### Testing with VCR

For integration-style tests that record actual Pulp interactions:

```ruby
class RepositorySyncTest < ActiveSupport::TestCase
  include Katello::Pulp3Support

  test "syncs an RPM repository" do
    VCR.use_cassette('pulp3/repository/rpm_sync') do
      repo = katello_repositories(:fedora_17_x86_64)
      smart_proxy = SmartProxy.pulp_primary
      tasks = repo.backend_service(smart_proxy).sync
      assert tasks.first.task  # Returns a task href
    end
  end
end
```

## Re-recording VCR Cassettes

When the Pulp API changes or you need fresh test data:

### Re-record Specific Cassettes

```bash
# Delete the old cassette
rm test/fixtures/vcr_cassettes/pulp3/repository/rpm_sync.yml

# Run the test -- VCR will record a new cassette
cd $GITDIR/katello
ktest test/services/katello/pulp3/repository/yum_test.rb -n test_sync
```

### Re-record the Shared Spec Cassette

If the Pulp version changed and you need a fresh spec:

```bash
rm test/fixtures/vcr_cassettes/shared/pulp_openapi_spec.yml

# Run any test that uses the spec -- it will re-record
cd $GITDIR/katello
ktest test/services/katello/pulp3/api/client_api_test.rb
```

### Re-record All Cassettes

```bash
# Nuclear option -- delete all cassettes
rm -rf test/fixtures/vcr_cassettes/pulp3/

# Run the full test suite to re-record
cd $GITDIR/foreman
VCR_RECORD=all bundle exec rake test:katello
```

## Debugging Test Failures

### "Operation not found" Errors

The operation ID doesn't exist in the spec. Possible causes:

1. **Typo in operation ID**: Check spelling against the spec
2. **Spec cassette is stale**: Re-record `shared/pulp_openapi_spec.yml`
3. **Plugin not installed**: The Pulp instance doesn't have the required plugin

### Response Shape Mismatch

If a test fails because `response.some_field` returns nil when you expect a value:

1. Check the VCR cassette -- does the recorded response actually contain that field?
2. Check if the field name changed in a Pulp update
3. Re-record the cassette against the current Pulp version

### Connection Errors in Tests

If tests fail with SSL or connection errors:

1. Ensure `SmartProxy.pulp_primary` is configured in test fixtures
2. Check that VCR is intercepting the request (not hitting a real server)
3. Verify the test includes `Katello::Pulp3Support`

## Test Coverage Goals

- **PulpClient module**: >90% coverage for Connection, SpecIndex, Response, ApiError
- **API wrappers**: Test each method maps to the correct operation_id
- **Repository services**: Test business logic with mocked connections
- **Dynflow actions**: Test that actions call the right service methods

## Related Documentation

- [Developer Guide](developer_guide.md) - Understanding the code layers
- [API Reference](api_reference.md) - PulpClient API documentation
- [Troubleshooting](troubleshooting.md) - More debugging tips
