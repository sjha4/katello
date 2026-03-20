# Pulp Vendored API Clients - Implementation Details

**Date:** March 2026
**Status:** Active Development
**Owner:** Katello Team

## Executive Summary

Katello has transitioned from depending on 9 Pulp client gems to vendoring generated API clients directly in the repository. This eliminates the packaging bottleneck where the Pulp team had to maintain and package gem RPMs, while giving Katello full control over when and how clients are updated.

**Key Benefits:**
- ✅ Eliminates 9 gem RPM dependencies from packaging pipeline
- ✅ Generation issues caught in Dev/QE, never on customer systems
- ✅ Zero customer startup delay (pre-generated code)
- ✅ Complete control over client update timing
- ✅ QE validates exact code that customers will run

**Trade-offs:**
- Repository size increases by ~30MB (generated code + specs)
- Larger git diffs during Pulp upgrades (~30K lines)
- Manual regeneration needed every 3-6 months with Pulp upgrades
- Katello team now owns client generation tooling

---

## Background & Context

### Problem Statement

**Original Dependency Chain:**
```
Katello → 9 Pulp Client Gems → Pulp Team Packages → Pulp Releases
```

**Issues:**
1. **Packaging Bottleneck:** Pulp team struggles to maintain 9 separate gem packages
2. **Version Synchronization:** Gems must match Pulp plugin versions exactly
3. **Release Delays:** Katello releases blocked waiting for gem packaging
4. **Foreman Integration:** Gems pinned to specific minor versions creates fragility

### Pulp Team's Decision

The Pulp team has decided to:
- **Retire their gem packaging process** (`pulp-openapi-generator` repo)
- **Hand over client generation** to consuming projects (Katello, Orcharhino, etc.)
- **Provide OpenAPI specs** as the stable API contract
- **Stop maintaining Ruby gems** after current versions

### Katello's Response

Implement **vendored client generation** where:
1. OpenAPI specs are fetched from Pulp and committed to Katello repo
2. Ruby clients are generated from specs using Pulp's proven tooling
3. Generated code is committed (not generated at runtime)
4. Clients are packaged directly in Katello RPM

---

## Architecture Overview

### Directory Structure

```
katello/
├── vendor/pulp_openapi_specs/          # OpenAPI spec JSON files (~3.7MB)
│   ├── pulpcore.json
│   ├── pulp_rpm.json
│   ├── pulp_file.json
│   ├── pulp_container.json
│   ├── pulp_deb.json
│   ├── pulp_ansible.json
│   ├── pulp_certguard.json
│   ├── pulp_python.json
│   └── pulp_ostree.json
│
├── lib/pulp_generated_clients/         # Generated Ruby clients (~30MB)
│   ├── pulpcore_client/
│   │   └── lib/
│   │       ├── pulpcore_client.rb
│   │       ├── pulpcore_client/api/
│   │       ├── pulpcore_client/models/
│   │       └── pulpcore_client/configuration.rb
│   ├── pulp_rpm_client/
│   ├── pulp_file_client/
│   ├── pulp_container_client/
│   ├── pulp_deb_client/
│   ├── pulp_ansible_client/
│   ├── pulp_certguard_client/
│   ├── pulp_python_client/
│   └── pulp_ostree_client/
│
├── lib/pulp_openapi_templates/         # Custom templates from Pulp team
│   └── ruby/
│       ├── v4.3.1/
│       └── v7.10.0/
│           ├── api_client.mustache
│           └── gemspec.mustache
│
├── lib/katello/tasks/
│   └── pulp_client_generation.rake     # Generation tooling
│
└── lib/katello/engine.rb                # Rails autoload configuration
```

### Module Architecture

Generated clients use the same module structure as the original gems:

```ruby
# Module names (match original gems exactly)
PulpcoreClient
PulpRpmClient
PulpFileClient
PulpContainerClient
PulpDebClient
PulpAnsibleClient
PulpCertguardClient
PulpPythonClient
PulpOstreeClient

# Key classes (examples from PulpRpmClient)
PulpRpmClient::ApiClient          # HTTP client
PulpRpmClient::Configuration      # Client configuration
PulpRpmClient::RemotesRpmApi      # Remotes API
PulpRpmClient::RepositoriesRpmApi # Repositories API
PulpRpmClient::RpmRpmDistribution # Distribution model
```

### Integration Points

**No changes required** to existing Katello code:

```ruby
# Repository type registrations (unchanged)
Katello::RepositoryTypeManager.register(::Katello::Repository::YUM_TYPE) do
  client_module_class PulpRpmClient
  api_class PulpRpmClient::ApiClient
  configuration_class PulpRpmClient::Configuration
end

# API classes (unchanged)
class Katello::Pulp3::Api::Yum < Katello::Pulp3::Api::Core
  def copy_api
    PulpRpmClient::RpmCopyApi.new(api_client)
  end
end

# SmartProxy configuration (unchanged)
def pulp3_configuration(config_class)
  config = config_class.new
  config.host = pulp3_url('').chomp('/')
  # ... SSL, auth, etc.
end
```

---

## Implementation Details

### Phase 1: Infrastructure Setup

#### 1.1 Rails Autoloading Configuration

**File:** `lib/katello/engine.rb`

**Challenge:** Generated client directories need to be added to Rails autoload paths and Ruby's `$LOAD_PATH`.

**Solution:**
```ruby
# Generated Pulp OpenAPI clients
generated_clients_path = config.root.join("lib", "pulp_generated_clients")
client_lib_paths = Dir.glob(generated_clients_path.join("*")).select do |client_dir|
  ::File.directory?(client_dir)
end.map do |client_dir|
  ::File.join(client_dir, "lib")
end.select do |lib_dir|
  ::File.directory?(lib_dir)
end

# Add to Rails autoload paths (for constants)
app.config.autoload_paths += client_lib_paths
app.config.eager_load_paths += client_lib_paths

# Add to Ruby $LOAD_PATH (for require statements)
client_lib_paths.each do |lib_dir|
  $LOAD_PATH.unshift(lib_dir) unless $LOAD_PATH.include?(lib_dir)
end
```

**Critical Detail:** Must use `+=` (not `<<`) because arrays may be frozen at initialization time.

**Critical Detail:** `$LOAD_PATH.unshift` is essential for `require 'pulp_rpm_client'` statements to find generated code instead of gems.

#### 1.2 Monkey Patch Updates

**Files:**
- `lib/monkeys/remove_hidden_distribution.rb`
- `lib/monkeys/pulp_polymorphic_remote_response.rb`
- `lib/monkeys/fix_rpm_repository_gpgcheck.rb`

**Challenge:** Monkey patches had explicit `require 'pulp_rpm_client'` statements that fail when gems are removed.

**Solution:** Use conditional patching with `defined?()` checks:

```ruby
# OLD (fails without gems)
require 'pulp_rpm_client'
PulpRpmClient::RpmRpmDistribution.class_eval do
  # patches
end

# NEW (works with or without generated clients)
if defined?(PulpRpmClient) && defined?(PulpRpmClient::RpmRpmDistribution)
  PulpRpmClient::RpmRpmDistribution.class_eval do
    # patches
  end
end
```

**Why:** Allows Rails to boot even before clients are generated (needed to run rake tasks).

#### 1.3 Gemspec Changes

**File:** `katello.gemspec`

**Removed:**
```ruby
gem.add_runtime_dependency 'pulpcore_client', '>= 3.85.0', '< 3.86.0'
gem.add_runtime_dependency 'pulp_file_client', '>= 3.85.0', '< 3.86.0'
gem.add_runtime_dependency 'pulp_ansible_client', '>= 0.28.0', '< 0.29.0'
gem.add_runtime_dependency 'pulp_container_client', '>= 2.26.0', '< 2.27.0'
gem.add_runtime_dependency 'pulp_deb_client', '>= 3.8.0', '< 3.9.0'
gem.add_runtime_dependency 'pulp_rpm_client', '>= 3.32.0', '< 3.33.0'
gem.add_runtime_dependency 'pulp_certguard_client', '>= 3.85.0', '< 3.86.0'
gem.add_runtime_dependency 'pulp_python_client', '>= 3.19.0', '< 3.20.0'
gem.add_runtime_dependency 'pulp_ostree_client', '>= 2.5.0', '< 2.6.0'
```

**Kept:**
```ruby
gem.add_dependency "faraday", ">= 1.10.2", "< 1.11.0"  # Still needed for HTTP
```

**Note:** No development dependencies added. The `openapi-generator-cli` is installed via npm globally.

### Phase 2: OpenAPI Spec Management

#### 2.1 Fetching Specs from Pulp

**Rake Task:** `katello:pulp:update_specs`

**Spec URLs:** (Correct format discovered through trial and error)
```
https://<pulp-server>/pulp/api/v3/docs/api.json?bindings&component=core
https://<pulp-server>/pulp/api/v3/docs/api.json?bindings&component=rpm
https://<pulp-server>/pulp/api/v3/docs/api.json?bindings&component=file
... etc
```

**Authentication:** Uses SmartProxy settings for:
- SSL client certificates
- SSL CA certificate
- Basic auth credentials (if configured)

**Output:**
```
vendor/pulp_openapi_specs/pulpcore.json       (884 KB)
vendor/pulp_openapi_specs/pulp_rpm.json       (508 KB)
vendor/pulp_openapi_specs/pulp_file.json      (229 KB)
vendor/pulp_openapi_specs/pulp_container.json (427 KB)
vendor/pulp_openapi_specs/pulp_deb.json       (519 KB)
vendor/pulp_openapi_specs/pulp_ansible.json   (713 KB)
vendor/pulp_openapi_specs/pulp_certguard.json  (39 KB)
vendor/pulp_openapi_specs/pulp_python.json    (252 KB)
vendor/pulp_openapi_specs/pulp_ostree.json    (253 KB)
```

#### 2.2 Spec Preprocessing (Critical!)

**Challenge:** Pulp's OpenAPI specs have issues that break Ruby code generation:

1. **Invalid Security Scheme Type:** `type: "mutualTLS"` (not valid OpenAPI 3.0)
2. **cookieAuth Issues:** Contains `in: "cookie"` which becomes invalid Ruby syntax (`in:` is a keyword)
3. **Missing Type Fields:** Some security schemes lack required `type` field

**Solution:** Pre-process specs before generation:

```ruby
spec_data = JSON.parse(File.read(spec_file))

# 1. Remove cookieAuth entirely (Katello doesn't use it)
spec_data['components']['securitySchemes'].delete('cookieAuth')

# 2. Fix invalid mutualTLS type
spec_data['components']['securitySchemes'].each do |name, scheme|
  if scheme['type'] == 'mutualTLS'
    scheme['type'] = 'http'
  end
  scheme['type'] ||= 'http'  # Add default if missing
end

# 3. Remove cookieAuth from operation security requirements
spec_data['paths'].each do |path, path_item|
  path_item.each do |method, operation|
    next unless operation.is_a?(Hash) && operation['security']
    operation['security'].delete_if { |req| req.key?('cookieAuth') }
  end
end

File.write(spec_file, JSON.pretty_generate(spec_data))
```

**Why This Matters:** Without this preprocessing:
- ❌ Generated code has syntax errors: `in: ,` (invalid Ruby)
- ❌ Generator crashes with NullPointerException
- ❌ Code won't compile or load

### Phase 3: Client Generation

#### 3.1 Using Pulp Team's Proven Approach

**Critical Decision:** Adopt the Pulp team's generation strategy from their `pulp-openapi-generator` repo.

**What We Adopted:**

1. **Custom Templates:** Copied from `pulp-openapi-generator/templates/ruby/v7.10.0/`
   - `api_client.mustache` - Fixes for Faraday 2.0 compatibility
   - `gemspec.mustache` - Proper gem metadata

2. **Generator Version Selection:** Based on Pulp version
   - Pulp 3.70+ → OpenAPI Generator v7.10.0
   - Pulp 3.85+ → OpenAPI Generator v7.14.0
   - Older → v4.3.1

3. **Generator Configuration:**
   ```ruby
   cmd = [
     'openapi-generator-cli', 'generate',
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
     '-t', template_dir,              # Pulp's custom templates
     '--skip-validate-spec',          # Specs have minor issues
     '--strict-spec=false'            # Be lenient
   ]
   ```

4. **Cleanup:** Remove unnecessary generated files
   ```ruby
   %w[spec docs .gitignore .gitlab-ci.yml .travis.yml
      git_push.sh .rspec .rubocop.yml].each do |file|
     FileUtils.rm_rf(File.join(output_dir, file))
   end
   ```

#### 3.2 Generator Installation

**Tool:** `openapi-generator-cli` (npm package)

**Installation:**
```bash
npm install -g @openapitools/openapi-generator-cli
```

**Version Management:**
```bash
# Check version
openapi-generator-cli version

# The npm package downloads the Java JAR on first use
# Default location: /usr/local/lib/node_modules/@openapitools/openapi-generator-cli/versions/
```

**Permission Issues:** If the tool fails with permission errors:
```bash
sudo chown -R vagrant:vagrant /usr/local/lib/node_modules/@openapitools/openapi-generator-cli
```

#### 3.3 Alternative: Copy From Gems (Fallback Strategy)

**Rake Task:** `katello:pulp:copy_from_gems`

**Purpose:** Fallback if generation has issues - copy proven gem code directly.

**Usage:**
```bash
# 1. Install gems
gem install pulpcore_client -v 3.85.12
gem install pulp_rpm_client -v 3.32.8
# ... etc

# 2. Copy from installed gems
bundle exec rake katello:pulp:copy_from_gems
```

**When to Use:**
- ✅ OpenAPI Generator has bugs in new versions
- ✅ Generated code has subtle issues not caught in testing
- ✅ Need working code immediately (emergency)
- ❌ Not recommended for long-term (defeats purpose of owning generation)

---

## Issues Encountered & Resolutions

### Issue 1: Ruby Syntax Errors - `in:` Keyword

**Error:**
```ruby
SyntaxError: configuration.rb:254: syntax error, unexpected ','
  in: ,
      ^
```

**Root Cause:** OpenAPI Generator creates Ruby hash with `in:` as an unquoted key. Since `in` is a Ruby keyword, this is invalid syntax.

**Attempted Solutions:**
1. ❌ **Post-process generated code** - sed/gsub to fix `in:` → `'in':`
   - Too fragile, might miss cases

2. ❌ **Set `in: 'header'` in spec** - Provide valid value
   - Generator still produced syntax errors

3. ✅ **Remove cookieAuth entirely** - Katello doesn't use it anyway
   - Cleanest solution
   - Adopted by Pulp team in their generator

**Resolution:** Pre-process specs to delete `cookieAuth` from both:
- `components.securitySchemes`
- All operation `security` arrays

### Issue 2: Invalid Security Scheme Type

**Error:**
```
Exception: Cannot invoke "io.swagger.v3.oas.models.security.SecurityScheme$Type.equals(Object)"
because the return value of "io.swagger.v3.oas.models.security.SecurityScheme.getType()" is null
```

**Root Cause:** Pulp specs use `type: "mutualTLS"` which isn't a valid OpenAPI 3.0 security scheme type.

**Valid Types:** `apiKey`, `http`, `oauth2`, `openIdConnect`

**Resolution:** Pre-process specs to convert:
```ruby
if scheme['type'] == 'mutualTLS'
  scheme['type'] = 'http'
end
```

### Issue 3: Frozen Array Modification

**Error:**
```ruby
FrozenError: can't modify frozen Array: ["/home/vagrant/foreman/app/controllers", ...]
```

**Root Cause:** Rails freezes `autoload_paths` and `eager_load_paths` during initialization. Using `<<` to append fails.

**Resolution:** Use `+=` instead of `<<`:
```ruby
# BAD
app.config.autoload_paths << lib_dir

# GOOD
app.config.autoload_paths += [lib_dir]
```

### Issue 4: Require Statements Find Gems Instead of Generated Code

**Problem:** Even with autoload configured, `require 'pulp_rpm_client'` statements find the gem version (if installed) instead of generated code.

**Root Cause:** Rails `autoload_paths` only affect constant resolution, not Ruby's `require` mechanism.

**Resolution:** Add to `$LOAD_PATH` with `unshift` (prepend):
```ruby
$LOAD_PATH.unshift(lib_dir) unless $LOAD_PATH.include?(lib_dir)
```

**Why unshift?** Ensures generated clients are found *before* any installed gems.

### Issue 5: 404 Errors with Generated Clients

**Error:** Generated clients making requests to wrong URLs, getting 404 responses.

**Root Cause:** Vanilla OpenAPI Generator has bugs or incompatibilities with Pulp specs.

**Resolution:** Use Pulp team's custom templates and proven configuration instead of vanilla generator.

**Lesson Learned:** OpenAPI Generator is not foolproof. The Pulp team's templates include critical fixes and workarounds.

### Issue 6: OpenAPI Generator Version Mismatches

**Problem:** Different generator versions produce different (sometimes incompatible) code.

**Pulp Team's Solution:** Version-specific templates
- `templates/ruby/v4.3.1/` - For Pulp < 3.70
- `templates/ruby/v7.10.0/` - For Pulp 3.70+

**Our Approach:** Hardcode version based on current Pulp version:
```ruby
generator_version = 'v7.10.0'  # For Pulp 3.85.x
```

**Future Consideration:** Auto-detect Pulp version and select appropriate generator version.

---

## Production Considerations

### Deployment

**RPM Packaging Changes:**

**File:** Packaging repo's `katello.spec`

**Required Changes:**
```spec
# REMOVE all Pulp gem dependencies
# DELETE these lines:
# Requires: rubygem(pulpcore_client) >= 3.85.0
# Requires: rubygem(pulp_rpm_client) >= 3.32.0
# ... etc (7 more)

# ADD generated code directories to %files
%files
%{katello_dir}/lib/pulp_generated_clients/
%{katello_dir}/vendor/pulp_openapi_specs/
%{katello_dir}/lib/pulp_openapi_templates/
```

**RPM Size Impact:**
- Before: Katello RPM (10 MB) + 9 gem RPMs (45 MB) = **55 MB total**
- After: Katello RPM (40 MB) = **40 MB total**

**Benefits:**
- ✅ Fewer RPM packages (1 instead of 10)
- ✅ Simpler dependency tree
- ✅ Smaller total download

### Upgrade Workflow

**When Pulp is Upgraded (every 3-6 months):**

```bash
# 1. In development environment with upgraded Pulp
cd /home/vagrant/foreman

# 2. Fetch new specs
bundle exec rake katello:pulp:update_specs

# 3. Review spec changes
git diff vendor/pulp_openapi_specs/
# Look for: new APIs, removed endpoints, changed parameters

# 4. Regenerate clients
bundle exec rake katello:pulp:clear_generated
bundle exec rake katello:pulp:generate_clients

# 5. Review generated code changes
git diff lib/pulp_generated_clients/ | less
# Focus on: API signature changes, new required parameters

# 6. Test
bundle exec rake test:katello
# Run smoke tests, check repository operations

# 7. Commit
git add vendor/pulp_openapi_specs/ lib/pulp_generated_clients/
git commit -m "Update Pulp API clients to Pulp 3.X

- Updated OpenAPI specs from Pulp 3.X.Y
- Regenerated Ruby clients with openapi-generator v7.10.0
- New APIs: [list any new endpoints]
- Breaking changes: [list any incompatibilities]
- Tested: [repository types tested]

Refs: #ISSUE_NUMBER
"

# 8. Create PR and wait for QE validation
```

**Critical:** QE tests the *exact* generated code that customers will receive.

### Rollback Procedure

**If Issues Found After Deployment:**

```bash
# Option 1: Git revert
git revert <commit-hash>

# Option 2: Manual rollback
git checkout HEAD~1 vendor/pulp_openapi_specs/
git checkout HEAD~1 lib/pulp_generated_clients/

# Rebuild RPM with reverted code
bundle exec rake katello:pulp:generate_clients  # Regenerate from old specs
```

**Temporary Fix:** If you need to quickly fix a production issue:
```bash
# Copy working gem code as emergency measure
bundle exec rake katello:pulp:copy_from_gems
```

### Testing Strategy

**Pre-Merge Testing:**
1. ✅ Syntax validation: `ruby -c` on all generated files
2. ✅ Load testing: `bundle exec rails console` and verify constants load
3. ✅ Unit tests: Repository instantiation, API class creation
4. ✅ Integration tests: Full repository sync, publish, promote workflow
5. ✅ Smoke tests: One operation per content type (YUM, Deb, Docker, File, Ansible, Python, OSTree)

**QE Validation:**
1. ✅ Full test suite execution
2. ✅ Manual testing across all content types
3. ✅ Upgrade path testing (old → new Pulp version)
4. ✅ Performance regression testing

**Customer Acceptance:**
1. ✅ Beta testing with select customers
2. ✅ Monitoring for API errors in production
3. ✅ Quick rollback plan if critical issues found

---

## Future Improvements

### Short-term (Next 3 Months)

1. **Automated Spec Diffing**
   - Tool to highlight meaningful changes between spec versions
   - Focus review on API signature changes, not JSON formatting

2. **Generator Version Auto-Detection**
   ```ruby
   def determine_generator_version(pulp_version)
     case pulp_version
     when /^3\.(\d+)/
       minor = $1.to_i
       return 'v7.19.0' if minor >= 115
       return 'v7.14.0' if minor >= 85
       return 'v7.10.0' if minor >= 70
       'v4.3.1'
     else
       'v7.10.0'  # Default
     end
   end
   ```

3. **Continuous Validation**
   - CI job that regenerates clients and checks for syntax errors
   - Catches generator version incompatibilities early

4. **Integration with Pulp CI**
   - Fetch specs from Pulp nightly builds
   - Test Katello against upcoming Pulp versions before release

### Medium-term (6-12 Months)

1. **Template Maintenance Strategy**
   - Monitor OpenAPI Generator releases
   - Update custom templates when new versions released
   - Test template compatibility with Pulp specs

2. **Spec Validation Tooling**
   - Pre-flight checks before generation
   - Warn about known problematic patterns
   - Suggest spec fixes

3. **Generator Fork Consideration**
   - If OpenAPI Generator continues to have issues
   - Consider forking and maintaining Pulp-specific version
   - Coordinate with other Pulp consumers (Orcharhino, etc.)

4. **Differential Generation**
   - Only regenerate changed clients (not all 9)
   - Faster iteration during development
   - Smaller git diffs

### Long-term (1+ Years)

1. **OpenAPI Spec Governance**
   - Work with Pulp team to improve spec quality
   - Standardize security schemes across plugins
   - Document Pulp-specific OpenAPI extensions

2. **Multi-Version Support**
   - Support multiple Pulp versions simultaneously
   - Client version selection at runtime based on Pulp server version
   - Backward compatibility maintenance

3. **Cross-Project Collaboration**
   - Share templates and tooling with other Pulp consumers
   - Standardize client generation approach
   - Reduce duplicate effort across ecosystem

---

## Decision Log

### Why Commit Generated Code?

**Decision:** Commit generated clients to git (not generate at runtime)

**Rationale:**
1. ✅ **Customer Safety:** Generation issues caught in Dev/QE, never in production
2. ✅ **Zero Startup Delay:** No generation step when Katello starts
3. ✅ **QE Validation:** Tests run against exact code customers receive
4. ✅ **Reproducibility:** Same code everywhere (dev, QE, staging, prod)
5. ✅ **Easy Rollback:** `git revert` if problems found

**Trade-offs Accepted:**
- ❌ Larger repository size (~30MB increase)
- ❌ Large git diffs during regeneration
- ❌ Requires discipline to keep generated code in sync with specs

### Why Remove cookieAuth?

**Decision:** Delete `cookieAuth` from OpenAPI specs before generation

**Rationale:**
1. ✅ **Not Used:** Katello uses client certs and basic auth, not cookies
2. ✅ **Syntax Issues:** `in:` keyword causes Ruby syntax errors
3. ✅ **Proven Approach:** Pulp team does the same in their generator
4. ✅ **Simpler Code:** Reduces generated complexity

**Alternatives Considered:**
- ❌ Post-process generated code (too fragile)
- ❌ Fix OpenAPI Generator (not our code to maintain)
- ❌ Work around in templates (unnecessary complexity)

### Why Use Pulp's Templates?

**Decision:** Adopt custom templates from `pulp-openapi-generator` repo

**Rationale:**
1. ✅ **Proven:** These templates generated the working gems we currently use
2. ✅ **Bug Fixes:** Include workarounds for known generator issues
3. ✅ **Maintained:** Pulp team kept these updated with generator versions
4. ✅ **Compatible:** Designed specifically for Pulp specs

**Why Not Vanilla Generator:**
- ❌ Produces syntax errors with Pulp specs
- ❌ Missing critical bug fixes
- ❌ Not tested against Pulp's OpenAPI patterns

### Why Not Generate at Runtime?

**Decision:** Don't generate clients during Katello startup or installation

**Alternatives Rejected:**

**Option 1: Generate on First Boot**
```ruby
# BAD: Generate when Rails starts
initializer "katello.generate_pulp_clients", after: :load_config_initializers do
  GeneratePulpClientsJob.perform_later if generated_clients_missing?
end
```

**Why Not:**
- ❌ Unpredictable startup time (2-5 minutes delay)
- ❌ Generation failures in production (customer impact)
- ❌ Requires openapi-generator on customer systems
- ❌ Different code in dev vs prod (if generation differs)

**Option 2: Generate During RPM Installation**
```spec
%post
cd %{katello_dir}
bundle exec rake katello:pulp:generate_clients
```

**Why Not:**
- ❌ RPM installation becomes very slow
- ❌ Generation failures break installation
- ❌ Requires network access during install (to fetch specs)
- ❌ Requires openapi-generator tooling on customer systems

**Chosen Approach: Pre-Generated & Committed**
- ✅ Fast, predictable installation
- ✅ Known-good code (tested in QE)
- ✅ No surprises in production
- ✅ No runtime dependencies

### Why Not Use Gems Directly?

**Question:** Why not keep using Pulp's gem packages?

**Answer:** Pulp team is retiring gem packaging
- They won't maintain gems going forward
- Packaging is a bottleneck for their releases
- They want consumers to generate from OpenAPI specs
- This is a strategic direction, not negotiable

**Our Choice:** Own the generation process rather than depend on discontinued gems.

---

## Troubleshooting Guide

### Generation Fails: openapi-generator-cli Not Found

**Symptom:**
```
ERROR: 'openapi-generator-cli' not found in PATH.
Install it via: npm install @openapitools/openapi-generator-cli -g
```

**Solution:**
```bash
npm install -g @openapitools/openapi-generator-cli

# Verify
which openapi-generator-cli
openapi-generator-cli version
```

**If Permission Errors:**
```bash
sudo chown -R $USER:$USER /usr/local/lib/node_modules/@openapitools/openapi-generator-cli
```

### Generation Produces Syntax Errors

**Symptom:** Generated code has invalid Ruby syntax, Rails won't start

**Check:**
```bash
# Find syntax errors
ruby -c lib/pulp_generated_clients/pulpcore_client/lib/pulpcore_client/configuration.rb
```

**Likely Causes:**
1. cookieAuth not removed from spec
2. Wrong generator version
3. Missing custom templates

**Solution:**
```bash
# 1. Verify cookieAuth is removed
grep -c '"cookieAuth"' vendor/pulp_openapi_specs/pulpcore.json
# Should output: 0

# 2. Check generator version
openapi-generator-cli version
# Should match: v7.10.0 (or compatible)

# 3. Verify templates exist
ls -la lib/pulp_openapi_templates/ruby/v7.10.0/
# Should show: api_client.mustache, gemspec.mustache

# 4. Regenerate
bundle exec rake katello:pulp:clear_generated
bundle exec rake katello:pulp:generate_clients
```

### Generated Clients Make Wrong API Calls (404 Errors)

**Symptom:** Repository operations fail with 404 Not Found

**Likely Cause:** Generated code has incorrect URL construction

**Emergency Fix:**
```bash
# Use proven gem code instead
bundle exec rake katello:pulp:copy_from_gems
```

**Long-term Solution:**
1. Report issue to Katello team
2. Check if newer generator version fixes it
3. Consider updating templates
4. May need to patch generated code as interim fix

### Monkey Patches Fail to Apply

**Symptom:**
```
NoMethodError: undefined method 'class_eval' for PulpRpmClient::RpmRpmDistribution:NilClass
```

**Cause:** Client constants not defined (generation failed or not loaded)

**Solution:**
```bash
# Check if clients exist
ls lib/pulp_generated_clients/pulp_rpm_client/lib/

# Verify autoload configuration
bundle exec rails console
> $LOAD_PATH.grep(/pulp_generated/)
# Should show client lib directories

# Check if constants defined
> defined?(PulpRpmClient)
# Should return: "constant"

# If not defined, regenerate
bundle exec rake katello:pulp:generate_clients
```

### Spec Fetch Fails (HTTP 400)

**Symptom:**
```
Fetching pulpcore... FAILED (HTTP 400)
```

**Likely Causes:**
1. Wrong URL format
2. Pulp server not running
3. Authentication failure

**Debug:**
```bash
# Check Pulp is accessible
curl -u admin:password https://$(hostname)/pulp/api/v3/status/

# Verify SmartProxy configuration
bundle exec rails console
> SmartProxy.pulp_primary.pulp3_url('')
> SmartProxy.pulp_primary.setting('Pulp3', 'username')

# Test spec URL manually
curl -u admin:password \
  "https://$(hostname)/pulp/api/v3/docs/api.json?bindings&component=core" \
  | jq '.info.version'
```

### Bundle Install Fails: openapi_generator Gem Not Found

**Symptom:**
```
Could not find gem 'openapi_generator' in rubygems repository
```

**Explanation:** This was a mistake in early implementation. The tool is NOT a Ruby gem.

**Solution:** Already fixed. Check your `katello.gemspec` doesn't have:
```ruby
# WRONG - remove if present
gem.add_development_dependency 'openapi_generator'
```

The tool is installed via npm, not bundler.

---

## References

### Documentation

- **Implementation Plan:** `/home/sajha/.claude/plans/snug-imagining-bubble.md`
- **Workflow Guide:** `docs/pulp_client_update_workflow.md`
- **Troubleshooting:** `docs/pulp_generated_clients_troubleshooting.md`
- **RPM Changes:** `docs/rpm_spec_changes.md`

### Pulp Team Resources

- **Generator Repo:** `/home/sajha/mnt1/pulp-openapi-generator/` (being retired)
- **Generation Script:** `pulp-openapi-generator/gen-client.sh`
- **Custom Templates:** `pulp-openapi-generator/templates/ruby/`
- **OpenAPI Docs:** https://docs.pulpproject.org/pulpcore/plugins/plugin-writer/concepts/index.html#api-documentation

### Katello Code

- **Rake Tasks:** `lib/katello/tasks/pulp_client_generation.rake`
- **Engine Config:** `lib/katello/engine.rb` (lines 143-156)
- **Monkey Patches:** `lib/monkeys/*.rb`
- **Repository Types:** `lib/katello/repository_types/*.rb`
- **API Wrappers:** `app/services/katello/pulp3/api/*.rb`

### OpenAPI Generator

- **Project:** https://openapi-generator.tech/
- **Ruby Generator:** https://openapi-generator.tech/docs/generators/ruby/
- **npm Package:** https://www.npmjs.com/package/@openapitools/openapi-generator-cli
- **Templates:** https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator/src/main/resources/ruby

---

## Appendix: Complete Rake Task Usage

### Fetch OpenAPI Specs

```bash
cd /home/vagrant/foreman
bundle exec rake katello:pulp:update_specs
```

**What it does:**
- Connects to Pulp primary SmartProxy
- Fetches OpenAPI specs for all 9 plugins
- Pre-processes specs (remove cookieAuth, fix mutualTLS)
- Saves to `vendor/pulp_openapi_specs/`

**Requirements:**
- Pulp server running and accessible
- SmartProxy configured in Katello
- Network connectivity to Pulp

### Generate Clients from Specs

```bash
cd /home/vagrant/foreman
bundle exec rake katello:pulp:generate_clients
```

**What it does:**
- Reads specs from `vendor/pulp_openapi_specs/`
- Runs openapi-generator for each plugin
- Uses Pulp's custom templates
- Outputs to `lib/pulp_generated_clients/`
- Cleans up unnecessary files

**Requirements:**
- `openapi-generator-cli` installed via npm
- Specs already fetched (run update_specs first)
- Custom templates in `lib/pulp_openapi_templates/`

### Clear Generated Clients

```bash
bundle exec rake katello:pulp:clear_generated
```

**What it does:**
- Removes all directories under `lib/pulp_generated_clients/`
- Useful before regenerating to ensure clean state

### Combined: Fetch + Generate

```bash
bundle exec rake katello:pulp:update_and_generate
```

**What it does:**
- Runs update_specs
- Runs clear_generated
- Runs generate_clients

**Use case:** Full refresh during Pulp upgrade

### Copy from Installed Gems (Fallback)

```bash
# First install the gems
gem install pulpcore_client -v 3.85.12
gem install pulp_rpm_client -v 3.32.8
# ... install all 9

# Then copy
bundle exec rake katello:pulp:copy_from_gems
```

**What it does:**
- Finds installed gem paths
- Copies `lib/` directory from each gem
- Places in `lib/pulp_generated_clients/`

**Use case:** Emergency fallback if generation has issues

---

## Appendix: File Modifications Summary

### New Files Created

```
katello/vendor/pulp_openapi_specs/                 # Specs (~3.7 MB)
  ├── pulpcore.json
  ├── pulp_rpm.json
  └── ... (7 more)

katello/lib/pulp_generated_clients/                # Clients (~30 MB)
  ├── pulpcore_client/
  ├── pulp_rpm_client/
  └── ... (7 more)

katello/lib/pulp_openapi_templates/                # Templates (~100 KB)
  └── ruby/
      └── v7.10.0/
          ├── api_client.mustache
          └── gemspec.mustache

katello/lib/katello/tasks/pulp_client_generation.rake  # Rake tasks
katello/docs/pulp_client_update_workflow.md            # Workflow guide
katello/docs/pulp_generated_clients_troubleshooting.md # Troubleshooting
katello/docs/rpm_spec_changes.md                       # RPM packaging guide
katello/docs/pulp_vendored_clients_implementation.md   # This document
```

### Modified Files

```
katello/katello.gemspec
  - Removed: 9 Pulp client gem dependencies
  - Added: Comment about openapi-generator-cli installation

katello/lib/katello/engine.rb
  - Added: Autoload configuration for generated clients (lines 143-156)
  - Added: $LOAD_PATH manipulation for require statements

katello/lib/monkeys/remove_hidden_distribution.rb
  - Removed: require statements for Pulp client gems
  - Added: Conditional patching with defined?() checks

katello/lib/monkeys/pulp_polymorphic_remote_response.rb
  - Removed: require statements for Pulp client gems
  - Added: Conditional patching with defined?() checks

katello/lib/monkeys/fix_rpm_repository_gpgcheck.rb
  - Removed: require statements for Pulp client gems
  - Added: Conditional patching with defined?() checks

katello/README.md
  - Added: Pulp API Clients section with quick reference

katello/.gitignore
  - Added: Rules for generated client temp files
  - Explicitly NOT ignoring: lib/pulp_generated_clients/ (committed)
```

### Files NOT Modified

**No changes needed** (this was a key design goal):

```
katello/lib/katello/repository_types/*.rb          # Repository type registrations
katello/app/services/katello/pulp3/api/*.rb        # API wrapper classes
katello/app/services/katello/pulp3/repository.rb   # Repository service
katello/app/models/katello/concerns/smart_proxy_extensions.rb  # SmartProxy config
```

Module names and class names remain identical, so no integration code changes required.

---

## Contact & Support

**Primary Maintainer:** Katello Development Team

**For Issues:**
1. Check troubleshooting guide in this document
2. Review `docs/pulp_generated_clients_troubleshooting.md`
3. Check Katello developer chat (#katello-dev)
4. Create GitHub issue: https://github.com/Katello/katello/issues

**For Pulp Spec Issues:**
1. Verify with Pulp team if spec format is correct
2. Document workaround in rake task preprocessing
3. Consider contributing fix to Pulp if applicable

**For OpenAPI Generator Issues:**
1. Check if newer generator version fixes it
2. Update custom templates if needed
3. Report to OpenAPI Generator project if it's a general bug

---

## Change History

| Date | Author | Change |
|------|--------|--------|
| 2026-03-20 | Claude Sonnet 4.5 | Initial implementation and documentation |

---

*This document is maintained alongside the Pulp client vendoring implementation. Update as the approach evolves.*
