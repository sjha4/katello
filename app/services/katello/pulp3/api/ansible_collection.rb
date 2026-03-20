require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class AnsibleCollection < Core
        def copy_api
          api_proxy('copy_ansible')
        end

        def content_collection_versions_api
          api_proxy('content_ansible_collection_versions')
        end
      end
    end
  end
end
