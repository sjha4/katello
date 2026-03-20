# frozen_string_literal: true

module Katello
  module PulpClient
    # Permissive response wrapper that provides method-style access to JSON fields.
    # Returns nil for missing fields instead of raising errors, eliminating the
    # need for monkey patches that fixed missing field issues in generated clients.
    class Response
      attr_reader :raw_body, :http_status, :http_headers

      def initialize(http_response)
        @http_status = http_response.status
        @http_headers = http_response.headers
        body = http_response.body
        @raw_body = body
        @data = body.is_a?(Hash) ? body.with_indifferent_access : body
      end

      # Allow Hash-style access
      def [](key)
        return nil unless @data.is_a?(Hash)
        wrap(@data[key])
      end

      # Returns a HashWithIndifferentAccess for compatibility with
      # .as_json.with_indifferent_access patterns used throughout Pulp3 services.
      def as_json(_options = nil)
        @data.is_a?(Hash) ? @data.deep_dup : {}
      end

      def to_h
        @data.is_a?(Hash) ? @data.to_h.with_indifferent_access : {}.with_indifferent_access
      end

      # Hash-like methods for compatibility with code that delegates key?/dig
      def key?(key)
        @data.is_a?(Hash) && @data.key?(key.to_s)
      end

      def dig(*keys)
        return nil unless @data.is_a?(Hash)
        @data.dig(*keys.map(&:to_s))
      end

      def to_a
        @data.is_a?(Array) ? @data : []
      end

      # Pagination helpers
      def results
        return [] unless @data.is_a?(Hash)
        (@data['results'] || []).map { |r| wrap(r) }
      end

      def count
        return @data.size if @data.is_a?(Array)
        @data.is_a?(Hash) ? @data['count'] : nil
      end

      def pulp_href
        self['pulp_href']
      end

      def respond_to_missing?(name, include_private = false)
        (@data.is_a?(Hash) && @data.key?(name.to_s)) || super
      end

      private

      def method_missing(name, *args)
        if @data.is_a?(Hash)
          key = name.to_s
          return wrap(@data[key]) if @data.key?(key)
        end
        nil
      end

      def wrap(value)
        case value
        when Hash
          self.class.allocate.tap do |r|
            r.instance_variable_set(:@data, value.with_indifferent_access)
            r.instance_variable_set(:@raw_body, value)
            r.instance_variable_set(:@http_status, @http_status)
            r.instance_variable_set(:@http_headers, @http_headers)
          end
        when Array
          value.map { |v| wrap(v) }
        else
          value
        end
      end
    end
  end
end
