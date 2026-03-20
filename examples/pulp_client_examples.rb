# frozen_string_literal: true

# ============================================================================
# Pulp Spec-Driven Client Examples
# ============================================================================
#
# This file contains example code snippets for using the Katello spec-driven
# Pulp client. These examples can be run in the Rails console:
#
#   cd $GITDIR/foreman
#   bundle exec rails console
#
# Documentation: docs/pulp_spec_driven_client/

# ----------------------------------------------------------------------------
# Setup: Get a connection
# ----------------------------------------------------------------------------

smart_proxy = SmartProxy.pulp_primary
connection = Katello::PulpClient::Connection.new(smart_proxy)

# ----------------------------------------------------------------------------
# Basic: Check Pulp status
# ----------------------------------------------------------------------------

status = connection.call("status_read")
puts "Pulp version: #{status.versions}"
puts "Database OK: #{status.database_connection&.connected}"
puts "Redis OK: #{status.redis_connection&.connected}"

# ----------------------------------------------------------------------------
# Basic: List plugin versions
# ----------------------------------------------------------------------------

connection.spec_index.plugin_versions.each do |plugin, version|
  puts "#{plugin}: #{version}"
end

# ----------------------------------------------------------------------------
# Repositories: List RPM repositories
# ----------------------------------------------------------------------------

response = connection.call("repositories_rpm_rpm_list",
  params: { limit: 10, offset: 0 })

puts "Total repositories: #{response.count}"
response.results.each do |repo|
  puts "  #{repo.name} (#{repo.pulp_href})"
end

# ----------------------------------------------------------------------------
# Repositories: Create an RPM repository
# ----------------------------------------------------------------------------

new_repo = connection.call("repositories_rpm_rpm_create",
  body: {
    name: "example-repo-#{SecureRandom.hex(4)}",
    retain_package_versions: 0
  })

puts "Created: #{new_repo.pulp_href}"

# ----------------------------------------------------------------------------
# Repositories: Read a specific repository
# ----------------------------------------------------------------------------

repo = connection.call("repositories_rpm_rpm_read",
  params: { rpm_rpm_repository_href: new_repo.pulp_href })

puts "Name: #{repo.name}"
puts "Versions: #{repo.versions_href}"
puts "Latest version: #{repo.latest_version_href}"

# ----------------------------------------------------------------------------
# Repositories: Update a repository
# ----------------------------------------------------------------------------

connection.call("repositories_rpm_rpm_partial_update",
  params: { rpm_rpm_repository_href: new_repo.pulp_href },
  body: { retain_package_versions: 5 })

# ----------------------------------------------------------------------------
# Remotes: Create an RPM remote
# ----------------------------------------------------------------------------

remote = connection.call("remotes_rpm_rpm_create",
  body: {
    name: "example-remote-#{SecureRandom.hex(4)}",
    url: "https://fixtures.pulpproject.org/rpm-unsigned/",
    policy: "on_demand"
  })

puts "Remote created: #{remote.pulp_href}"

# ----------------------------------------------------------------------------
# Sync: Sync a repository from a remote
# ----------------------------------------------------------------------------

sync_response = connection.call("repositories_rpm_rpm_sync",
  params: { rpm_rpm_repository_href: new_repo.pulp_href },
  body: { remote: remote.pulp_href, mirror: false })

puts "Sync task: #{sync_response.task}"

# ----------------------------------------------------------------------------
# Tasks: Check task status
# ----------------------------------------------------------------------------

task = connection.call("tasks_read",
  params: { task_href: sync_response.task })

puts "State: #{task.state}"
puts "Started: #{task.started_at}"
puts "Finished: #{task.finished_at}"

task.progress_reports&.each do |report|
  puts "  #{report.message}: #{report.done}/#{report.total}"
end

# ----------------------------------------------------------------------------
# Tasks: List recent tasks
# ----------------------------------------------------------------------------

tasks = connection.call("tasks_list",
  params: { limit: 5, ordering: "-pulp_created" })

tasks.results.each do |t|
  puts "#{t.pulp_href} - #{t.state} (#{t.name})"
end

# ----------------------------------------------------------------------------
# Publications: Create an RPM publication
# ----------------------------------------------------------------------------

# First, get the latest version href
repo = connection.call("repositories_rpm_rpm_read",
  params: { rpm_rpm_repository_href: new_repo.pulp_href })

pub_response = connection.call("publications_rpm_rpm_create",
  body: {
    repository_version: repo.latest_version_href,
    checksum_type: "sha256"
  })

puts "Publication task: #{pub_response.task}"

# ----------------------------------------------------------------------------
# Distributions: Create an RPM distribution
# ----------------------------------------------------------------------------

dist_response = connection.call("distributions_rpm_rpm_create",
  body: {
    name: "example-dist-#{SecureRandom.hex(4)}",
    base_path: "example/path",
    publication: "/pulp/api/v3/publications/rpm/rpm/some-uuid/"
  })

puts "Distribution task: #{dist_response.task}"

# ----------------------------------------------------------------------------
# Content: List RPM packages in a repository version
# ----------------------------------------------------------------------------

packages = connection.call("content_rpm_packages_list",
  params: {
    repository_version: repo.latest_version_href,
    limit: 10
  })

puts "Total packages: #{packages.count}"
packages.results.each do |pkg|
  puts "  #{pkg.name}-#{pkg.version}-#{pkg.release}.#{pkg.arch}"
end

# ----------------------------------------------------------------------------
# Pagination: Fetch all results across pages
# ----------------------------------------------------------------------------

def fetch_all(connection, operation_id, params: {})
  page_size = 100
  offset = 0
  all_results = []

  loop do
    response = connection.call(operation_id,
      params: params.merge(limit: page_size, offset: offset))
    all_results.concat(response.results)
    offset += page_size
    break unless response.count && offset < response.count
  end

  all_results
end

all_repos = fetch_all(connection, "repositories_rpm_rpm_list")
puts "Found #{all_repos.length} RPM repositories"

# ----------------------------------------------------------------------------
# Error handling: Catching API errors
# ----------------------------------------------------------------------------

begin
  connection.call("repositories_rpm_rpm_read",
    params: { rpm_rpm_repository_href: "/pulp/api/v3/repositories/rpm/rpm/nonexistent/" })
rescue Katello::PulpClient::ApiError => e
  puts "Error: #{e.message}"
  puts "Status: #{e.status}"
  puts "Body: #{e.body}"
end

# ----------------------------------------------------------------------------
# Error handling: Ignore 404s
# ----------------------------------------------------------------------------

result = begin
  connection.call("remotes_rpm_rpm_delete",
    params: { rpm_rpm_remote_href: "/pulp/api/v3/remotes/rpm/rpm/nonexistent/" })
rescue Katello::PulpClient::ApiError => e
  raise e unless e.code == 404
  nil
end

puts result.nil? ? "Not found (ignored)" : "Deleted"

# ----------------------------------------------------------------------------
# Feature gating: Check capabilities before calling
# ----------------------------------------------------------------------------

spec_index = connection.spec_index

if Katello::PulpClient::Quirks::Capabilities.reclaim_space_supported?(spec_index)
  puts "Reclaim space is supported"
else
  puts "Reclaim space is NOT supported on this Pulp version"
end

if Katello::PulpClient::Quirks::Capabilities.plugin_version_gte?(spec_index, 'rpm', '3.30')
  puts "pulp_rpm >= 3.30"
end

# ----------------------------------------------------------------------------
# Discovery: Browse available operations
# ----------------------------------------------------------------------------

# List all operation IDs containing "rpm"
rpm_ops = connection.spec_index.operations.keys.grep(/rpm/).sort
puts "RPM operations (#{rpm_ops.length}):"
rpm_ops.each { |op| puts "  #{op}" }

# Get details for a specific operation
op = connection.spec_index.lookup("repositories_rpm_rpm_sync")
puts "\nrepositories_rpm_rpm_sync:"
puts "  Method: #{op[:method]}"
puts "  Path: #{op[:path]}"
puts "  Path params: #{op[:path_params]}"
puts "  Query params: #{op[:query_params]}"

# ----------------------------------------------------------------------------
# Cleanup: Delete test resources
# ----------------------------------------------------------------------------

# Delete the repository (async)
begin
  connection.call("repositories_rpm_rpm_delete",
    params: { rpm_rpm_repository_href: new_repo.pulp_href })
rescue Katello::PulpClient::ApiError => e
  puts "Cleanup error: #{e.message}" unless e.code == 404
end

# Delete the remote (async)
begin
  connection.call("remotes_rpm_rpm_delete",
    params: { rpm_rpm_remote_href: remote.pulp_href })
rescue Katello::PulpClient::ApiError => e
  puts "Cleanup error: #{e.message}" unless e.code == 404
end

puts "Cleanup complete."
