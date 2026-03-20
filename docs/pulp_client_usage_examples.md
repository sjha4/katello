# PulpClient Usage Examples

## Overview

The spec-driven PulpClient replaces the 9 generated Pulp client gems with a single
module (~350 lines) that fetches the OpenAPI spec at runtime and routes calls by
`operation_id`.

## Basic Usage

```ruby
# Create a connection (spec is fetched lazily on first call)
connection = Katello::PulpClient::Connection.new(smart_proxy)

# List tasks
response = connection.call('tasks_list', params: { limit: 10, offset: 0 })
response.results.each do |task|
  puts "#{task.pulp_href} - #{task.state}"
end
puts "Total: #{response.count}"

# Read a single task
response = connection.call('tasks_read',
  params: { pulp_id: 'abc-123' })
puts response.state  # => "completed"
```

## Repository Operations

```ruby
# List RPM repositories
repos = connection.call('repositories_rpm_rpm_list',
  params: { name: 'my-repo', limit: 10 })

# Create an RPM repository
new_repo = connection.call('repositories_rpm_rpm_create',
  body: { name: 'my-new-repo', description: 'A test repository' })
puts new_repo.pulp_href

# Sync a repository
task = connection.call('repositories_rpm_rpm_sync',
  params: { rpm_rpm_repository_href: repo_href },
  body: { remote: remote_href, mirror: true })
puts task.task  # => task href to poll
```

## Remotes

```ruby
# Create an RPM remote
remote = connection.call('remotes_rpm_rpm_create',
  body: {
    name: 'centos-remote',
    url: 'https://mirror.centos.org/centos/8/BaseOS/x86_64/os/',
    policy: 'on_demand',
  })

# Update a remote
connection.call('remotes_rpm_rpm_partial_update',
  params: { rpm_rpm_remote_href: remote.pulp_href },
  body: { url: 'https://new-mirror.example.com/repo/' })

# Delete a remote
connection.call('remotes_rpm_rpm_delete',
  params: { rpm_rpm_remote_href: remote.pulp_href })
```

## Distributions

```ruby
# Create a distribution
task = connection.call('distributions_rpm_rpm_create',
  body: {
    name: 'my-distribution',
    base_path: 'my-repo',
    repository: repo_href,
  })

# List distributions
dists = connection.call('distributions_rpm_rpm_list',
  params: { base_path: 'my-repo' })
```

## Error Handling

```ruby
begin
  connection.call('repositories_rpm_rpm_read',
    params: { rpm_rpm_repository_href: '/pulp/api/v3/repos/nonexistent/' })
rescue Katello::PulpClient::ApiError => e
  puts e.status        # => 404
  puts e.operation_id  # => "repositories_rpm_rpm_read"
  puts e.body          # => {"detail"=>"Not found."}
  puts e.code          # => 404 (alias for status, compatible with old gems)
end
```

## Checking Capabilities

```ruby
index = connection.spec_index

# Check plugin version
if Katello::PulpClient::Quirks::Capabilities.plugin_version_gte?(index, 'rpm', '3.25.0')
  # Use newer API feature
end

# Check if operation exists
if Katello::PulpClient::Quirks::Capabilities.operation_available?(index, 'repositories_reclaim_space_reclaim')
  connection.call('repositories_reclaim_space_reclaim', body: { repo_hrefs: [href] })
end
```

## Pre-loading Spec (Testing)

```ruby
# For tests, pre-load the spec to avoid HTTP calls
spec_json = JSON.parse(File.read('test/fixtures/pulp_api_spec.json'))
connection = Katello::PulpClient::Connection.new(smart_proxy, spec: spec_json)
```

## Multiple SmartProxy Support

```ruby
# Each proxy gets its own connection with isolated SSL/auth config
primary = Katello::PulpClient::Connection.new(SmartProxy.pulp_primary)
mirror  = Katello::PulpClient::Connection.new(capsule_proxy)

# They can have different Pulp versions / plugins
primary.plugin_versions  # => {"core"=>"3.49.0", "rpm"=>"3.25.0", ...}
mirror.plugin_versions   # => {"core"=>"3.45.0", "rpm"=>"3.22.0", ...}
```

## Pagination Helper

```ruby
# Fetch all results across pages
def fetch_all(connection, operation_id, page_size: 100, **extra_params)
  results = []
  offset = 0
  loop do
    response = connection.call(operation_id,
      params: { limit: page_size, offset: offset }.merge(extra_params))
    results.concat(response.results)
    break if results.size >= (response.count || 0)
    offset += page_size
  end
  results
end

all_tasks = fetch_all(connection, 'tasks_list')
```

## File Uploads

```ruby
# Upload a file artifact
upload_io = Faraday::UploadIO.new('/path/to/file.rpm', 'application/octet-stream')
artifact = connection.call('artifacts_create',
  uploads: { file: upload_io },
  body: { sha256: 'abc123...' })
puts artifact.pulp_href
```
