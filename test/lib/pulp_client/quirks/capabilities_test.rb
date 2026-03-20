require 'test_helper'
require 'katello/pulp_client'

module Katello
  module PulpClient
    module Quirks
      class CapabilitiesTest < ActiveSupport::TestCase
        def setup
          spec_hash = {
            'info' => {
              'x-pulp-app-versions' => {
                'core' => '3.49.0',
                'rpm' => '3.25.0',
              },
            },
            'paths' => {
              '/pulp/api/v3/repositories/reclaim_space/' => {
                'post' => {
                  'operationId' => 'repositories_reclaim_space_reclaim',
                  'parameters' => [],
                },
              },
            },
          }
          @index = SpecIndex.new(spec_hash)
        end

        def test_plugin_version_gte_true
          assert Capabilities.plugin_version_gte?(@index, 'core', '3.23')
          assert Capabilities.plugin_version_gte?(@index, 'core', '3.49.0')
        end

        def test_plugin_version_gte_false
          refute Capabilities.plugin_version_gte?(@index, 'core', '3.50.0')
        end

        def test_plugin_not_installed
          refute Capabilities.plugin_version_gte?(@index, 'container', '1.0.0')
        end

        def test_operation_available
          assert Capabilities.operation_available?(@index, 'repositories_reclaim_space_reclaim')
          refute Capabilities.operation_available?(@index, 'nonexistent')
        end

        def test_domains_supported
          assert Capabilities.domains_supported?(@index)
        end

        def test_domains_not_supported
          old_spec = {
            'info' => { 'x-pulp-app-versions' => { 'core' => '3.20.0' } },
            'paths' => {},
          }
          old_index = SpecIndex.new(old_spec)
          refute Capabilities.domains_supported?(old_index)
        end

        def test_reclaim_space_supported
          assert Capabilities.reclaim_space_supported?(@index)
        end
      end
    end
  end
end
