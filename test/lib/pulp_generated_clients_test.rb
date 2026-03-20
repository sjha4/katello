require 'katello_test_helper'

class PulpGeneratedClientsTest < ActiveSupport::TestCase
  EXPECTED_CLIENT_MODULES = {
    'PulpcoreClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        TasksApi TaskGroupsApi ArtifactsApi UploadsApi OrphansCleanupApi
        RepositoriesApi RepositoryVersionsApi ExportersPulpApi ImportersPulpApi
        ExportersPulpExportsApi ImportersPulpImportsApi SigningServicesApi
        RepairApi RepositoriesReclaimSpaceApi ExportersFilesystemApi
        ExportersFilesystemExportsApi ImportersPulpImportCheckApi
      ],
      model_classes: %w[
        TaskResponse Upload UploadCommit Repair Purge OrphansCleanup
      ],
    },
    'PulpRpmClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesRpmApi RepositoriesRpmVersionsApi RemotesRpmApi RemotesUlnApi
        DistributionsRpmApi PublicationsRpmApi RpmCopyApi
        ContentPackagegroupsApi ContentPackageenvironmentsApi
        ContentModulemdDefaultsApi ContentRepoMetadataFilesApi
        ContentDistributionTreesApi AcsRpmApi
      ],
      model_classes: %w[
        RpmRpmRemote RpmUlnRemote RpmRpmDistribution RpmRpmPublication
        RpmRepositorySyncURL Copy RepositoryAddRemoveContent
        RpmRpmAlternateContentSource AsyncOperationResponse
      ],
    },
    'PulpFileClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesFileApi RepositoriesFileVersionsApi RemotesFileApi
        DistributionsFileApi PublicationsFileApi AcsFileApi
      ],
      model_classes: %w[
        FileFileRemote FileFileDistribution FileFilePublication
        RepositorySyncURL RepositoryAddRemoveContent
        FileFileAlternateContentSource AsyncOperationResponse
      ],
    },
    'PulpContainerClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesContainerApi RepositoriesContainerVersionsApi
        RepositoriesContainerPushApi RemotesContainerApi RemotesPullThroughApi
        DistributionsContainerApi ContainerRecursiveAddApi
      ],
      model_classes: %w[
        ContainerContainerRemote ContainerContainerDistribution
        ContainerRepositorySyncURL RecursiveManage TagImage
        AsyncOperationResponse
      ],
    },
    'PulpDebClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesAptApi RepositoriesAptVersionsApi RemotesAptApi
        DistributionsAptApi PublicationsAptApi PublicationsVerbatimApi
        DebCopyApi ContentReleaseComponentsApi
      ],
      model_classes: %w[
        DebAptRemote DebAptDistribution DebAptPublication
        DebVerbatimPublication AptRepositorySyncURL
        Copy RepositoryAddRemoveContent AsyncOperationResponse
      ],
    },
    'PulpAnsibleClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesAnsibleApi RepositoriesAnsibleVersionsApi
        RemotesCollectionApi RemotesGitApi RemotesRoleApi
        DistributionsAnsibleApi AnsibleCopyApi
      ],
      model_classes: %w[
        AnsibleCollectionRemote AnsibleAnsibleDistribution
        AnsibleRepositorySyncURL Copy RepositoryAddRemoveContent
        AsyncOperationResponse
      ],
    },
    'PulpPythonClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesPythonApi RepositoriesPythonVersionsApi RemotesPythonApi
        DistributionsPypiApi PublicationsPypiApi ContentPackagesApi
      ],
      model_classes: %w[
        PythonPythonRemote PythonPythonDistribution PythonPythonPublication
        RepositorySyncURL PythonPythonPackageContentResponse
      ],
    },
    'PulpOstreeClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
      api_classes: %w[
        RepositoriesOstreeApi RepositoriesOstreeVersionsApi RemotesOstreeApi
        DistributionsOstreeApi ContentRefsApi
      ],
      model_classes: %w[
        OstreeOstreeRemote OstreeOstreeDistribution
        RepositorySyncURL
      ],
    },
    'PulpCertguardClient' => {
      api_client: 'ApiClient',
      configuration: 'Configuration',
    },
  }.freeze

  test "all expected client modules are defined" do
    EXPECTED_CLIENT_MODULES.each_key do |mod_name|
      assert Object.const_defined?(mod_name), "Expected module #{mod_name} to be defined"
    end
  end

  test "each client module has ApiClient and Configuration classes" do
    EXPECTED_CLIENT_MODULES.each do |mod_name, config|
      mod = Object.const_get(mod_name)

      api_client_class = config[:api_client]
      assert mod.const_defined?(api_client_class),
        "Expected #{mod_name}::#{api_client_class} to be defined"

      config_class = config[:configuration]
      assert mod.const_defined?(config_class),
        "Expected #{mod_name}::#{config_class} to be defined"
    end
  end

  test "each client module has expected API classes" do
    EXPECTED_CLIENT_MODULES.each do |mod_name, config|
      next unless config[:api_classes]
      mod = Object.const_get(mod_name)

      config[:api_classes].each do |api_class_name|
        assert mod.const_defined?(api_class_name),
          "Expected #{mod_name}::#{api_class_name} to be defined"
      end
    end
  end

  test "each client module has expected model classes" do
    EXPECTED_CLIENT_MODULES.each do |mod_name, config|
      next unless config[:model_classes]
      mod = Object.const_get(mod_name)

      config[:model_classes].each do |model_class_name|
        assert mod.const_defined?(model_class_name),
          "Expected #{mod_name}::#{model_class_name} to be defined"
      end
    end
  end

  test "ApiClient classes can be instantiated with Configuration" do
    EXPECTED_CLIENT_MODULES.each do |mod_name, config|
      mod = Object.const_get(mod_name)
      config_instance = mod.const_get(config[:configuration]).new
      api_client = mod.const_get(config[:api_client]).new(config_instance)
      assert_not_nil api_client, "#{mod_name}::#{config[:api_client]} instantiation returned nil"
    end
  end

  test "Configuration classes respond to host accessor" do
    EXPECTED_CLIENT_MODULES.each do |mod_name, config|
      mod = Object.const_get(mod_name)
      config_instance = mod.const_get(config[:configuration]).new
      assert_respond_to config_instance, :host, "#{mod_name}::Configuration should respond to :host"
      assert_respond_to config_instance, :host=, "#{mod_name}::Configuration should respond to :host="
    end
  end

  test "repository type registrations reference valid client classes" do
    Katello::RepositoryTypeManager.defined_repository_types.each do |type_id, repo_type|
      next unless repo_type.client_module_class

      assert repo_type.client_module_class.is_a?(Module),
        "Repository type #{type_id}: client_module_class should be a Module"
      assert_not_nil repo_type.api_class,
        "Repository type #{type_id}: api_class should not be nil"
      assert_not_nil repo_type.configuration_class,
        "Repository type #{type_id}: configuration_class should not be nil"
      assert_not_nil repo_type.remote_class,
        "Repository type #{type_id}: remote_class should not be nil"
      assert_not_nil repo_type.remotes_api_class,
        "Repository type #{type_id}: remotes_api_class should not be nil"
      assert_not_nil repo_type.repositories_api_class,
        "Repository type #{type_id}: repositories_api_class should not be nil"
      assert_not_nil repo_type.repository_versions_api_class,
        "Repository type #{type_id}: repository_versions_api_class should not be nil"
      assert_not_nil repo_type.distributions_api_class,
        "Repository type #{type_id}: distributions_api_class should not be nil"
      assert_not_nil repo_type.distribution_class,
        "Repository type #{type_id}: distribution_class should not be nil"
      assert_not_nil repo_type.repo_sync_url_class,
        "Repository type #{type_id}: repo_sync_url_class should not be nil"
    end
  end
end
