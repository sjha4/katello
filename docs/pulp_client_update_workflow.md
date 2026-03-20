# Pulp Client Update Workflow

This document describes the workflow for updating vendored Pulp API clients when upgrading Pulp or its plugins.

## Overview

Katello vendors Pulp API clients as generated Ruby code instead of depending on external gems. The clients are generated from OpenAPI specifications fetched directly from a running Pulp instance using `openapi-generator`.

### Pulp Client Modules

| Client Module | Pulp Component | OpenAPI Spec Endpoint |
|---|---|---|
| `PulpcoreClient` | Pulp Core | `/pulp/api/v3/docs/api.json` |
| `PulpFileClient` | pulp_file | `/pulp/api/v3/docs/api.json?plugin=pulp_file` |
| `PulpRpmClient` | pulp_rpm | `/pulp/api/v3/docs/api.json?plugin=pulp_rpm` |
| `PulpAnsibleClient` | pulp_ansible | `/pulp/api/v3/docs/api.json?plugin=pulp_ansible` |
| `PulpContainerClient` | pulp_container | `/pulp/api/v3/docs/api.json?plugin=pulp_container` |
| `PulpDebClient` | pulp_deb | `/pulp/api/v3/docs/api.json?plugin=pulp_deb` |
| `PulpCertguardClient` | pulp_certguard | `/pulp/api/v3/docs/api.json?plugin=pulp_certguard` |
| `PulpPythonClient` | pulp_python | `/pulp/api/v3/docs/api.json?plugin=pulp_python` |
| `PulpOstreeClient` | pulp_ostree | `/pulp/api/v3/docs/api.json?plugin=pulp_ostree` |

## Prerequisites

- A running Pulp instance with the target version installed
- `openapi-generator-cli` installed (via npm, Homebrew, or Docker)
- Ruby development environment with Bundler

## Step-by-Step Update Workflow

### 1. Identify the Target Pulp Version

Determine which Pulp components are being upgraded and their new versions. Check the Pulp release notes for any API-breaking changes:

- [Pulp Core Changelog](https://docs.pulpproject.org/pulpcore/changes.html)
- Individual plugin changelogs (e.g., pulp_rpm, pulp_file)

### 2. Set Up a Pulp Instance with the Target Version

Ensure you have a Pulp instance running the exact version you want to target. This can be:

- A development VM provisioned with forklift
- A container-based Pulp deployment
- An existing environment upgraded to the target version

### 3. Fetch Updated OpenAPI Specifications

Use the spec fetcher rake task to download specs from the running Pulp instance:

```bash
cd $GITDIR/foreman
bundle exec rake katello:pulp:fetch_specs PULP_URL=https://your-pulp-instance
```

This downloads the OpenAPI JSON specs to `vendor/pulp/specs/`. Review the fetched specs to confirm they match the expected Pulp version.

### 4. Regenerate the Ruby Clients

Run the client generator rake task:

```bash
cd $GITDIR/foreman
bundle exec rake katello:pulp:generate_clients
```

This generates Ruby client code from the specs into `app/lib/katello/pulp3/generated_clients/`.

Each client is generated into its own subdirectory:

```
app/lib/katello/pulp3/generated_clients/
  pulpcore_client/
  pulp_file_client/
  pulp_rpm_client/
  pulp_ansible_client/
  pulp_container_client/
  pulp_deb_client/
  pulp_certguard_client/
  pulp_python_client/
  pulp_ostree_client/
```

### 5. Review Generated Changes

Inspect the diff of generated code:

```bash
cd $GITDIR/katello
git diff app/lib/katello/pulp3/generated_clients/
```

Pay attention to:

- **New API methods** -- May indicate new Pulp features you can leverage.
- **Removed API methods** -- May break existing Katello code. Search for usages.
- **Changed method signatures** -- Parameters added, removed, or renamed.
- **New or renamed model classes** -- Check if Katello references these directly.

### 6. Update Katello Code for API Changes

If the Pulp API introduced breaking changes, update Katello code accordingly:

1. **Search for removed/renamed classes:**
   ```bash
   grep -r "OldClassName" app/services/katello/pulp3/ lib/monkeys/
   ```

2. **Check monkey patches** in `lib/monkeys/` -- These patch Pulp client classes directly and are the most fragile:
   - `pulp_polymorphic_remote_response.rb`
   - `fix_rpm_repository_gpgcheck.rb`
   - `remove_hidden_distribution.rb`

3. **Check repository type registrations** in `lib/katello/repository_types/` -- These reference specific client classes.

4. **Check API wrapper classes** in `app/services/katello/pulp3/api/` -- These instantiate client API objects.

### 7. Run the Test Suite

```bash
cd $GITDIR/foreman

# Run all Katello tests
bundle exec rake test:katello

# Run Pulp-specific tests
cd $GITDIR/katello
ktest test/lib/monkeys/pulp_polymorphic_remote_response_test.rb
ktest test/models/pulp_database_unit_test.rb
```

### 8. Update VCR Cassettes (if needed)

If Pulp API responses have changed format, VCR cassettes may need regeneration:

```bash
cd $GITDIR/katello
# Delete outdated cassettes and re-record
rm test/fixtures/vcr_cassettes/katello/services/pulp3/<affected_cassettes>.yml
ktest test/path/to/affected_test.rb  # Will re-record cassettes
```

### 9. Commit and Submit

```bash
cd $GITDIR/katello
git add vendor/pulp/specs/
git add app/lib/katello/pulp3/generated_clients/
git add -p  # Stage any Katello code changes
git commit -m "Update Pulp clients to <version>"
```

## Verifying the Update

After updating clients, verify the integration works end-to-end:

1. **Start the development server** and confirm Pulp connectivity:
   ```bash
   curl https://$(hostname)/api/v2/ping
   ```

2. **Test content sync** for each content type (RPM, File, Container, Deb, etc.)

3. **Test content view publish and promote**

4. **Check Pulp status page** in the Foreman UI under Infrastructure > Smart Proxies

## Rolling Back

If an update causes issues:

1. Revert the generated client changes:
   ```bash
   git checkout -- app/lib/katello/pulp3/generated_clients/
   git checkout -- vendor/pulp/specs/
   ```

2. Ensure the Pulp instance version matches the reverted client specs.

## Partial Updates

You can regenerate a single client if only one Pulp plugin was updated:

```bash
cd $GITDIR/foreman
bundle exec rake katello:pulp:generate_clients PLUGIN=pulp_rpm
```

## Updating the OpenAPI Generator Version

The `openapi-generator` tool itself may need updating. When doing so:

1. Update the version in development dependencies.
2. Regenerate **all** clients to ensure consistent output.
3. Run the full test suite, as generator version changes can produce different code structure.

## Related Documentation

- [Troubleshooting Guide](./pulp_generated_clients_troubleshooting.md)
- [Katello Development & Troubleshooting](../developer_docs/development_and_troubleshooting.md)
