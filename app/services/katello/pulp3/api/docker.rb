require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class Docker < Core
        def recursive_add_api
          api_proxy('repositories_container_container')
        end

        def container_push_api
          api_proxy('repositories_container_container_push')
        end

        def content_manifests_api
          api_proxy('content_container_manifests')
        end

        def content_tags_api
          api_proxy('content_container_tags')
        end

        def content_blobs_api
          api_proxy('content_container_blobs')
        end

        def container_push_repo_for_name(name)
          container_push_api.list(name: name)&.results&.first
        end

        def container_push_distribution_for_repository(repository_href)
          distributions_api.list(repository: repository_href)&.results&.first
        end
      end
    end
  end
end
