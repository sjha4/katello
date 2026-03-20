Katello::RepositoryTypeManager.register(::Katello::Repository::YUM_TYPE) do
  pulp3_service_class Katello::Pulp3::Repository::Yum
  pulp3_api_class Katello::Pulp3::Api::Yum
  repo_discovery_class ::Katello::Resources::Discovery::Yum
  pulp3_plugin 'rpm'
  pulp3_skip_publication false
  prevent_unneeded_metadata_publish

  repositories_op_prefix 'repositories_rpm_rpm'
  remotes_op_prefix 'remotes_rpm_rpm'
  distributions_op_prefix 'distributions_rpm_rpm'
  publications_op_prefix 'publications_rpm_rpm'
  repository_versions_op_prefix 'repositories_rpm_rpm_versions'

  default_managed_content_type Katello::Rpm::CONTENT_TYPE
  content_type Katello::Rpm,
    :priority => 1,
    :pulp3_service_class => ::Katello::Pulp3::Rpm,
    :primary_content => true,
    :removable => true,
    :uploadable => true
  content_type Katello::ModuleStream,
    :priority => 2,
    :pulp3_service_class => ::Katello::Pulp3::ModuleStream,
    :primary_content => true
  content_type Katello::Erratum, :priority => 3,
    :pulp3_service_class => ::Katello::Pulp3::Erratum,
    :primary_content => true, :mutable => true
  content_type Katello::PackageGroup,
    :pulp3_service_class => ::Katello::Pulp3::PackageGroup
  content_type Katello::Srpm,
    :pulp3_service_class => ::Katello::Pulp3::Srpm,
    :removable => true, :uploadable => true
  content_type Katello::Distribution, :priority => 4,
    :pulp3_service_class => ::Katello::Pulp3::Distribution,
    :index => false
  content_type Katello::PackageCategory, :priority => 4, :index => false

  index_additional_data { |repo, target_repo = nil| repo.import_distribution_data(target_repo) }
end
