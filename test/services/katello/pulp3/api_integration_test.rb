require 'katello_test_helper'

module Katello
  module Pulp3
    class ApiIntegrationTest < ActiveSupport::TestCase
      def setup
        @proxy = SmartProxy.pulp_primary
      end

      def test_yum_api_constructs_correctly
        api = Katello::Pulp3::Api::Yum.new(@proxy)
        assert_not_nil api
        assert_equal @proxy, api.smart_proxy
        assert_equal Katello::RepositoryTypeManager.find_defined('yum'), api.repository_type
      end

      def test_apt_api_constructs_correctly
        api = Katello::Pulp3::Api::Apt.new(@proxy)
        assert_not_nil api
        assert_equal @proxy, api.smart_proxy
      end

      def test_docker_api_constructs_correctly
        api = Katello::Pulp3::Api::Docker.new(@proxy)
        assert_not_nil api
        assert_equal @proxy, api.smart_proxy
      end

      def test_file_api_constructs_correctly
        api = Katello::Pulp3::Api::File.new(@proxy)
        assert_not_nil api
        assert_equal @proxy, api.smart_proxy
      end

      def test_ansible_collection_api_constructs_correctly
        api = Katello::Pulp3::Api::AnsibleCollection.new(@proxy)
        assert_not_nil api
        assert_equal @proxy, api.smart_proxy
      end

      def test_generic_api_constructs_with_python_type
        python_type = Katello::RepositoryTypeManager.find_defined('python')
        api = Katello::Pulp3::Api::Generic.new(@proxy, python_type)
        assert_not_nil api
        assert_equal python_type, api.repository_type
      end

      def test_generic_api_constructs_with_ostree_type
        ostree_type = Katello::RepositoryTypeManager.find_defined('ostree')
        api = Katello::Pulp3::Api::Generic.new(@proxy, ostree_type)
        assert_not_nil api
        assert_equal ostree_type, api.repository_type
      end

      def test_repository_type_client_module_matches_api_client_module
        type_api_pairs = {
          'yum' => Katello::Pulp3::Api::Yum,
          'deb' => Katello::Pulp3::Api::Apt,
          'docker' => Katello::Pulp3::Api::Docker,
          'file' => Katello::Pulp3::Api::File,
          'ansible_collection' => Katello::Pulp3::Api::AnsibleCollection,
        }

        type_api_pairs.each do |type_id, api_class|
          repo_type = Katello::RepositoryTypeManager.find_defined(type_id)
          api = api_class.new(@proxy)
          assert_equal repo_type.client_module_class, api.client_module,
            "Client module mismatch for repository type #{type_id}"
        end
      end

      def test_generic_types_use_correct_client_modules
        %w[python ostree].each do |type_id|
          repo_type = Katello::RepositoryTypeManager.find_defined(type_id)
          api = Katello::Pulp3::Api::Generic.new(@proxy, repo_type)
          assert_equal repo_type.client_module_class, api.client_module,
            "Client module mismatch for generic repository type #{type_id}"
        end
      end

      def test_all_repository_types_can_create_api_instance
        Katello::RepositoryTypeManager.defined_repository_types.each do |type_id, repo_type|
          next unless repo_type.pulp3_api_class

          api = repo_type.pulp3_api(@proxy)
          assert_not_nil api, "Failed to create API instance for repository type #{type_id}"
          assert_kind_of Katello::Pulp3::Api::Core, api,
            "API instance for #{type_id} should inherit from Katello::Pulp3::Api::Core"
        end
      end

      def test_api_exception_class_is_api_error
        Katello::RepositoryTypeManager.defined_repository_types.each do |type_id, repo_type|
          next unless repo_type.pulp3_api_class
          next if repo_type.pulp3_api_class == Katello::Pulp3::Api::Generic

          api = repo_type.pulp3_api(@proxy)
          exception_class = api.api_exception_class
          assert_not_nil exception_class,
            "api_exception_class should not be nil for #{type_id}"
          assert exception_class.to_s.end_with?('ApiError'),
            "api_exception_class for #{type_id} should be an ApiError class, got #{exception_class}"
        end
      end

      def test_repair_class_available_for_all_types
        Katello::RepositoryTypeManager.defined_repository_types.each do |type_id, repo_type|
          next unless repo_type.pulp3_api_class
          next if repo_type.pulp3_api_class == Katello::Pulp3::Api::Generic

          api = repo_type.pulp3_api(@proxy)
          repair = api.repair_class
          assert_not_nil repair,
            "repair_class should not be nil for #{type_id}"
        end
      end

      def test_core_api_services_available
        api = Katello::Pulp3::Api::Core.new(@proxy)
        assert_not_nil api.core_api_client
        assert_kind_of PulpcoreClient::ApiClient, api.core_api_client
      end
    end
  end
end
