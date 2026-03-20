Katello::RepositoryTypeManager.register(::Katello::Repository::ANSIBLE_COLLECTION_TYPE) do
  allow_creation_by_user true
  pulp3_skip_publication true
  pulp3_service_class Katello::Pulp3::Repository::AnsibleCollection
  pulp3_api_class Katello::Pulp3::Api::AnsibleCollection
  pulp3_plugin 'ansible'

  repositories_op_prefix 'repositories_ansible_ansible'
  remotes_op_prefix 'remotes_ansible_collection'
  distributions_op_prefix 'distributions_ansible_ansible'
  repository_versions_op_prefix 'repositories_ansible_ansible_versions'

  content_type Katello::AnsibleCollection, :pulp3_service_class => ::Katello::Pulp3::AnsibleCollection, :user_removable => true, generic_browser: true
  default_managed_content_type :ansible_collections
end
