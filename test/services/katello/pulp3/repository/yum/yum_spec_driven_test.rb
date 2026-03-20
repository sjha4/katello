# frozen_string_literal: true

# Example: Migration of yum_test.rb to spec-driven PulpClient
# Demonstrates converting both unit tests (with stubs) and VCR integration tests.

require 'katello_test_helper'

module Katello
  module Service
    module Pulp3
      class Repository
        class YumSpecDrivenTest < ::ActiveSupport::TestCase
          include Katello::Pulp3Support

          def setup
            @repo = katello_repositories(:fedora_17_x86_64)
            @proxy = SmartProxy.pulp_primary
            @conn = TestPulpClientHelper.pulp_connection(@proxy)
          end

          # Unit tests that don't hit the network remain largely the same.
          # The service layer (Katello::Pulp3::Repository::Yum) still works;
          # only the underlying API transport changes.

          # Before: service.publication_options(@repo) returns hash with generated model
          # After:  Same service method, but internally uses Connection instead of gem APIs
          def test_publication_options
            @repo.version_href = 'a_version_href'
            @repo.root.checksum_type = 'sha512'
            service = Katello::Pulp3::Repository::Yum.new(@repo, @proxy)
            publication_options = service.publication_options(@repo)
            assert_equal 'a_version_href', publication_options[:repository_version]
            assert_equal 'sha512', publication_options[:checksum_type]
          end

          def test_publication_options_sets_checksum_type_to_sha_256_when_nil
            @repo.version_href = 'a_version_href'
            @repo.root.checksum_type = nil
            service = Katello::Pulp3::Repository::Yum.new(@repo, @proxy)
            publication_options = service.publication_options(@repo)
            assert_equal 'a_version_href', publication_options[:repository_version]
            assert_equal 'sha256', publication_options[:checksum_type]
          end

          def test_delete_version_zero
            service = Katello::Pulp3::Repository::Yum.new(@repo, @proxy)
            @repo.version_href = '/pulp/api/v3/repositories/rpm/rpm/22c9e84b-f49c-4c70-9b4c-49e8c041220f/versions/0/'
            refute service.delete_version
          end

          # Before: PulpRpmClient::RepositoriesRpmVersionsApi.any_instance.expects(:delete).returns({})
          # After:  When the service is updated, it will call conn.call('repositories_rpm_rpm_versions_delete', ...)
          #         For now, we can stub at the service level.
          def test_delete_version
            service = Katello::Pulp3::Repository::Yum.new(@repo, @proxy)
            @repo.version_href = '/pulp/api/v3/repositories/rpm/rpm/22c9e84b-f49c-4c70-9b4c-49e8c041220f/versions/1/'
            # Stub at the API layer until the service is fully migrated
            Katello::PulpClient::ApiProxy.any_instance.expects(:delete).returns({})
            assert service.delete_version
          end

          def test_sles_auth_token_not_included_if_blank
            @repo.root.url = "http://foo.com/bar/"
            service = Katello::Pulp3::Repository::Yum.new(@repo, @proxy)
            assert_equal "http://foo.com/bar/", service.remote_options[:url]
            refute service.remote_options.key?(:sles_auth_token)
          end

          def test_common_remote_options
            service = Katello::Pulp3::Repository::Yum.new(@repo, @proxy)
            @repo.root.upstream_username = 'foo'
            @repo.root.upstream_password = 'bar'

            assert_equal 'foo', service.common_remote_options[:username]
            assert_equal 'bar', service.common_remote_options[:password]

            @repo.root.upstream_username = ''
            @repo.root.upstream_password = ''

            assert_nil service.common_remote_options[:username]
            assert_nil service.common_remote_options[:password]
          end
        end
      end
    end
  end
end
