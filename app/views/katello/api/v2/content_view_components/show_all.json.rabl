object false

extends "katello/api/v2/common/metadata"

child @collection[:results] => :results do
  extends 'katello/api/v2/content_views/base'
  node(:added_to_content_view) { |cv| cv.component_of?(@view) }
  node(:cv_versions) do |cv|
    @version = cv.component_content_view_version(@view)
    partial('katello/api/v2/content_view_components/show', :object => @version)
  end
end
