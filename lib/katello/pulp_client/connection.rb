# frozen_string_literal: true

require 'base64'
require 'faraday'
require 'faraday/multipart'
require 'set'

module Katello
  module PulpClient
    # Spec-driven HTTP client for Pulp 3 API.
    # Fetches the OpenAPI spec from a SmartProxy on first use, builds an
    # operation index, and dispatches calls by operation_id.
    #
    # Usage:
    #   conn = Katello::PulpClient::Connection.new(smart_proxy)
    #   response = conn.call('repositories_rpm_rpm_list', params: { limit: 10 })
    #   response = conn.call('repositories_rpm_rpm_sync',
    #     params: { rpm_rpm_repository_href: href },
    #     body: { remote: remote_href, mirror: true })
    class Connection
      SPEC_PATH = '/pulp/api/v3/docs/api.json'
      PULP3_FEATURE = 'Pulpcore'

      attr_reader :smart_proxy

      # @param smart_proxy [SmartProxy] the proxy to connect to
      # @param spec [Hash, nil] pre-loaded spec hash (useful for testing / caching)
      def initialize(smart_proxy, spec: nil)
        @smart_proxy = smart_proxy
        @spec_index = SpecIndex.new(spec) if spec
      end

      # Main entry point for all Pulp API calls.
      #
      # @param operation_id [String] the OpenAPI operationId
      # @param params [Hash] path and query parameters (auto-routed by spec)
      # @param body [Hash, nil] request body (for POST/PUT/PATCH)
      # @param uploads [Hash, nil] file uploads - keys are param names, values are Faraday::UploadIO
      # @return [Response] wrapped response
      # @raise [ApiError] on HTTP errors (status >= 400)
      def call(operation_id, params: {}, body: nil, uploads: nil)
        op = spec_index.lookup(operation_id)
        raise ApiError.new("Unknown operation: #{operation_id}", operation_id: operation_id) unless op

        path = build_path(op[:path], op[:path_params], params)
        query = build_query(op[:query_params], op[:path_params], params)

        http_response = execute_request(
          method: op[:method],
          path: path,
          query: query,
          body: body,
          uploads: uploads,
          operation_id: operation_id
        )

        handle_response(http_response, operation_id)
      end

      # Access the parsed spec index (lazy-loaded).
      def spec_index
        @spec_index ||= load_and_build_index
      end

      # Fetch and parse the spec from a SmartProxy. Class method for external caching.
      def self.fetch_spec(smart_proxy)
        conn = build_faraday(smart_proxy)
        response = conn.get(SPEC_PATH)
        unless response.success?
          raise ApiError.new(
            "Failed to fetch OpenAPI spec",
            status: response.status,
            body: response.body
          )
        end
        response.body
      end

      # Plugin versions hash from the spec.
      def plugin_versions
        spec_index.plugin_versions
      end

      private

      def load_and_build_index
        spec_hash = self.class.fetch_spec(@smart_proxy)
        Quirks::SpecQuirks.apply!(spec_hash)
        SpecIndex.new(spec_hash)
      end

      def build_path(path_template, path_params, params)
        path = path_template.dup
        path_params.each do |param_name|
          key = param_name.to_s
          value = params[key] || params[key.to_sym]
          if value
            # Replace {param_name} in path template
            path.gsub!("{#{key}}", value.to_s)
          end
        end
        path
      end

      def build_query(query_params, path_params, params)
        query = {}
        path_param_set = path_params.map(&:to_s).to_set
        query_params.each do |param_name|
          key = param_name.to_s
          value = params[key] || params[key.to_sym]
          query[key] = value unless value.nil?
        end
        # Include extra params as query params, excluding path params
        params.each do |k, v|
          ks = k.to_s
          query[ks] = v if !query.key?(ks) && !path_param_set.include?(ks) && !v.nil?
        end
        query
      end

      def execute_request(method:, path:, query:, body:, uploads:, operation_id:)
        conn = faraday_connection
        conn.run_request(method.to_sym, path, nil, nil) do |req|
          req.params.update(query) if query.any?
          if uploads
            req.headers['Content-Type'] = 'multipart/form-data'
            payload = {}
            payload.merge!(body) if body
            payload.merge!(uploads)
            req.body = payload
          elsif body
            req.headers['Content-Type'] = 'application/json'
            req.body = body.to_json
          end
          # Set correlation ID for request tracing
          request_id = ::Logging.mdc['request'] rescue nil
          req.headers['Correlation-ID'] = request_id if request_id
        end
      end

      def handle_response(http_response, operation_id)
        status = http_response.status
        if status >= 400
          raise ApiError.new(
            nil,
            status: status,
            body: http_response.body,
            operation_id: operation_id
          )
        end
        Response.new(http_response)
      end

      def faraday_connection
        @faraday_connection ||= self.class.build_faraday(@smart_proxy)
      end

      def self.build_faraday(smart_proxy)
        uri = smart_proxy.pulp3_uri!
        base_url = "#{uri.scheme}://#{uri.host}"

        Faraday.new(url: base_url) do |f|
          f.request :multipart
          f.response :json, content_type: /\bjson$/
          # Note: Faraday 1.x uses flat params encoding by default, so no need to set params_encoder

          # SSL configuration
          f.ssl.ca_file = ::Cert::Certs.backend_ca_cert_file(:pulp)
          f.ssl.client_cert = ::Cert::Certs.ssl_client_cert
          f.ssl.client_key = ::Cert::Certs.ssl_client_key

          # Basic auth
          username = smart_proxy.setting(SmartProxy::PULP3_FEATURE, 'username')
          password = smart_proxy.setting(SmartProxy::PULP3_FEATURE, 'password')
          if username
            encoded = Base64.strict_encode64("#{username}:#{password}")
            f.headers['Authorization'] = "Basic #{encoded}"
          end

          # Timeouts
          timeout = SETTINGS[:katello][:rest_client_timeout] rescue 120
          f.options.timeout = timeout
          f.options.open_timeout = timeout

          f.adapter Faraday.default_adapter
        end
      end
    end
  end
end
