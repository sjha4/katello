module Actions
  module Katello
    module CapsuleContent
      class RemoveOrphans < Pulp::Abstract
        input_format do
          param :capsule_id
        end
        def plan(proxy)
          sequence do
            plan_action(Actions::Katello::CapsuleContent::RemoveUnneededRepos, proxy) unless proxy.pulp_master?
            plan_self(:capsule_id => proxy.id)
          end
        end

        def run
          pulp_resources.content.remove_orphans
        end
      end
    end
  end
end
