module Actions
  module Pulp3
    module Orchestration
      module Repository
        class UploadContent < Pulp3::Abstract
          def plan(repository, smart_proxy, file)
            sequence do
              artifact_href = plan_action(Pulp3::Repository::UploadFile, file[:path]).output[:artifact_href]
              plan_action(Pulp3::Repository::ImportUpload, artifact_href, repository)

            end
          end
        end
      end
    end
  end
end
