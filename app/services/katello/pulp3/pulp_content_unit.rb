require 'set'
require 'pulp_file_client'
require 'pulpcore_client'

module Katello
  module Pulp3
    class PulpContentUnit
      # Any class that extends this class should define:
      # Class#update_model

      def self.content_api
        fail NotImplementedError
      end

      def update_model
        fail NotImplementedError
      end

      attr_accessor :uuid
      attr_writer :backend_data

      def initialize(uuid)
        self.uuid = uuid
      end

      def self.model_class
        Katello::RepositoryTypeManager.model_class(self)
      end

      def self.unit_identifier
        "_href"
      end

      def self.core_api_client
        PulpcoreClient::ApiClient.new(SmartProxy.pulp_master!.pulp3_configuration(PulpcoreClient::Configuration))
      end

      def self.uploads_api
        PulpcoreClient::UploadsApi.new(core_api_client)
      end

      def self.pulp_units_batch_for_repo(repository, page_size = SETTINGS[:katello][:pulp][:bulk_load_size])
        repository_version_href = repository.version_href
        page_opts = { "page" => 1, repository_version: repository_version_href, page_size: page_size}
        response = {}
        Enumerator.new do |yielder|
          loop do
            page_opts = page_opts.with_indifferent_access
            break unless (response["next"] || page_opts["page"] == 1)
            response = fetch_content_list page_opts
            response = response.as_json.with_indifferent_access
            yielder.yield response[:results]
            page_opts[:page] += 1
          end
        end
      end

      def self.pulp_data(href)
        content_unit = self.class.content_api.read(href)
        content_unit.as_json
      end

      def self.content_unit_list(page_opts)
        self.content_api.list page_opts
      end

      def backend_data
        @backend_data ||= fetch_backend_data
        @backend_data.try(:with_indifferent_access)
      end

      def fetch_backend_data
        self.class.pulp_data(self.uuid)
      end

      def self.fetch_content_list(page_opts)
        content_unit_list page_opts
      end

      def self.upload_unit(chunk_file, content_range, upload_href)
        if upload_href
          response = uploads_api.update(upload_href, content_range, chunk_file)
        else
          fail("Upload href not provided")
        end
        response
      rescue PulpcoreClient::ApiError => e
        puts "Exception when calling UploadsApi : #{e}"
        nil
      end

      def self.create_upload(total_size)
        upload_data = PulpcoreClient::Upload.new({size: total_size
                                                 })
        response = uploads_api.create(upload_data)
      end

      def self.upload_unit_once(chunk, offset = 0, upload_href = nil)
        response = SmartProxy.pulp_master!.pulp3_api.uploads_create_and_check(chunk, Digest::MD5.hexdigest(File.read(chunk)))
      rescue PulpcoreClient::ApiError => e
        puts "Exception when calling UploadsApi : #{e}"
        nil
      end

      def self.commit_upload(upload_href, checksum)
        upload_commit_data = PulpcoreClient::Upload.new({sha256: checksum
                                                 })
        response = uploads_api.commit(upload_href, upload_commit_data)
      end
      # Returns Instance of PulpcoreClient::Artifact
      def self.create_artifact_from_upload(upload_href, checksum)
        opts = {
            md5: checksum,
            upload: upload_href
        }
        response = SmartProxy.pulp_master!.pulp3_api.artifacts_create(opts)
      end
    end
  end
end
