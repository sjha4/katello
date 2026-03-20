require "katello/pulp_client"

module Katello
  module Pulp3
    module Api
      class ContentGuard < Core
        def default_name
          'RHSMCertGuard'
        end

        def self.api_exception_class
          Katello::PulpClient::ApiError
        end

        def rhsm_api_client
          api_proxy('contentguards_certguard_rhsm')
        end

        def ca_cert
          Cert::Certs.candlepin_client_ca_cert
        end

        def refresh
          found = list(name: default_name).results.first
          if found && found.ca_certificate != ca_cert
            partial_update(found.pulp_href)
          else
            found = create
          end
          persist_if_needed(found)
        end

        def persist_if_needed(content_guard_obj)
          return if self.smart_proxy.pulp_mirror?
          Katello::Util::Support.active_record_retry do
            found = Katello::Pulp3::ContentGuard.find_by(:name => default_name)
            if found
              found.update(pulp_href: content_guard_obj.pulp_href, pulp_prn: content_guard_obj.prn)
            else
              Katello::Pulp3::ContentGuard.create(name: default_name, pulp_href: content_guard_obj.pulp_href, pulp_prn: content_guard_obj.prn)
            end
          end
        end

        def create(name = default_name)
          rhsm_api_client.create(name: name, ca_certificate: ca_cert)
        rescue Katello::PulpClient::ApiError => e
          if (found = list&.results&.first)
            found
          else
            raise e
          end
        end

        def list(options = {})
          rhsm_api_client.list options
        end

        def partial_update(href)
          rhsm_api_client.partial_update(href, ca_certificate: ca_cert)
        end

        def delete(href)
          rhsm_api_client.delete(href) if href
        end
      end
    end
  end
end
