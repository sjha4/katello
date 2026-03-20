# Pulp Upgrade Procedure

When Pulp is upgraded (e.g., 3.85 to 3.86), the OpenAPI spec may change. This guide covers how to handle those changes in Katello.

## What Changes When Pulp Is Upgraded

| Change Type | Impact | Action Needed |
|-------------|--------|---------------|
| New operations added | None (unused until called) | Add Katello code to use them if desired |
| Operations renamed | Calls fail with "operation not found" | Update operation IDs in API wrappers |
| Operations removed | Calls fail with "operation not found" | Remove or replace in Katello code |
| New required parameters | Calls fail with 400 Bad Request | Add parameters to call sites |
| New optional parameters | None | Use them if desired |
| Response field added | None (Response wrapper returns it automatically) | No action |
| Response field removed | Code reading the field gets nil | Check if nil handling is correct |
| Response field type changed | May get unexpected values | Update code that processes the field |
| Different HTTP status codes | May affect async task handling | Add ResponseQuirk if needed |
| Schema constraints changed | May cause SpecQuirk to be needed/removable | Update SpecQuirks |

## Step-by-Step Upgrade Checklist

### 1. Review Pulp Release Notes

Check the changelogs for all Pulp plugins used by Katello:

- [pulpcore](https://docs.pulpproject.org/pulpcore/changes/)
- [pulp_rpm](https://docs.pulpproject.org/pulp_rpm/changes/)
- [pulp_file](https://docs.pulpproject.org/pulp_file/changes/)
- [pulp_container](https://docs.pulpproject.org/pulp_container/changes/)
- [pulp_deb](https://docs.pulpproject.org/pulp_deb/changes/)
- [pulp_ansible](https://docs.pulpproject.org/pulp_ansible/changes/)
- [pulp_python](https://docs.pulpproject.org/pulp_python/changes/)
- [pulp_ostree](https://docs.pulpproject.org/pulp_ostree/changes/)
- [pulp-certguard](https://docs.pulpproject.org/pulp_certguard/changes/)

Look for:
- Deprecated endpoints or parameters
- New required parameters
- Changed response formats
- Removed features

### 2. Compare OpenAPI Specs

Diff the old and new specs to find changes:

```bash
# Fetch old spec (from running old Pulp)
curl -u admin:password https://old-pulp/pulp/api/v3/docs/api.json > spec_old.json

# Fetch new spec (from running new Pulp)
curl -u admin:password https://new-pulp/pulp/api/v3/docs/api.json > spec_new.json

# Compare operation IDs
diff <(jq -r '.paths[][] | select(.operationId) | .operationId' spec_old.json | sort) \
     <(jq -r '.paths[][] | select(.operationId) | .operationId' spec_new.json | sort)

# Find changed parameters for a specific operation
jq '.paths[][] | select(.operationId == "repositories_rpm_rpm_sync")' spec_old.json > old_op.json
jq '.paths[][] | select(.operationId == "repositories_rpm_rpm_sync")' spec_new.json > new_op.json
diff old_op.json new_op.json
```

### 3. Update Operation IDs

If any operation IDs used by Katello were renamed:

1. Search for the old operation ID in the codebase:
   ```bash
   grep -r "old_operation_id" app/services/katello/pulp3/
   ```

2. Update to the new operation ID

3. If you need to support both old and new Pulp versions temporarily, use Capabilities:
   ```ruby
   op_id = if Capabilities.operation_available?(spec_index, "new_operation_id")
             "new_operation_id"
           else
             "old_operation_id"
           end
   pulp_connection.call(op_id, params: { ... })
   ```

### 4. Update SpecQuirks

- **Remove** quirks that are no longer needed (the upstream issue was fixed)
- **Add** quirks for new spec issues
- Each quirk should have a comment noting when it can be removed

### 5. Update Capabilities

- Add new capability checks for new features you want to use
- Remove capability checks for features that are now universally available

### 6. Run Tests

```bash
cd $GITDIR/foreman
bundle exec rake test:katello
```

### 7. Re-record VCR Cassettes

If you have access to a Pulp instance running the new version:

```bash
# Delete old cassettes for changed endpoints
rm test/fixtures/vcr_cassettes/pulp3/repository/sync*.yml

# Re-run tests with VCR recording enabled
VCR_RECORD=all bundle exec ktest test/path/to/test.rb
```

See [Testing Guide](testing_guide.md) for details on VCR cassette management.

### 8. Update Documentation

- Update [Operation ID Mapping](operation_ids.md) if operations changed
- Update version-specific notes in [Quirks System](quirks_system.md)
- Update this document if the upgrade process itself changed

## Typical Upgrade Effort

For a minor Pulp version bump (e.g., 3.85 to 3.86):

- **Spec review**: Check release notes and diff specs
- **Code changes**: Usually 0-5 lines (update an operation ID or add a parameter)
- **Quirks changes**: Usually none, occasionally add/remove one
- **VCR re-recording**: Only for changed endpoints
- **Testing**: Run full test suite

Most minor version upgrades require zero code changes because:
- The spec-driven client discovers the API surface at runtime
- The Response wrapper handles new/removed fields gracefully
- Only breaking changes (renamed/removed operations) require attention

## Supporting Multiple Pulp Versions

If Katello needs to support multiple Pulp versions simultaneously:

1. Use `Capabilities.plugin_version_gte?` for version-based branching
2. Use `Capabilities.operation_available?` for operation-based branching
3. Use `SpecQuirks` to normalize spec differences
4. Use `ResponseQuirks` to normalize response differences

Prefer `operation_available?` over version checks when possible -- it's more precise and self-documenting.

## Related Documentation

- [Quirks System](quirks_system.md) - Managing spec and response quirks
- [Testing Guide](testing_guide.md) - Re-recording VCR cassettes
- [Operation ID Mapping](operation_ids.md) - Current operation ID reference
- [Troubleshooting](troubleshooting.md) - Debugging upgrade issues
