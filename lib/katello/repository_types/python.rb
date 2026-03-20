Katello::RepositoryTypeManager.register('python') do
  allow_creation_by_user true
  pulp3_service_class Katello::Pulp3::Repository::Generic
  pulp3_api_class Katello::Pulp3::Api::Generic
  pulp3_plugin 'python'
  pulp3_skip_publication false

  repositories_op_prefix 'repositories_python_python'
  remotes_op_prefix 'remotes_python_python'
  distributions_op_prefix 'distributions_python_pypi'
  publications_op_prefix 'publications_python_pypi'
  repository_versions_op_prefix 'repositories_python_python_versions'
  content_op_prefix 'content_python_packages'

  generic_remote_option :includes, title: N_("Includes"), type: Array, input_type: "textarea", delimiter: "\\n", default: [],
                        description: N_("Python packages to include from the upstream URL, names separated by newline. You may also specify versions, for example: django~=2.0. Leave empty to include every package.")

  generic_remote_option :excludes, title: N_("Excludes"), type: Array, input_type: "textarea", delimiter: "\\n", default: [],
                        description: N_("Python packages to exclude from the upstream URL, names separated by newline. You may also specify versions, for example: django~=2.0.")

  generic_remote_option :package_types, title: N_("Package Types"), type: Array, input_type: "text", delimiter: ",", default: [],
                        description: N_("Package types to sync for Python content, separated by comma. Leave empty to get every package type. Package types are: bdist_dmg,bdist_dumb,bdist_egg,bdist_msi,bdist_rpm,bdist_wheel,bdist_wininst,sdist.")

  generic_remote_option :keep_latest_packages, title: N_("Keep latest packages"), type: :number, input_type: "number", default: 0,
                        description: N_("The amount of latest versions of a package to keep on sync, includes pre-releases if synced. Default 0 keeps all versions.")

  url_description N_("URL of a PyPI content source such as https://pypi.org.")

  generic_content_type 'python_package',
                       pluralized_name: "Python Packages",
                       pulpcore_name: "python.python",
                       model_class: Katello::GenericContentUnit,
                       pulp3_api: 'content_python_packages',
                       pulp3_service_class: Katello::Pulp3::GenericContentUnit,
                       model_name: lambda { |pulp_unit| pulp_unit["name"] },
                       model_version: lambda { |pulp_unit| pulp_unit["version"] },
                       model_filename: lambda { |pulp_unit| pulp_unit["filename"] },
                       model_additional_metadata: lambda { |pulp_unit|
                         {
                           "package_type": pulp_unit["packagetype"],
                           "sha256": pulp_unit["sha256"],
                         }
                       },
                       removable: true,
                       uploadable: true,
                       duplicates_allowed: false,
                       filename_key: :filename,
                       generic_browser: true,
                       test_upload_path: 'test/fixtures/files/shelf_reader-0.1-py2-none-any.whl'
  default_managed_content_type :python_package

  test_url 'https://fixtures.pulpproject.org/python-pypi/'
  test_url_root_options generic_remote_options: {includes: ['celery']}.to_json
end
