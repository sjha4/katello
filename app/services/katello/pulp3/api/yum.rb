require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class Yum < Core
        def remotes_uln_api
          api_proxy('remotes_rpm_uln')
        end

        def get_remotes_api(href: nil, url: nil)
          fail 'Provide exactly one of href or url for yum remote selection!' if url.blank? && href.blank?
          fail 'The href must be a pulp_rpm remote href!' if href && !href.start_with?('/pulp/api/v3/remotes/rpm/')

          if href&.start_with?('/pulp/api/v3/remotes/rpm/uln/') || url&.start_with?('uln')
            remotes_uln_api
          else
            remotes_api
          end
        end

        def copy_api
          api_proxy('copy_rpm')
        end

        def content_packages_api
          api_proxy('content_rpm_packages')
        end

        def content_package_groups_api
          api_proxy('content_rpm_packagegroups')
        end

        def content_package_environments_api
          api_proxy('content_rpm_packageenvironments')
        end

        def content_modulemd_defaults_api
          api_proxy('content_rpm_modulemd_defaults')
        end

        def content_repo_metadata_files_api
          api_proxy('content_rpm_repo_metadata_files')
        end

        def content_distribution_trees_api
          api_proxy('content_rpm_distribution_trees')
        end

        def content_advisories_api
          api_proxy('content_rpm_advisories')
        end

        def content_modulemds_api
          api_proxy('content_rpm_modulemds')
        end

        def alternate_content_source_api
          api_proxy('acs_rpm')
        end
      end
    end
  end
end
