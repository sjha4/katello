require 'test_helper'
require 'katello/pulp_client'

module Katello
  module PulpClient
    class SpecIndexTest < ActiveSupport::TestCase
      def setup
        @spec_hash = {
          'info' => {
            'x-pulp-app-versions' => {
              'core' => '3.49.0',
              'rpm' => '3.25.0',
              'file' => '3.5.0',
            },
          },
          'paths' => {
            '/pulp/api/v3/repositories/rpm/rpm/' => {
              'get' => {
                'operationId' => 'repositories_rpm_rpm_list',
                'parameters' => [
                  { 'name' => 'limit', 'in' => 'query' },
                  { 'name' => 'offset', 'in' => 'query' },
                  { 'name' => 'name', 'in' => 'query' },
                ],
              },
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
        @index = SpecIndex.new(@spec_hash)
      end

      def test_plugin_versions
        assert_equal '3.49.0', @index.plugin_versions['core']
        assert_equal '3.25.0', @index.plugin_versions['rpm']
        assert_equal '3.5.0', @index.plugin_versions['file']
      end

      def test_lookup_list_operation
        op = @index.lookup('repositories_rpm_rpm_list')
        assert_not_nil op
        assert_equal 'get', op[:method]
        assert_equal '/pulp/api/v3/repositories/rpm/rpm/', op[:path]
        assert_includes op[:query_params], 'limit'
        assert_includes op[:query_params], 'offset'
        assert_empty op[:path_params]
      end

      def test_lookup_sync_operation
        op = @index.lookup('repositories_rpm_rpm_sync')
        assert_not_nil op
        assert_equal 'post', op[:method]
        assert_includes op[:path_params], 'rpm_rpm_repository_href'
      end

      def test_lookup_unknown_operation
        assert_nil @index.lookup('nonexistent_operation')
      end

      def test_operation_check
        assert @index.operation?('repositories_rpm_rpm_list')
        refute @index.operation?('nonexistent_operation')
      end

      def test_empty_spec
        index = SpecIndex.new({})
        assert_empty index.operations
        assert_empty index.plugin_versions
      end

      def test_non_operation_entries_ignored
        spec = {
          'paths' => {
            '/some/path' => {
              'parameters' => [{ 'name' => 'global_param', 'in' => 'query' }],
              'get' => {
                'operationId' => 'some_list',
                'parameters' => [],
              },
            },
          },
        }
        index = SpecIndex.new(spec)
        assert_equal 1, index.operations.size
        assert index.operation?('some_list')
      end
    end
  end
end
