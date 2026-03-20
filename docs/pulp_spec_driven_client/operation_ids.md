# Pulp Operation ID Reference

Operation IDs are the keys used with `pulp_connection.call()`. They come from the OpenAPI spec served by each Pulp instance at `/pulp/api/v3/docs/api.json`.

This document lists the operation IDs most commonly used by Katello. For a complete list, query the spec directly from your Pulp instance (see [Finding Operation IDs](#finding-operation-ids)).

## Naming Convention

Operation IDs follow a predictable pattern:

```
{resource}_{plugin}_{type}_{action}
```

Standard actions:
- `_list` - List resources (GET, paginated)
- `_create` - Create resource (POST)
- `_read` - Read single resource (GET)
- `_update` - Full update (PUT)
- `_partial_update` - Partial update (PATCH)
- `_delete` - Delete resource (DELETE)
- `_sync` - Trigger sync (POST)
- `_modify` - Add/remove content units (POST)

## Core (pulpcore)

### Tasks

| Operation ID | Description |
|-------------|-------------|
| `tasks_list` | List tasks |
| `tasks_read` | Read task details |
| `tasks_cancel` | Cancel a running task |
| `tasks_purge` | Purge completed tasks |
| `task_groups_read` | Read task group |

### Repositories (Generic)

| Operation ID | Description |
|-------------|-------------|
| `repositories_list` | List all repositories (all types) |
| `repository_versions_list` | List all repository versions |

### Uploads

| Operation ID | Description |
|-------------|-------------|
| `uploads_create` | Create upload |
| `uploads_update` | Upload chunk |
| `uploads_commit` | Commit upload |
| `uploads_delete` | Delete upload |

### Artifacts

| Operation ID | Description |
|-------------|-------------|
| `artifacts_create` | Create artifact |

### Orphans

| Operation ID | Description |
|-------------|-------------|
| `orphans_cleanup_cleanup` | Run orphan cleanup |

### Repair

| Operation ID | Description |
|-------------|-------------|
| `repair_post` | Run storage repair |

### Signing Services

| Operation ID | Description |
|-------------|-------------|
| `signing_services_list` | List signing services |
| `signing_services_read` | Read signing service |

### Exporters & Importers

| Operation ID | Description |
|-------------|-------------|
| `exporters_core_pulp_create` | Create Pulp exporter |
| `exporters_core_pulp_read` | Read Pulp exporter |
| `exporters_core_pulp_delete` | Delete Pulp exporter |
| `exporters_core_pulp_exports_create` | Create export |
| `exporters_core_pulp_exports_read` | Read export |
| `exporters_core_filesystem_create` | Create filesystem exporter |
| `exporters_core_filesystem_exports_create` | Create filesystem export |
| `importers_core_pulp_create` | Create Pulp importer |
| `importers_core_pulp_delete` | Delete Pulp importer |
| `importers_core_pulp_imports_create` | Create import |
| `importers_core_pulp_import_check_import_check` | Check import |

### Reclaim Space

| Operation ID | Description |
|-------------|-------------|
| `repositories_reclaim_space_reclaim` | Reclaim disk space |

## RPM (pulp_rpm)

### Repositories

| Operation ID | Description |
|-------------|-------------|
| `repositories_rpm_rpm_list` | List RPM repositories |
| `repositories_rpm_rpm_create` | Create RPM repository |
| `repositories_rpm_rpm_read` | Read RPM repository |
| `repositories_rpm_rpm_update` | Update RPM repository |
| `repositories_rpm_rpm_partial_update` | Partial update RPM repository |
| `repositories_rpm_rpm_delete` | Delete RPM repository |
| `repositories_rpm_rpm_sync` | Sync RPM repository |
| `repositories_rpm_rpm_modify` | Add/remove content |

### Repository Versions

| Operation ID | Description |
|-------------|-------------|
| `repositories_rpm_rpm_versions_list` | List RPM repo versions |
| `repositories_rpm_rpm_versions_read` | Read RPM repo version |
| `repositories_rpm_rpm_versions_delete` | Delete RPM repo version |
| `repositories_rpm_rpm_versions_repair` | Repair RPM repo version |

### Remotes

| Operation ID | Description |
|-------------|-------------|
| `remotes_rpm_rpm_list` | List RPM remotes |
| `remotes_rpm_rpm_create` | Create RPM remote |
| `remotes_rpm_rpm_read` | Read RPM remote |
| `remotes_rpm_rpm_partial_update` | Partial update RPM remote |
| `remotes_rpm_rpm_delete` | Delete RPM remote |
| `remotes_rpm_uln_create` | Create ULN remote |
| `remotes_rpm_uln_partial_update` | Partial update ULN remote |
| `remotes_rpm_uln_delete` | Delete ULN remote |

### Distributions

| Operation ID | Description |
|-------------|-------------|
| `distributions_rpm_rpm_list` | List RPM distributions |
| `distributions_rpm_rpm_create` | Create RPM distribution |
| `distributions_rpm_rpm_read` | Read RPM distribution |
| `distributions_rpm_rpm_partial_update` | Partial update RPM distribution |
| `distributions_rpm_rpm_delete` | Delete RPM distribution |

### Publications

| Operation ID | Description |
|-------------|-------------|
| `publications_rpm_rpm_list` | List RPM publications |
| `publications_rpm_rpm_create` | Create RPM publication |
| `publications_rpm_rpm_read` | Read RPM publication |
| `publications_rpm_rpm_delete` | Delete RPM publication |

### Content

| Operation ID | Description |
|-------------|-------------|
| `content_rpm_packages_list` | List RPM packages |
| `content_rpm_packages_read` | Read RPM package |
| `content_rpm_advisories_list` | List RPM advisories (errata) |
| `content_rpm_packagegroups_list` | List RPM package groups |
| `content_rpm_packageenvironments_list` | List RPM package environments |
| `content_rpm_modulemd_defaults_list` | List modulemd defaults |
| `content_rpm_modulemds_list` | List modulemds |
| `content_rpm_repo_metadata_files_list` | List repo metadata files |
| `content_rpm_distribution_trees_list` | List distribution trees |

### Copy

| Operation ID | Description |
|-------------|-------------|
| `rpm_rpm_copy_content` | Copy RPM content between repos |

### ACS (Alternate Content Sources)

| Operation ID | Description |
|-------------|-------------|
| `acs_rpm_rpm_list` | List RPM ACS |
| `acs_rpm_rpm_create` | Create RPM ACS |
| `acs_rpm_rpm_read` | Read RPM ACS |
| `acs_rpm_rpm_partial_update` | Update RPM ACS |
| `acs_rpm_rpm_delete` | Delete RPM ACS |
| `acs_rpm_rpm_refresh` | Refresh RPM ACS |

## File (pulp_file)

### Repositories

| Operation ID | Description |
|-------------|-------------|
| `repositories_file_file_list` | List file repositories |
| `repositories_file_file_create` | Create file repository |
| `repositories_file_file_read` | Read file repository |
| `repositories_file_file_update` | Update file repository |
| `repositories_file_file_delete` | Delete file repository |
| `repositories_file_file_sync` | Sync file repository |
| `repositories_file_file_modify` | Add/remove file content |

### Remotes, Distributions, Publications

Follow the same pattern: `remotes_file_file_*`, `distributions_file_file_*`, `publications_file_file_*`

## Container (pulp_container)

### Repositories

| Operation ID | Description |
|-------------|-------------|
| `repositories_container_container_list` | List container repos |
| `repositories_container_container_create` | Create container repo |
| `repositories_container_container_sync` | Sync container repo |
| `repositories_container_container_modify` | Add/remove content |
| `repositories_container_container_remove` | Remove content |
| `repositories_container_container_push_list` | List push repos |

### Distributions

| Operation ID | Description |
|-------------|-------------|
| `distributions_container_container_list` | List container distributions |
| `distributions_container_container_create` | Create container distribution |
| `distributions_container_container_partial_update` | Update container distribution |

### Content

| Operation ID | Description |
|-------------|-------------|
| `content_container_manifests_list` | List manifests |
| `content_container_tags_list` | List tags |
| `content_container_blobs_list` | List blobs |

### Recursive Operations

| Operation ID | Description |
|-------------|-------------|
| `repositories_container_container_add` | Recursive add |
| `repositories_container_container_tag` | Tag image |

## Deb (pulp_deb)

Follow the pattern: `repositories_deb_apt_*`, `remotes_deb_apt_*`, `distributions_deb_apt_*`, `publications_deb_apt_*`, `publications_deb_verbatim_*`

### Copy

| Operation ID | Description |
|-------------|-------------|
| `deb_copy_content` | Copy Deb content |

## Ansible (pulp_ansible)

Follow the pattern: `repositories_ansible_ansible_*`, `remotes_ansible_collection_*`, `distributions_ansible_ansible_*`

### Copy

| Operation ID | Description |
|-------------|-------------|
| `ansible_copy_content` | Copy Ansible content |

## Python (pulp_python)

Follow the pattern: `repositories_python_python_*`, `remotes_python_python_*`, `distributions_python_pypi_*`

## OSTree (pulp_ostree)

Follow the pattern: `repositories_ostree_ostree_*`, `remotes_ostree_ostree_*`, `distributions_ostree_ostree_*`

## CertGuard (pulp_certguard)

| Operation ID | Description |
|-------------|-------------|
| `contentguards_certguard_rhsm_list` | List RHSM cert guards |
| `contentguards_certguard_rhsm_create` | Create RHSM cert guard |
| `contentguards_certguard_rhsm_read` | Read RHSM cert guard |
| `contentguards_certguard_rhsm_partial_update` | Update RHSM cert guard |
| `contentguards_certguard_rhsm_delete` | Delete RHSM cert guard |

## Finding Operation IDs

### From the Spec Directly

```bash
# All operation IDs
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq -r '.paths[][] | select(.operationId) | .operationId' | sort

# Filter by plugin
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq -r '.paths[][] | select(.operationId) | .operationId' | grep rpm | sort

# Full details for one operation
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq '.paths[][] | select(.operationId == "repositories_rpm_rpm_sync")'
```

### From Rails Console

```ruby
conn = Katello::PulpClient::Connection.new(SmartProxy.pulp_primary)
conn.call("status_read")  # triggers spec load

# Search by keyword
conn.spec_index.operations.keys.grep(/rpm/).grep(/sync/)

# Full details
conn.spec_index.lookup("repositories_rpm_rpm_sync")
```

### From Pulp Documentation

Visit `https://<pulp-host>/pulp/api/v3/docs/` for the interactive API browser.

## Related Documentation

- [Developer Guide](developer_guide.md) - How to use operation IDs in code
- [Migration Guide](migration_guide.md) - Mapping old method names to operation IDs
- [API Reference](api_reference.md) - Connection.call() API documentation
