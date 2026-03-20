require 'test_helper'
require 'katello/pulp_client'

module Katello
  module PulpClient
    class ConnectionTest < ActiveSupport::TestCase
      def sample_spec
        {
          'info' => {
            'x-pulp-app-versions' => { 'core' => '3.49.0', 'rpm' => '3.25.0' },
          },
          'paths' => {
            '/pulp/api/v3/tasks/' => {
              'get' => {
                'operationId' => 'tasks_list',
                'parameters' => [
                  { 'name' => 'limit', 'in' => 'query' },
                  { 'name' => 'offset', 'in' => 'query' },
                ],
              },
            },
            '/pulp/api/v3/tasks/{pulp_id}/' => {
              'get' => {
                'operationId' => 'tasks_read',
                'parameters' => [
                  { 'name' => 'pulp_id', 'in' => 'path' },
                ],
              },
            },
            '/pulp/api/v3/repositories/rpm/rpm/' => {
              'post' => {
                'operationId' => 'repositories_rpm_rpm_create',
                'parameters' => [],
              },
            },
            '/pulp/api/v3/repositories/rpm/rpm/{rpm_rpm_repository_href}sync/' => {
              'post' => {
                'operationId' => 'repositories_rpm_rpm_sync',
                'parameters' => [
                  { 'name' => 'rpm_rpm_repository_href', 'in' => 'path' },
                ],
              },
            },
          },
        }
      end

      def setup
        @smart_proxy = mock('smart_proxy')
        @connection = Connection.new(@smart_proxy, spec: sample_spec)
      end

      def test_spec_index_loaded
        assert_not_nil @connection.spec_index
        assert @connection.spec_index.operation?('tasks_list')
      end

      def test_plugin_versions
        assert_equal '3.49.0', @connection.plugin_versions['core']
        assert_equal '3.25.0', @connection.plugin_versions['rpm']
      end

      def test_unknown_operation_raises
        assert_raises(ApiError) do
          @connection.call('nonexistent_operation')
        end
      end

      def test_unknown_operation_error_message
        error = assert_raises(ApiError) do
          @connection.call('nonexistent_operation')
        end
        assert_match(/Unknown operation: nonexistent_operation/, error.message)
      end

      def test_call_builds_path_params
        # Stub the HTTP layer
        mock_response = Struct.new(:status, :headers, :body).new(
          200,
          { 'Content-Type' => 'application/json' },
          { 'pulp_href' => '/pulp/api/v3/tasks/abc/', 'state' => 'completed' }
        )

        faraday_conn = mock('faraday')
        @connection.stubs(:faraday_connection).returns(faraday_conn)

        faraday_conn.expects(:run_request).with(
          :get,
          '/pulp/api/v3/tasks/test-id/',
          nil,
          nil
        ).yields(stub_request_object).returns(mock_response)

        response = @connection.call('tasks_read', params: { 'pulp_id' => 'test-id' })
        assert_equal 'completed', response.state
      end

      def test_call_with_body
        mock_response = Struct.new(:status, :headers, :body).new(
          202,
          { 'Content-Type' => 'application/json' },
          { 'task' => '/pulp/api/v3/tasks/xyz/' }
        )

        faraday_conn = mock('faraday')
        @connection.stubs(:faraday_connection).returns(faraday_conn)

        faraday_conn.expects(:run_request).with(
          :post,
          '/pulp/api/v3/repositories/rpm/rpm//pulp/api/v3/repos/123/sync/',
          nil,
          nil
        ).yields(stub_request_object).returns(mock_response)

        response = @connection.call(
          'repositories_rpm_rpm_sync',
          params: { rpm_rpm_repository_href: '/pulp/api/v3/repos/123/' },
          body: { remote: '/pulp/api/v3/remotes/456/', mirror: true }
        )
        assert_equal '/pulp/api/v3/tasks/xyz/', response.task
      end

      def test_http_error_raises_api_error
        mock_response = Struct.new(:status, :headers, :body).new(
          404,
          {},
          { 'detail' => 'Not found.' }
        )

        faraday_conn = mock('faraday')
        @connection.stubs(:faraday_connection).returns(faraday_conn)
        faraday_conn.expects(:run_request).yields(stub_request_object).returns(mock_response)

        error = assert_raises(ApiError) do
          @connection.call('tasks_list')
        end
        assert_equal 404, error.status
        assert_equal 'tasks_list', error.operation_id
      end

      private

      def stub_request_object
        req = stub('request')
        req.stubs(:params).returns({})
        req.stubs(:headers).returns({})
        req.stubs(:body=)
        req
      end
    end
  end
end
