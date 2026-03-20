# frozen_string_literal: true

require 'json'

module TestPulpClientHelper
  SPEC_CASSETTE_DIR = "#{Katello::Engine.root}/test/fixtures/vcr_cassettes/shared"
  SPEC_CASSETTE_FILE = "#{SPEC_CASSETTE_DIR}/pulp_openapi_spec.yml"
  SPEC_CACHE_FILE = "#{SPEC_CASSETTE_DIR}/pulp_openapi_spec_cache.json"

  @cached_spec = nil
  @mutex = Mutex.new

  # Call once during test suite initialization (e.g. in katello_test_helper.rb).
  # Records the OpenAPI spec fetch into a shared VCR cassette so it's only
  # fetched once for the entire suite, then caches the parsed result in memory.
  def self.setup
    ensure_cassette_dir
    return if @cached_spec

    @mutex.synchronize do
      return if @cached_spec
      @cached_spec = load_or_record_spec
    end
  end

  # Returns a cached OpenAPI spec hash suitable for passing to
  # Katello::PulpClient::Connection.new(smart_proxy, spec: cached_spec).
  def self.cached_spec
    setup unless @cached_spec
    @cached_spec
  end

  # Returns a Connection wired to the given smart_proxy with a cached spec,
  # avoiding repeated spec fetches during tests.
  def self.pulp_connection(smart_proxy)
    Katello::PulpClient::Connection.new(smart_proxy, spec: cached_spec)
  end

  # Reset the cached spec (useful if you need to force a re-fetch in tests).
  def self.reset!
    @mutex.synchronize { @cached_spec = nil }
  end

  class << self
    private

    def ensure_cassette_dir
      FileUtils.mkdir_p(SPEC_CASSETTE_DIR) unless File.directory?(SPEC_CASSETTE_DIR)
    end

    def load_or_record_spec
      # In non-recording mode, load from the cached JSON file if available
      if !recording_mode? && File.exist?(SPEC_CACHE_FILE)
        return JSON.parse(File.read(SPEC_CACHE_FILE))
      end

      # In recording mode or first run, use VCR to record the spec fetch
      if recording_mode?
        spec = record_spec_via_vcr
        # Save a compact JSON cache alongside the VCR cassette
        File.write(SPEC_CACHE_FILE, spec.to_json)
        spec
      else
        # Non-recording mode without cache: use a minimal stub spec
        minimal_stub_spec
      end
    end

    def record_spec_via_vcr
      smart_proxy = SmartProxy.pulp_primary
      VCR.use_cassette('shared/pulp_openapi_spec',
                       record: :new_episodes,
                       match_requests_on: [:method, :path]) do
        Katello::PulpClient::Connection.fetch_spec(smart_proxy)
      end
    end

    def recording_mode?
      %w[all new_episodes].include?(ENV['mode'])
    end

    # Provide a minimal spec so tests that don't actually hit Pulp
    # can still instantiate a Connection without network access.
    def minimal_stub_spec
      {
        'openapi' => '3.0.3',
        'info' => {
          'title' => 'Pulp 3 API (stub)',
          'version' => 'v3',
          'x-pulp-app-versions' => {
            'core' => '3.85.0',
            'rpm' => '3.32.0',
            'file' => '3.85.0',
            'container' => '2.26.0',
            'deb' => '3.8.0',
            'ansible' => '0.28.0',
            'certguard' => '3.85.0',
            'python' => '3.19.0',
            'ostree' => '2.5.0',
          },
        },
        'paths' => {},
      }
    end
  end
end
