module Actions
  module Pulp3
    module Repository
      class UploadFile < Pulp3::Abstract
        def plan(file)
          plan_self(:file => file)
        end

        def run
          offset = 0
          total_size = File.size(input[:file])
          response = ::Katello::Pulp3::PulpContentUnit.create_upload(total_size)
          upload_href = response._href
          fail ("Could not retreive href from uploads API") unless upload_href
          File.open(input[:file], "rb") do |file|
            while (chunk = tmp_file(file, upload_chunk_size))
              response = ::Katello::Pulp3::PulpContentUnit.upload_unit(chunk, content_range(offset, offset + upload_chunk_size, total_size), upload_href)
              offset += upload_chunk_size
              break if (offset + upload_chunk_size >= total_size)
            end
          end
          clean_temps(input[:file])
          if response
            upload_href = response._href
            response = ::Katello::Pulp3::PulpContentUnit.commit_upload(upload_href, checksum(input[:file]))
            artifact_href = ::Katello::Pulp3::PulpContentUnit.create_artifact_from_upload(upload_href, checksum(input[:file]))["_href"]
            output[:artifact_href] = artifact_href
          end
        end

        private

        def upload_chunk_size
          SETTINGS[:katello][:pulp][:upload_chunk_size]
        end

        def checksum(file)
          Digest::SHA256.hexdigest(File.read(file))
        end

        def content_range(start, finish, total)
          finish = finish > total ? total : finish
          "bytes #{start}-#{finish}/#{total}"
        end

        def tmp_file(file, upload_chunk_size)
          tmp_path = File.path(file) + "_tmp_upload"
          File.delete(tmp_path) if File.exist?(tmp_path)
          File.new(tmp_path,  'wb+', 0600)
          File.open(tmp_path, "wb+") do |temp_file|
            temp_file.write(file.read(upload_chunk_size))
          end
          tmp_path
        end

        def clean_temps(file)
          tmp_path = File.path(file) + "_tmp_upload"
          File.delete(tmp_path) if File.exist?(tmp_path)
        end

      end
    end
  end
end
