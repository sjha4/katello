require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class Core
        attr_accessor :smart_proxy, :repository_type

        def initialize(smart_proxy, repository_type = Katello::RepositoryTypeManager.find_by(:pulp3_api_class, self.class))
          @smart_proxy = smart_proxy
          @repository_type = repository_type
        end

        def pulp_connection
          @pulp_connection ||= Katello::PulpClient::Connection.new(smart_proxy)
        end

        def api_exception_class
          Katello::PulpClient::ApiError
        end

        def pulp_client_error_class
          Katello::PulpClient::ApiError
        end

        def self.remote_uln_class
          fail NotImplementedError
        end

        # --- Remotes ---

        def remotes_api
          api_proxy(repository_type.remotes_op_prefix)
        end

        def remotes_uln_api
          fail NotImplementedError
        end

        def get_remotes_api(*)
          remotes_api
        end

        # --- Publications ---

        def publications_api
          api_proxy(repository_type.publications_op_prefix)
        end

        # --- Distributions ---

        def distributions_api
          api_proxy(repository_type.distributions_op_prefix)
        end

        # --- Plugin Repositories ---

        def repositories_api
          api_proxy(repository_type.repositories_op_prefix)
        end

        def repository_versions_api
          api_proxy(repository_type.repository_versions_op_prefix)
        end

        # --- Core APIs (pulpcore operations) ---

        def core_repositories_list(opts = {})
          pulp_connection.call('repositories_list', params: opts)
        end

        def core_repository_versions_list(opts = {})
          pulp_connection.call('repository_versions_list', params: opts)
        end

        # --- Exception handling ---

        def self.ignore_409_exception(*)
          yield
        rescue => e
          raise e unless e&.code == 409
          nil
        end

        def cancel_task(task_href)
          pulp_connection.call('tasks_cancel',
            params: { task_href: task_href },
            body: { state: 'canceled' })
        rescue Katello::PulpClient::ApiError => e
          raise e unless e.code == 409
          nil
        end

        # --- Core API accessors (pulpcore operations via ApiProxy) ---

        def repositories_reclaim_space_api
          api_proxy('repositories_reclaim_space')
        end

        def yum_exporter_api
          api_proxy('exporters_filesystem')
        end

        def exporter_api
          api_proxy('exporters_pulp')
        end

        def importer_api
          api_proxy('importers_pulp')
        end

        def importer_check_api
          api_proxy('importers_pulp_import_check')
        end

        def yum_export_api
          api_proxy('exporters_filesystem_exports')
        end

        def export_api
          api_proxy('exporters_pulp_exports')
        end

        def import_api
          api_proxy('importers_pulp_imports')
        end

        def orphans_api
          api_proxy('orphans_cleanup')
        end

        def artifacts_api
          api_proxy('artifacts')
        end

        def repair_api
          api_proxy('repair')
        end

        def uploads_api
          api_proxy('uploads')
        end

        def signing_services_api
          api_proxy('signing_services')
        end

        def tasks_api
          api_proxy('tasks')
        end

        def task_groups_api
          api_proxy('task_groups')
        end

        def core_repositories_api
          api_proxy('repositories')
        end

        def core_repository_versions_api
          api_proxy('repository_versions')
        end

        def ignore_404_exception(*)
          yield
        rescue Katello::PulpClient::ApiError => e
          raise e unless e.code == 404
          nil
        end

        def purge_completed_tasks
          tasks_api.purge(finished_before: DateTime.now - Setting[:completed_pulp_task_protection_days])
        end

        def delete_orphans
          [orphans_api.cleanup(orphan_protection_time: (smart_proxy.pulp_mirror? ? 0 : Setting[:orphan_protection_time]))]
        end

        def delete_remote(remote_href)
          ignore_404_exception { remotes_api.delete(remote_href) }
        end

        def repository_version_hrefs(options = {})
          repository_versions(options).map(&:pulp_href).uniq
        end

        def repository_versions(options = {})
          current_pulp_repositories = self.list_all(options)
          repo_hrefs = current_pulp_repositories.collect { |repo| repo.pulp_href }.uniq

          version_hrefs = repo_hrefs.collect do |href|
            versions_list_for_repository(href, options)
          end

          version_hrefs.flatten
        end

        def versions_list_for_repository(repository_href, options)
          self.class.fetch_from_list { |page_opts| repository_versions_api.list(repository_href, page_opts.merge(options)) }
        end

        def publications_list_all(args = {})
          self.class.fetch_from_list do |page_opts|
            publications_api.list(page_opts.merge(args))
          end
        end

        def distributions_list_all(args = {})
          self.class.fetch_from_list do |page_opts|
            distributions_api.list(page_opts.merge(args))
          end
        end

        def get_distribution(href)
          ignore_404_exception { distributions_api.read(href) }
        end

        def delete_distribution(href)
          ignore_404_exception { distributions_api.delete(href) }
        end

        def core_repositories_list_all(options = {})
          self.class.fetch_from_list do |page_opts|
            core_repositories_api.list(page_opts.merge(options))
          end
        end

        def core_repository_versions_list_all(options = {})
          self.class.fetch_from_list do |page_opts|
            core_repository_versions_api.list(page_opts.merge(options))
          end
        end

        def list_all(options = {})
          self.class.fetch_from_list do |page_opts|
            repositories_api.list(page_opts.merge(options))
          end
        end

        def remotes_list(args = {})
          remotes_api.list(args).results
        end

        def remotes_list_all(_smart_proxy, options = {})
          self.class.fetch_from_list do |page_opts|
            remotes_api.list(page_opts.merge(options))
          end
        end

        def repair
          repair_api.post(verify_checksums: true)
        end

        def self.fetch_from_list
          page_size = Setting[:bulk_load_size]
          page_opts = { "offset" => 0, limit: page_size }
          response = {}

          results = []

          loop do
            page_opts = page_opts.with_indifferent_access
            break unless (
            (response.count && (page_opts['offset'] < response.count)) ||
                page_opts["offset"] == 0)
            response = yield page_opts
            results.concat(response.results)
            page_opts[:offset] += page_size
          end

          results
        end

        private

        def api_proxy(operation_prefix)
          Katello::PulpClient::ApiProxy.new(pulp_connection, operation_prefix)
        end
      end
    end
  end
end
