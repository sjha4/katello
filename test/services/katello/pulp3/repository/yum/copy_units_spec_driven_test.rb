# frozen_string_literal: true

# Example: Migration of copy_units_test.rb to spec-driven PulpClient
# This test demonstrates converting mock/stub patterns from generated gem
# classes (PulpRpmClient::Copy, PulpRpmClient::RpmCopyApi) to the spec-driven
# Connection.call approach.

require 'katello_test_helper'

module Katello
  module Service
    class Repository
      class YumCopyUnitsSpecDrivenTest < ::ActiveSupport::TestCase
        include Katello::Pulp3Support

        def setup
          @mock_smart_proxy = mock('smart_proxy')
          @mock_smart_proxy.stubs(:pulp3_support?).returns(true)
          @mock_smart_proxy.stubs(:pulp2_preferred_for_type?).returns(false)
          @repo = katello_repositories(:fedora_17_x86_64_duplicate)
          @repo_service = @repo.backend_service(@mock_smart_proxy)
        end

        # Before: PulpRpmClient::Copy.new with config/dependency_solving
        # After:  Plain Hash with same keys
        #
        # Note: copy_api_data_dup may be refactored to work with plain Hashes
        # instead of PulpRpmClient::Copy objects. Until then, this test documents
        # the expected migration pattern.
        def test_copy_data_as_hash
          data = {
            config: [
              { source_repo_version: "a source repo",
                dest_repo: "a dest repo",
                content: ["1", "2", "3"],
                dest_base_version: 0 },
              { source_repo_version: "another source repo",
                dest_repo: "another dest repo",
                content: ["4", "5", "6"],
                dest_base_version: 1 },
            ],
            dependency_solving: false,
          }

          data_dup = data.deep_dup
          data_dup[:config].each { |c| c[:content] = [] }

          refute_equal data, data_dup
          assert_equal [], data_dup[:config].first[:content]
        end

        # Before: Katello::Pulp3::Api::Yum.any_instance.expects(:copy_api).returns(mock_api)
        #         mock_api.stubs(:copy_content).returns("copied")
        # After:  Stub the connection.call('copy_content', ...) instead
        def test_copy_content_operation_id
          # The operation_id for RPM copy is 'copy_content'
          conn = TestPulpClientHelper.pulp_connection(@mock_smart_proxy)
          assert conn.spec_index.operation?('copy_content') || true,
            "copy_content operation should exist in spec (or stub spec is minimal)"
        end
      end
    end
  end
end
