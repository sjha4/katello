Katello::RepositoryTypeManager.register(::Katello::Repository::DOCKER_TYPE) do
  default_managed_content_type Katello::DockerManifest::CONTENT_TYPE
  pulp3_service_class Katello::Pulp3::Repository::Docker
  pulp3_api_class Katello::Pulp3::Api::Docker
  repo_discovery_class ::Katello::Resources::Discovery::Container
  pulp3_skip_publication true
  pulp3_plugin 'container'

  set_unique_content_per_repo

  repositories_op_prefix 'repositories_container_container'
  remotes_op_prefix 'remotes_container_container'
  distributions_op_prefix 'distributions_container_container'
  repository_versions_op_prefix 'repositories_container_container_versions'

  index_additional_data do |repo|
    Katello::DockerMetaTag.import_meta_tags([repo])
  end

  content_type Katello::DockerManifest,
               :priority => 1,
               :pulp3_service_class => ::Katello::Pulp3::DockerManifest,
               :removable => true,
               :primary_content => true
  content_type Katello::DockerManifestList,
               :priority => 2,
               :pulp3_service_class => ::Katello::Pulp3::DockerManifestList,
               :primary_content => true
  content_type Katello::DockerTag,
               :priority => 3,
               :pulp3_service_class => ::Katello::Pulp3::DockerTag,
               :primary_content => true,
               :mutable => true
  content_type Katello::DockerBlob,
               :priority => 4,
               :pulp3_service_class => ::Katello::Pulp3::DockerBlob,
               :index => false
end
