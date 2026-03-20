require 'test_helper'
require 'katello/pulp_client'

module Katello
  module PulpClient
    class ApiErrorTest < ActiveSupport::TestCase
      def test_basic_error
        error = ApiError.new('something broke', status: 500, operation_id: 'tasks_list')
        assert_match(/Pulp API error/, error.message)
        assert_match(/tasks_list/, error.message)
        assert_match(/HTTP 500/, error.message)
        assert_match(/something broke/, error.message)
      end

      def test_status_accessible
        error = ApiError.new(status: 404)
        assert_equal 404, error.status
      end

      def test_code_alias
        error = ApiError.new(status: 409)
        assert_equal 409, error.code
      end

      def test_body_accessible
        error = ApiError.new(status: 400, body: { 'detail' => 'bad request' })
        assert_equal({ 'detail' => 'bad request' }, error.body)
      end

      def test_operation_id_accessible
        error = ApiError.new(operation_id: 'repositories_rpm_rpm_sync')
        assert_equal 'repositories_rpm_rpm_sync', error.operation_id
      end

      def test_body_in_message
        error = ApiError.new(status: 400, body: 'error details here')
        assert_match(/error details here/, error.message)
      end

      def test_long_body_truncated
        long_body = 'x' * 1000
        error = ApiError.new(status: 400, body: long_body)
        assert error.message.length < 600
        assert_match(/\.\.\./, error.message)
      end

      def test_is_standard_error
        assert_kind_of StandardError, ApiError.new
      end

      def test_response_body_with_string
        error = ApiError.new(status: 400, body: 'error details here')
        assert_equal 'error details here', error.response_body
      end

      def test_response_body_with_hash
        error = ApiError.new(status: 400, body: { 'detail' => 'bad request' })
        parsed = JSON.parse(error.response_body)
        assert_equal 'bad request', parsed['detail']
      end

      def test_response_body_compatibility_with_reformat
        # Simulates the pattern in reformat_api_exception:
        #   body = JSON.parse(exception.response_body) rescue exception.response_body
        error = ApiError.new(status: 422, body: { 'non_field_errors' => ['invalid'] })
        body = JSON.parse(error.response_body) rescue error.response_body
        assert_kind_of Hash, body
        assert_equal ['invalid'], body['non_field_errors']
      end
    end
  end
end
