require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class Apt < Core
        def publications_verbatim_api
          api_proxy('publications_deb_verbatim')
        end

        def copy_api
          api_proxy('copy_deb')
        end

        def content_release_components_api
          api_proxy('content_deb_release_components')
        end

        def content_packages_api
          api_proxy('content_deb_packages')
        end
      end
    end
  end
end
