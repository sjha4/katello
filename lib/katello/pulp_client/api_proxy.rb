# frozen_string_literal: true

module Katello
  module PulpClient
    # Lightweight proxy that mimics the gem-generated API interface
    # (list, create, read, delete, partial_update, update, sync, modify, etc.)
    # but dispatches calls through the spec-driven PulpClient::Connection.
    #
    # Usage:
    #   proxy = ApiProxy.new(connection, 'repositories_rpm_rpm')
    #   proxy.list(limit: 10)           # -> connection.call('repositories_rpm_rpm_list', params: {limit: 10})
    #   proxy.create(name: 'foo')        # -> connection.call('repositories_rpm_rpm_create', body: {name: 'foo'})
    #   proxy.read(href)                 # -> connection.call('repositories_rpm_rpm_read', params: {href_param => href})
    #   proxy.delete(href)               # -> connection.call('repositories_rpm_rpm_delete', params: {href_param => href})
    #
    # The operation_prefix maps to Pulp's OpenAPI operationId naming convention:
    #   {prefix}_list, {prefix}_create, {prefix}_read, {prefix}_delete, etc.
    class ApiProxy
      attr_reader :connection, :operation_prefix

      def initialize(connection, operation_prefix)
        @connection = connection
        @operation_prefix = operation_prefix
      end

      def list(*args)
        params = extract_params(args)
        connection.call("#{operation_prefix}_list", params: params)
      end

      def create(*args)
        href_param, body = extract_href_and_body(args)
        params = href_param ? { href_param_name => href_param } : {}
        connection.call("#{operation_prefix}_create", params: params, body: body)
      end

      def read(href, params = {})
        connection.call("#{operation_prefix}_read",
          params: params.merge(href_param_for(href)))
      end

      def delete(href, params = {})
        connection.call("#{operation_prefix}_delete",
          params: params.merge(href_param_for(href)))
      end

      def partial_update(href, body = {})
        connection.call("#{operation_prefix}_partial_update",
          params: href_param_for(href),
          body: body.is_a?(Hash) ? body : body.to_h)
      end

      def update(href, body = {})
        connection.call("#{operation_prefix}_update",
          params: href_param_for(href),
          body: body.is_a?(Hash) ? body : body.to_h)
      end

      # Catch-all for plugin-specific methods like sync, modify, add, remove, tag, etc.
      def method_missing(method_name, *args, &block)
        op_id = "#{operation_prefix}_#{method_name}"
        if connection.spec_index.operation?(op_id)
          href_param, body = extract_href_and_body(args)
          params = href_param ? { href_param_name => href_param } : {}
          connection.call(op_id, params: params, body: body)
        else
          super
        end
      end

      def respond_to_missing?(method_name, include_private = false)
        connection.spec_index.operation?("#{operation_prefix}_#{method_name}") || super
      end

      private

      # Determine the href parameter name from the OpenAPI spec.
      # Pulp uses names like 'rpm_rpm_repository_href', 'file_file_remote_href', etc.
      def href_param_name
        @href_param_name ||= begin
          op = connection.spec_index.lookup("#{operation_prefix}_read") ||
               connection.spec_index.lookup("#{operation_prefix}_delete")
          if op
            op[:path_params].find { |p| p.end_with?('_href') } || op[:path_params].first
          else
            "#{operation_prefix}_href"
          end
        end
      end

      def href_param_for(href)
        { href_param_name => href }
      end

      # Extract params from args. Handles both positional href + hash and just hash.
      def extract_params(args)
        case args.length
        when 0
          {}
        when 1
          args[0].is_a?(Hash) ? args[0] : { href_param_name => args[0] }
        else
          # First arg is href, second is params hash
          (args[1] || {}).merge(href_param_name => args[0])
        end
      end

      # Extract href (if string) and body (hash) from args.
      # Handles: (body_hash), (href_string, body_hash), (href_string)
      def extract_href_and_body(args)
        case args.length
        when 0
          [nil, {}]
        when 1
          if args[0].is_a?(String)
            [args[0], {}]
          else
            [nil, args[0].is_a?(Hash) ? args[0] : (args[0].respond_to?(:to_h) ? args[0].to_h : {})]
          end
        else
          body = args[1].is_a?(Hash) ? args[1] : (args[1].respond_to?(:to_h) ? args[1].to_h : {})
          [args[0], body]
        end
      end
    end
  end
end
