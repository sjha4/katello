# frozen_string_literal: true

module Katello
  module PulpClient
    # Parses an OpenAPI spec JSON and builds a flat lookup index
    # mapping operation_id => { method:, path:, path_params:, query_params: }
    class SpecIndex
      attr_reader :operations, :plugin_versions

      def initialize(spec_hash)
        @operations = {}
        @plugin_versions = spec_hash.dig('info', 'x-pulp-app-versions') || {}
        build_index(spec_hash)
      end

      def lookup(operation_id)
        @operations[operation_id]
      end

      def operation?(operation_id)
        @operations.key?(operation_id)
      end

      private

      def build_index(spec_hash)
        (spec_hash['paths'] || {}).each do |path, methods|
          methods.each do |method, detail|
            next unless detail.is_a?(Hash) && detail['operationId']
            path_params = []
            query_params = []
            (detail['parameters'] || []).each do |param|
              case param['in']
              when 'path'
                path_params << param['name']
              when 'query'
                query_params << param['name']
              end
            end
            @operations[detail['operationId']] = {
              method: method.downcase,
              path: path,
              path_params: path_params,
              query_params: query_params,
            }
          end
        end
      end
    end
  end
end
