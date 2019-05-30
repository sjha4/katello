# This action takes an artifact and a repository
# Creates a content unit based on content type and then creates a new repository version with the added content.
module Actions
  module Pulp3
    module Repository
      class ImportUpload < Pulp3::Abstract
        def plan(artifact_href, repository)
          plan_self(:artifact_href => artifact_href, :repository_id => repository.id)
        end

        def run
          artifact_href = input[:artifact_href]
          repo = Katello::Repository.find(input[:repository_id])


        end
      end
    end
  end
end
