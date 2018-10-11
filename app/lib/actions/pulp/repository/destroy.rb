module Actions
  module Pulp
    module Repository
      class Destroy < Pulp::AbstractAsyncTask
        input_format do
          param :pulp_id
          param :capsule_id
        end

        def invoke_external_task
          repo = ::Katello::Repository.find_by(:pulp_id => input[:pulp_id])
          output[:pulp_tasks] = repo.backend_service(smart_proxy(input[:capsule_id])).delete
        end
      end
    end
  end
end
