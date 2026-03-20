# frozen_string_literal: true

module Katello
  module PulpClient
    module Quirks
      # Feature gates based on Pulp plugin versions.
      # Use to check whether a specific operation or behavior is available
      # before attempting an API call.
      module Capabilities
        # Check if a specific plugin meets a minimum version requirement.
        # Returns false if the plugin is not installed.
        def self.plugin_version_gte?(spec_index, plugin_name, min_version)
          installed = spec_index.plugin_versions[plugin_name]
          return false unless installed
          Gem::Version.new(installed) >= Gem::Version.new(min_version)
        end

        # Check if a given operation_id is available in the spec.
        def self.operation_available?(spec_index, operation_id)
          spec_index.operation?(operation_id)
        end

        # Domain support was added in pulpcore 3.23
        def self.domains_supported?(spec_index)
          plugin_version_gte?(spec_index, 'core', '3.23')
        end

        # Repository reclaim space was added in pulpcore 3.19
        def self.reclaim_space_supported?(spec_index)
          operation_available?(spec_index, 'repositories_reclaim_space_reclaim')
        end
      end
    end
  end
end
