# frozen_string_literal: true

module Katello
  module PulpClient
    module Quirks
      # Fixes incorrect OpenAPI specs before indexing.
      # Applied during spec parsing to correct known issues in Pulp's published specs.
      module SpecQuirks
        # Apply all known spec corrections to the raw spec hash (mutates in place).
        def self.apply!(spec_hash)
          fix_rpm_gpgcheck_enum(spec_hash)
        end

        # Pulp RPM spec sometimes defines gpgcheck as an enum with only [0, 1]
        # but the API actually accepts nil. Remove the enum constraint.
        def self.fix_rpm_gpgcheck_enum(spec_hash)
          schemas = spec_hash.dig('components', 'schemas') || {}
          %w[rpm.RpmRepository rpm.RpmRepositoryResponse].each do |schema_name|
            schema = schemas[schema_name]
            next unless schema
            %w[gpgcheck repo_gpgcheck].each do |field|
              prop = schema.dig('properties', field)
              prop&.delete('enum')
            end
          end
        end
      end
    end
  end
end
