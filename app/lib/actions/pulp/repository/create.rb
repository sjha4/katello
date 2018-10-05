module Actions
  module Pulp
    module Repository
      class Create < Pulp::Abstract
        include Helpers::Presenter

        input_format do
          param :repository_id
        end

        def plan(repository, smart_proxy = SmartProxy.pulp_master!)
          plan_self(:repository_id => repository.id, :capsule_id => smart_proxy.id)
        end

        def run
          repo = ::Katello::Repository.find(input[:repository_id])
          output[:response] = repo.backend_service(smart_proxy).create
        rescue RestClient::Conflict
          Rails.logger.warn("Tried to add repository #{input[:pulp_id]} that already exists.")
          []
        end
      end
    end
  end
end
