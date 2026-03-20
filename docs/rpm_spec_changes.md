# RPM Spec Changes for Pulp Client Vendoring

This document describes the required changes to the Katello RPM spec file
(maintained in the [foreman-packaging](https://github.com/theforeman/foreman-packaging) repository)
to support vendored Pulp API clients.

## Summary

Katello now vendors Pulp API clients as generated Ruby code instead of depending on
external rubygem packages. The RPM spec must be updated to:

1. Remove Pulp client gem `Requires` lines
2. Ensure generated client code directories are included in `%files`
3. Remove any `BuildRequires` for Pulp client gems

## Required Changes

### 1. Remove Runtime Dependencies

Remove the following `Requires:` lines from the spec file:

```diff
- Requires: rubygem(pulpcore_client) >= 3.85.0
- Requires: rubygem(pulpcore_client) < 3.86.0
- Requires: rubygem(pulp_file_client) >= 3.85.0
- Requires: rubygem(pulp_file_client) < 3.86.0
- Requires: rubygem(pulp_ansible_client) >= 0.28.0
- Requires: rubygem(pulp_ansible_client) < 0.29.0
- Requires: rubygem(pulp_container_client) >= 2.26.0
- Requires: rubygem(pulp_container_client) < 2.27.0
- Requires: rubygem(pulp_deb_client) >= 3.8.0
- Requires: rubygem(pulp_deb_client) < 3.9.0
- Requires: rubygem(pulp_rpm_client) >= 3.32.0
- Requires: rubygem(pulp_rpm_client) < 3.33.0
- Requires: rubygem(pulp_certguard_client) >= 3.85.0
- Requires: rubygem(pulp_certguard_client) < 3.86.0
- Requires: rubygem(pulp_python_client) >= 3.19.0
- Requires: rubygem(pulp_python_client) < 3.20.0
- Requires: rubygem(pulp_ostree_client) >= 2.5.0
- Requires: rubygem(pulp_ostree_client) < 2.6.0
```

The `rubygem(faraday)` dependency must be **kept** as it is still a runtime dependency.

### 2. Verify Generated Code in %files

The generated client code is under `app/lib/katello/pulp3/generated_clients/`. Since the
existing gemspec `gem.files` glob already includes `app/**/*`, this directory should
be automatically included in the RPM via the gem install. Verify that the following
directories are present in the built RPM:

```
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulpcore_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_file_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_rpm_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_ansible_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_container_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_deb_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_certguard_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_python_client/
%{gem_instdir}/app/lib/katello/pulp3/generated_clients/pulp_ostree_client/
```

Also verify the vendored specs are included:

```
%{gem_instdir}/vendor/pulp/specs/
```

### 3. Verify No BuildRequires for Pulp Gems

If there are `BuildRequires:` entries for Pulp client gems, remove them as well.
The generated code has no external gem dependencies beyond what Katello already
requires (faraday, json).

### 4. Remove Obsoleted Pulp Gem Packages (Optional)

If the Foreman packaging repository builds separate RPMs for the Pulp client gems
(e.g., `rubygem-pulpcore_client`, `rubygem-pulp_rpm_client`), consider adding
`Obsoletes:` entries so that upgrades cleanly remove the old packages:

```spec
Obsoletes: rubygem-pulpcore_client < 3.86.0
Obsoletes: rubygem-pulp_file_client < 3.86.0
Obsoletes: rubygem-pulp_ansible_client < 0.29.0
Obsoletes: rubygem-pulp_container_client < 2.27.0
Obsoletes: rubygem-pulp_deb_client < 3.9.0
Obsoletes: rubygem-pulp_rpm_client < 3.33.0
Obsoletes: rubygem-pulp_certguard_client < 3.86.0
Obsoletes: rubygem-pulp_python_client < 3.20.0
Obsoletes: rubygem-pulp_ostree_client < 2.6.0
```

## Testing the RPM Changes

After updating the spec:

1. Build the RPM in a mock/koji environment
2. Verify `rpm -qR katello` no longer lists Pulp client gems
3. Install the RPM and verify Katello starts successfully
4. Run `foreman-rake katello:check` to confirm Pulp connectivity

## Related

- [katello.gemspec changes](../katello.gemspec) -- corresponding gem dependency updates
- [Pulp Client Update Workflow](./pulp_client_update_workflow.md)
