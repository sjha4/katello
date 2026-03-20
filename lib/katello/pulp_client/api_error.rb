# frozen_string_literal: true

module Katello
  module PulpClient
    # Unified error class for all Pulp API failures.
    # Replaces the per-gem ApiError classes (PulpcoreClient::ApiError,
    # PulpRpmClient::ApiError, etc.) with a single error type.
    class ApiError < StandardError
      attr_reader :status, :body, :operation_id

      def initialize(message = nil, status: nil, body: nil, operation_id: nil)
        @status = status
        @body = body
        @operation_id = operation_id
        super(build_message(message))
      end

      # Compatibility with existing code that checks e.code
      alias_method :code, :status

      # Compatibility with generated client ApiError which uses response_body
      def response_body
        body.is_a?(String) ? body : body.to_json
      end

      private

      def build_message(message)
        parts = []
        parts << "Pulp API error"
        parts << "(#{operation_id})" if operation_id
        parts << "HTTP #{status}" if status
        parts << "- #{message}" if message.present?
        parts << "body: #{truncated_body}" if body.present?
        parts.join(' ')
      end

      def truncated_body
        text = body.is_a?(String) ? body : body.to_json
        text.length > 500 ? "#{text[0..497]}..." : text
      end
    end
  end
end
