Katello::RepositoryTypeManager.register(::Katello::Repository::DEB_TYPE) do
  pulp3_service_class Katello::Pulp3::Repository::Apt
  pulp3_api_class Katello::Pulp3::Api::Apt
  pulp3_plugin 'deb'
  pulp3_skip_publication false
  prevent_unneeded_metadata_publish

  repositories_op_prefix 'repositories_deb_apt'
  remotes_op_prefix 'remotes_deb_apt'
  distributions_op_prefix 'distributions_deb_apt'
  publications_op_prefix 'publications_deb_apt'
  repository_versions_op_prefix 'repositories_deb_apt_versions'

  default_managed_content_type Katello::Deb::CONTENT_TYPE
  content_type Katello::Deb,
    :pulp3_service_class => ::Katello::Pulp3::Deb,
    :removable => true,
    :uploadable => true
end
