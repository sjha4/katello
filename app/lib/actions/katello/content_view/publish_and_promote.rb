module Actions
  module Katello
    module ContentView
      class PublishAndPromote < Actions::EntryAction
        def plan(content_view, description = "", environment_ids = nil, options = {importing: false})
          sequence do
            publish_action_output = plan_action(::Actions::Katello::ContentView::Publish, content_view, description, options).output
            if environment_ids && environment_ids.any?
              plan_self(:content_view_version_id=> publish_action_output[:content_view_version_id], :description=> description, :environment_ids => environment_ids, :options => options)
            end
          end
        end

        def finalize
          content_view_version = ::Katello::ContentViewVersion.find(input[:content_view_version_id])
          environments = find_environments input[:environment_ids]
          ForemanTasks.async_task(::Actions::Katello::ContentView::Promote, content_view_version, environments, false, input[:description])
        end

        def find_environments(environment_ids)
          return nil unless (environment_ids && environment_ids.any?)
          ::Katello::KTEnvironment.where(:id => environment_ids)
        end
      end
    end
  end
end
