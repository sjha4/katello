namespace :katello do
  namespace :pulp do
    PULP_PLUGINS = {
      'pulpcore' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=core',
        module_name: 'PulpcoreClient',
        gem_name: 'pulpcore_client'
      },
      'pulp_rpm' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=rpm',
        module_name: 'PulpRpmClient',
        gem_name: 'pulp_rpm_client'
      },
      'pulp_file' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=file',
        module_name: 'PulpFileClient',
        gem_name: 'pulp_file_client'
      },
      'pulp_container' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=container',
        module_name: 'PulpContainerClient',
        gem_name: 'pulp_container_client'
      },
      'pulp_deb' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=deb',
        module_name: 'PulpDebClient',
        gem_name: 'pulp_deb_client'
      },
      'pulp_ansible' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=ansible',
        module_name: 'PulpAnsibleClient',
        gem_name: 'pulp_ansible_client'
      },
      'pulp_certguard' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=certguard',
        module_name: 'PulpCertguardClient',
        gem_name: 'pulp_certguard_client'
      },
      'pulp_python' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=python',
        module_name: 'PulpPythonClient',
        gem_name: 'pulp_python_client'
      },
      'pulp_ostree' => {
        spec_path: 'pulp/api/v3/docs/api.json?bindings&component=ostree',
        module_name: 'PulpOstreeClient',
        gem_name: 'pulp_ostree_client'
      }
    }.freeze

    desc "Fetch OpenAPI specs from Pulp primary SmartProxy for all plugins"
    task :update_specs => :environment do
      require 'net/http'
      require 'json'
      require 'uri'
      require 'openssl'

      smart_proxy = SmartProxy.pulp_primary
      unless smart_proxy
        puts "ERROR: No Pulp primary SmartProxy found. Ensure a Pulp server is configured."
        exit 1
      end

      base_url = smart_proxy.pulp3_url('')
      puts "Fetching OpenAPI specs from Pulp primary: #{base_url}"

      specs_dir = Katello::Engine.root.join('vendor', 'pulp_openapi_specs').to_s
      FileUtils.mkdir_p(specs_dir)

      ssl_ca_file = ::Cert::Certs.backend_ca_cert_file(:pulp)
      client_cert = smart_proxy.setting(SmartProxy::PULP3_FEATURE, 'client_cert') ||
                    ::Cert::Certs.ssl_client_cert_filename
      client_key = smart_proxy.setting(SmartProxy::PULP3_FEATURE, 'client_key') ||
                   ::Cert::Certs.ssl_client_key_filename

      success_count = 0
      error_count = 0

      PULP_PLUGINS.each do |plugin_name, plugin_config|
        spec_url = "#{base_url.sub(%r{/$}, '')}/#{plugin_config[:spec_path]}"
        output_file = File.join(specs_dir, "#{plugin_name}.json")

        print "  Fetching #{plugin_name}... "

        begin
          uri = URI.parse(spec_url)
          http = Net::HTTP.new(uri.host, uri.port)

          if uri.scheme == 'https'
            http.use_ssl = true
            http.ca_file = ssl_ca_file if ssl_ca_file && File.exist?(ssl_ca_file)
            http.cert = OpenSSL::X509::Certificate.new(File.read(client_cert)) if client_cert && File.exist?(client_cert)
            http.key = OpenSSL::PKey::RSA.new(File.read(client_key)) if client_key && File.exist?(client_key)
            http.verify_mode = OpenSSL::SSL::VERIFY_PEER
          end

          request = Net::HTTP::Get.new(uri.request_uri)

          username = smart_proxy.setting(SmartProxy::PULP3_FEATURE, 'username')
          password = smart_proxy.setting(SmartProxy::PULP3_FEATURE, 'password')
          request.basic_auth(username, password) if username && password

          response = http.request(request)

          if response.code.to_i == 200
            spec = JSON.parse(response.body)
            File.write(output_file, JSON.pretty_generate(spec))
            puts "OK (#{File.size(output_file)} bytes)"
            success_count += 1
          else
            puts "FAILED (HTTP #{response.code})"
            error_count += 1
          end
        rescue => e
          puts "ERROR: #{e.message}"
          error_count += 1
        end
      end

      puts "\nSpec fetch complete: #{success_count} succeeded, #{error_count} failed"
      exit 1 if error_count > 0
    end

    desc "Remove all generated Pulp clients"
    task :clear_generated do
      clients_dir = Katello::Engine.root.join('lib', 'pulp_generated_clients').to_s
      if Dir.exist?(clients_dir)
        PULP_PLUGINS.each_value do |plugin_config|
          client_dir = File.join(clients_dir, plugin_config[:gem_name])
          if Dir.exist?(client_dir)
            FileUtils.rm_rf(client_dir)
            puts "  Removed #{client_dir}"
          end
        end
      end
      puts "Generated clients cleared."
    end

    desc "Generate Ruby clients from vendored OpenAPI specs using openapi-generator"
    task :generate_clients do
      require 'fileutils'

      generator = ENV.fetch('OPENAPI_GENERATOR', 'openapi-generator-cli')

      unless system("which #{generator} > /dev/null 2>&1")
        puts "ERROR: '#{generator}' not found in PATH."
        puts "Install it via: npm install @openapitools/openapi-generator-cli -g"
        puts "Or set OPENAPI_GENERATOR env var to the correct path."
        exit 1
      end

      specs_dir = Katello::Engine.root.join('vendor', 'pulp_openapi_specs').to_s
      clients_dir = Katello::Engine.root.join('lib', 'pulp_generated_clients').to_s
      FileUtils.mkdir_p(clients_dir)

      success_count = 0
      error_count = 0

      PULP_PLUGINS.each do |plugin_name, plugin_config|
        spec_file = File.join(specs_dir, "#{plugin_name}.json")
        output_dir = File.join(clients_dir, plugin_config[:gem_name])

        unless File.exist?(spec_file)
          puts "  SKIP #{plugin_name}: spec file not found at #{spec_file}"
          puts "       Run 'rake katello:pulp:update_specs' first."
          error_count += 1
          next
        end

        print "  Generating #{plugin_config[:gem_name]}... "

        begin
          # Fix security schemes in spec (Pulp specs have issues for Ruby generation)
          spec_data = JSON.parse(File.read(spec_file))
          if spec_data['components'] && spec_data['components']['securitySchemes']
            # Remove cookieAuth - Katello doesn't use it and it causes Ruby syntax errors ('in' keyword)
            spec_data['components']['securitySchemes'].delete('cookieAuth')

            spec_data['components']['securitySchemes'].each do |name, scheme|
              # Fix invalid 'mutualTLS' type - convert to http
              if scheme['type'] == 'mutualTLS'
                scheme['type'] = 'http'
              end
              # Add default type if still missing
              scheme['type'] ||= 'http'
              # Ensure basicAuth uses correct type
              if name.downcase.include?('basic') || (scheme['scheme'] && scheme['scheme'] == 'basic')
                scheme['type'] = 'http'
                scheme['scheme'] = 'basic'
              end
            end

            # Also remove cookieAuth from security requirements in operations
            if spec_data['paths']
              spec_data['paths'].each do |path, path_item|
                path_item.each do |method, operation|
                  next unless operation.is_a?(Hash) && operation['security']
                  operation['security'].delete_if { |req| req.key?('cookieAuth') }
                end
              end
            end

            File.write(spec_file, JSON.pretty_generate(spec_data))
          end

          FileUtils.rm_rf(output_dir)

          # Use Pulp team's proven approach and templates
          # Determine generator version based on Pulp version (from their gen-client.sh)
          generator_version = 'v7.10.0'  # For Pulp 3.70+
          template_dir = Katello::Engine.root.join('lib', 'pulp_openapi_templates', 'ruby', generator_version)

          cmd = [
            generator, 'generate',
            '-i', spec_file,
            '-g', 'ruby',
            '-o', output_dir,
            '--additional-properties', [
              "gemName=#{plugin_config[:gem_name]}",
              "gemVersion=1.0.0",
              "gemLicense=GPLv2+",
              "gemHomepage=https://github.com/pulp/#{plugin_name}",
              "library=faraday"
            ].join(','),
            '--skip-validate-spec',
            '--strict-spec=false'
          ]

          # Add custom templates if they exist (Pulp's proven templates fix syntax issues)
          if File.directory?(template_dir)
            cmd += ['-t', template_dir.to_s]
          end

          output = `#{cmd.join(' ')} 2>&1`
          if $?.success?
            %w[spec docs .gitignore .gitlab-ci.yml .travis.yml git_push.sh .rspec .rubocop.yml].each do |unnecessary|
              path = File.join(output_dir, unnecessary)
              FileUtils.rm_rf(path) if File.exist?(path) || Dir.exist?(path)
            end

            puts "OK"
            success_count += 1
          else
            puts "FAILED"
            $stderr.puts output
            error_count += 1
          end
        rescue => e
          puts "ERROR: #{e.message}"
          error_count += 1
        end
      end

      puts "\nClient generation complete: #{success_count} succeeded, #{error_count} failed"
      exit 1 if error_count > 0
    end

    desc "Fetch specs and generate clients in one step"
    task :update_and_generate => [:update_specs, :clear_generated, :generate_clients]

    desc "Copy Pulp client code from installed gems (RECOMMENDED - more reliable than generation)"
    task :copy_from_gems do
      require 'fileutils'

      clients_dir = Katello::Engine.root.join('lib', 'pulp_generated_clients').to_s
      FileUtils.mkdir_p(clients_dir)

      puts "Copying Pulp client code from installed gems..."
      puts "This uses proven, tested code from the Pulp team instead of generating from specs.\n\n"

      success_count = 0
      error_count = 0

      PULP_PLUGINS.each do |plugin_name, plugin_config|
        gem_name = plugin_config[:gem_name]
        output_dir = File.join(clients_dir, gem_name)

        print "  Copying #{gem_name}... "

        begin
          # Find the gem's installation path
          gem_path = `gem which #{gem_name} 2>/dev/null`.strip
          if gem_path.empty? || !File.exist?(gem_path)
            puts "SKIP (gem not installed - run: gem install #{gem_name})"
            error_count += 1
            next
          end

          # Gem lib is in the parent directory of the .rb file
          gem_lib_dir = File.dirname(File.dirname(gem_path))

          unless File.directory?(gem_lib_dir)
            puts "FAILED (couldn't find gem lib directory)"
            error_count += 1
            next
          end

          # Clear and copy
          FileUtils.rm_rf(output_dir)
          FileUtils.mkdir_p(output_dir)
          FileUtils.cp_r("#{gem_lib_dir}/.", output_dir)

          # Remove unnecessary files
          %w[spec .gitignore .gitlab-ci.yml .travis.yml git_push.sh .rspec .rubocop.yml].each do |unnecessary|
            path = File.join(output_dir, unnecessary)
            FileUtils.rm_rf(path) if File.exist?(path) || Dir.exist?(path)
          end

          puts "OK (from #{gem_lib_dir})"
          success_count += 1
        rescue => e
          puts "ERROR: #{e.message}"
          error_count += 1
        end
      end

      puts "\nCopy complete: #{success_count} succeeded, #{error_count} failed"
      if success_count > 0
        puts "\n✓ RECOMMENDATION: Use copy_from_gems for production updates."
        puts "  Gem code is battle-tested and reliable (no syntax/API errors)."
      end
      exit 1 if error_count > 0
    end
  end
end
