require 'katello_test_helper'
require 'support/pulp3_support'

module Katello
  module Service
    module Pulp3
      module Api
        class CoreTest < ActiveSupport::TestCase
          include Katello::Pulp3Support

          let(:core) { Katello::Pulp3::Api::Core.new(@primary) }

          def setup
            @primary = SmartProxy.pulp_primary
          end

          def test_with_excon
            default = Faraday.default_adapter
            Faraday.default_adapter = :excon

            assert Katello::Pulp3::Api::Core.new(@primary).tasks_api.list(limit: 1)
          ensure
            Faraday.default_adapter = default
          end

          def test_with_net_http
            default = Faraday.default_adapter
            Faraday.default_adapter = :net_http

            assert Katello::Pulp3::Api::Core.new(@primary).tasks_api.list(limit: 1)
          ensure
            Faraday.default_adapter = default
          end

          def test_cancel_task
            core = Katello::Pulp3::Api::Core.new(@primary)
            task = core.tasks_api.list.results.first

            assert_nothing_raised do
              core.cancel_task(task.pulp_href)
            end
          end

          def test_pulp_connection
            conn = core.pulp_connection
            assert_instance_of Katello::PulpClient::Connection, conn
            assert_equal @primary, conn.smart_proxy
          end

          def test_pulp_client_error_class
            assert_equal Katello::PulpClient::ApiError, core.pulp_client_error_class
          end

          def test_exporter_api
            assert_instance_of Katello::PulpClient::ApiProxy, core.exporter_api
          end

          def test_importer_api
            assert_instance_of Katello::PulpClient::ApiProxy, core.importer_api
          end

          def test_importer_check_api
            assert_instance_of Katello::PulpClient::ApiProxy, core.importer_check_api
          end

          def test_export_api
            assert_instance_of Katello::PulpClient::ApiProxy, core.export_api
          end

          def test_import_api
            assert_instance_of Katello::PulpClient::ApiProxy, core.import_api
          end
        end
      end
    end
  end
end
