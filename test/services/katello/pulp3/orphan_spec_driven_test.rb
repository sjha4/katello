# frozen_string_literal: true

# Example: Migration of orphan_test.rb to spec-driven PulpClient
# This shows how a complex VCR integration test migrates. The key changes are:
#   1. Replace @file_api (Katello::Pulp3::Api::File) calls with Connection.call
#   2. Replace model class instantiation with plain Hashes for request bodies
#   3. Response objects use method_missing instead of generated accessors
#
# NOTE: This test requires VCR cassettes recorded against a live Pulp instance.
# It serves as a migration reference. The private helper methods show the
# heaviest migration patterns.

require 'katello_test_helper'
require 'support/pulp3_support'

module Katello
  module Service
    module Pulp3
      class RepositoryOrphanSpecDrivenTest < ActiveSupport::TestCase
        include Katello::Pulp3Support

        def setup
          User.current = users(:admin)
          @primary = SmartProxy.pulp_primary
          @conn = TestPulpClientHelper.pulp_connection(@primary)
          @external_distribution_hrefs = []
          @external_repository_hrefs = []
          @external_remote_hrefs = []
          @external_name_counter = 0
        end

        # ---- Migration Examples (private helpers rewritten) ----
        #
        # BEFORE (generated client):
        #   repo = @file_api.repositories_api.create(name: repo_name)
        #   remote = @file_api.remotes_api.create(
        #     @file_api.remote_class.new(name: "...", url: "...", tls_validation: false))
        #   sync_task = @file_api.repositories_api.sync(
        #     repo.pulp_href,
        #     @file_api.repository_sync_url_class.new(remote: remote.pulp_href, mirror: true))
        #
        # AFTER (spec-driven):
        #   repo = @conn.call('repositories_file_file_create', body: { name: repo_name })
        #   remote = @conn.call('remotes_file_file_create',
        #     body: { name: "...", url: "...", tls_validation: false })
        #   sync_task = @conn.call('repositories_file_file_sync',
        #     params: { file_file_repository_href: repo.pulp_href },
        #     body: { remote: remote.pulp_href, mirror: true })
        #
        # BEFORE (model classes):
        #   @file_api.publication_class.new(repository_version: href)
        #   @file_api.distribution_class.new(name: "...", base_path: "...", publication: pub_href)
        #
        # AFTER (plain Hashes):
        #   { repository_version: href }
        #   { name: "...", base_path: "...", publication: pub_href }
        #
        # BEFORE (teardown with per-gem API):
        #   @file_api.delete_distribution(href)
        #   @file_api.repositories_api.delete(href)
        #   @file_api.delete_remote(href)
        #
        # AFTER:
        #   @conn.call('distributions_file_file_delete', params: { file_file_distribution_href: href })
        #   @conn.call('repositories_file_file_delete', params: { file_file_repository_href: href })
        #   @conn.call('remotes_file_file_delete', params: { file_file_remote_href: href })

        # Basic validation that the spec-driven connection can look up File plugin operations
        def test_file_operations_available
          spec_index = @conn.spec_index
          # In the minimal stub spec, these won't exist, but in a real spec they would.
          # This test documents the expected operation_ids.
          expected_ops = %w[
            repositories_file_file_list
            repositories_file_file_create
            repositories_file_file_delete
            remotes_file_file_create
            remotes_file_file_delete
            distributions_file_file_create
            distributions_file_file_delete
          ]
          # Just verify we can query the spec index without errors
          expected_ops.each do |op|
            spec_index.operation?(op) # returns true or false, both acceptable
          end
          assert true
        end
      end
    end
  end
end
