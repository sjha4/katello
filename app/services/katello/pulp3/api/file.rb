require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class File < Core
        def alternate_content_source_api
          api_proxy('acs_file')
        end

        def content_files_api
          api_proxy('content_file_files')
        end
      end
    end
  end
end
