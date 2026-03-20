# frozen_string_literal: true

# Tests for the TestPulpClientHelper itself - validates spec caching behavior.

require 'katello_test_helper'

module Katello
  module Service
    module PulpClient
      class TestPulpClientHelperTest < ActiveSupport::TestCase
        def test_cached_spec_returns_hash
          spec = TestPulpClientHelper.cached_spec
          assert spec.is_a?(Hash), "cached_spec should return a Hash"
          assert spec.key?('openapi') || spec.key?('info'),
            "cached_spec should have OpenAPI structure"
        end

        def test_cached_spec_has_info
          spec = TestPulpClientHelper.cached_spec
          assert spec['info'].is_a?(Hash), "spec should have info section"
        end

        def test_cached_spec_has_plugin_versions
          spec = TestPulpClientHelper.cached_spec
          versions = spec.dig('info', 'x-pulp-app-versions')
          assert versions.is_a?(Hash), "spec should have plugin versions"
          assert versions.key?('core'), "should have core version"
        end

        def test_pulp_connection_returns_connection
          proxy = SmartProxy.pulp_primary
          conn = TestPulpClientHelper.pulp_connection(proxy)
          assert conn.is_a?(Katello::PulpClient::Connection)
        end

        def test_pulp_connection_uses_cached_spec
          proxy = SmartProxy.pulp_primary
          conn = TestPulpClientHelper.pulp_connection(proxy)
          # Should not need to fetch the spec from the network
          assert conn.spec_index.is_a?(Katello::PulpClient::SpecIndex)
        end

        def test_setup_is_idempotent
          # Calling setup multiple times should not re-fetch
          TestPulpClientHelper.setup
          spec1 = TestPulpClientHelper.cached_spec
          TestPulpClientHelper.setup
          spec2 = TestPulpClientHelper.cached_spec
          assert_equal spec1.object_id, spec2.object_id,
            "Repeated setup should return the same cached object"
        end
      end
    end
  end
end
