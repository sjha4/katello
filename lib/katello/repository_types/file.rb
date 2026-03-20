Katello::RepositoryTypeManager.register(::Katello::Repository::FILE_TYPE) do
  allow_creation_by_user true
  pulp3_service_class Katello::Pulp3::Repository::File
  pulp3_api_class Katello::Pulp3::Api::File
  pulp3_plugin 'file'
  pulp3_skip_publication false

  repositories_op_prefix 'repositories_file_file'
  remotes_op_prefix 'remotes_file_file'
  distributions_op_prefix 'distributions_file_file'
  publications_op_prefix 'publications_file_file'
  repository_versions_op_prefix 'repositories_file_file_versions'

  content_type Katello::FileUnit,
               :pulp3_service_class => ::Katello::Pulp3::FileUnit,
               :removable => true,
               :uploadable => true
  default_managed_content_type Katello::FileUnit::CONTENT_TYPE
end
