# Pulp Spec-Driven Client Implementation - Agent Team Prompt

**Project:** Replace Pulp Generated Client Gems with Runtime Spec-Driven HTTP Client
**Approach:** Implement Ian Ballou's design from https://hackmd.io/@ianballou/rkJKDeicWx
**Context Documents:**
- Ian's Design: https://hackmd.io/@ianballou/rkJKDeicWx
- Implementation Comparison: `/home/sajha/mnt1/katello/docs/pulp_vendored_clients_implementation.md` (see "Comparison" section)
- Current Generated Client Attempt: See git history and `/home/sajha/mnt1/katello/lib/pulp_generated_clients/`

---

## Mission

Implement a **custom spec-driven Pulp HTTP client** that:
1. Eliminates dependency on 9 Pulp client gems
2. Fetches OpenAPI spec at runtime from `/pulp/api/v3/docs/api.json`
3. Provides a clean API: `connection.call(operation_id, params:, body:)`
4. Eliminates ALL 3 monkey patch files
5. Supports multiple SmartProxy instances with isolated configs
6. Handles version compatibility via "quirks" system

**Core Philosophy:** Replace ~30,000 lines of generated code with ~300 lines of clean, maintainable Ruby.

---

## Background: Why This Approach?

### Current Problems

1. **9 Tightly-Pinned Gems:** Pulp team is retiring gem packaging
2. **3 Monkey Patch Files:** Technical debt bridging version gaps
3. **Generated Code Issues:** Syntax errors, 404s, generator unreliability
4. **Maintenance Burden:** Manual regeneration every 3-6 months
5. **Large Repository:** +30MB of generated code

### Ian's Solution Benefits

✅ **No generated code** - 300 lines vs 30,000 lines
✅ **Runtime spec discovery** - Automatic API surface detection
✅ **Eliminates monkey patches** - Permissive response wrapper
✅ **Version compatibility** - Built-in quirks system
✅ **Multi-proxy support** - Isolated connections per SmartProxy
✅ **Simpler maintenance** - Small, understandable codebase

### Trade-offs Accepted

❌ **Refactoring required** - All 83 API callsites must change
❌ **Hash-based API** - Loses type safety (acceptable)
❌ **Runtime parsing** - ~100ms on first call (acceptable)
❌ **New custom code** - 300 lines to maintain (better than 30,000)

---

## Architecture Overview

### New Components

```
lib/katello/pulp_client/
├── connection.rb           # Main HTTP client (150 lines)
├── response.rb            # Permissive response wrapper (50 lines)
├── api_error.rb           # Unified error class (30 lines)
├── spec_index.rb          # Operation lookup index (50 lines)
└── quirks/
    ├── spec_quirks.rb     # Patch incorrect specs (20 lines)
    ├── capabilities.rb    # Feature gates for versions (30 lines)
    └── response_quirks.rb # Handle behavioral differences (20 lines)
```

### Usage Pattern

```ruby
# OLD (generated clients)
api_client = PulpRpmClient::ApiClient.new(config)
sync_api = PulpRpmClient::RepositoriesRpmApi.new(api_client)
response = sync_api.sync(repo_href, rpm_rpm_repository_sync_url: {
  remote: remote_href,
  mirror: true
})

# NEW (spec-driven)
connection = Katello::PulpClient::Connection.new(smart_proxy)
response = connection.call(
  "repositories_rpm_rpm_sync",
  params: { rpm_rpm_repository_href: repo_href },
  body: { remote: remote_href, mirror: true }
)
```

### Integration Points

**Files to Modify:**
- `app/services/katello/pulp3/api/*.rb` - API wrapper classes (7 files)
- `lib/katello/repository_types/*.rb` - Repository type registrations (7 files)
- `app/models/katello/concerns/smart_proxy_extensions.rb` - SmartProxy config
- All Dynflow actions using Pulp APIs (~50 files)
- All tests using Pulp clients (~200 test files)

**Files to Delete:**
- `lib/monkeys/remove_hidden_distribution.rb`
- `lib/monkeys/pulp_polymorphic_remote_response.rb`
- `lib/monkeys/fix_rpm_repository_gpgcheck.rb`
- `lib/pulp_generated_clients/` (entire directory)
- `vendor/pulp_openapi_specs/` (no longer needed)
- `lib/pulp_openapi_templates/` (no longer needed)
- `lib/katello/tasks/pulp_client_generation.rake`

---

## Team Structure & Agent Assignments

### Agent 1: Core Spec-Driven Client (infrastructure-agent)

**Responsibility:** Implement the foundational PulpClient components

**Tasks:**
1. Create `lib/katello/pulp_client/connection.rb`
   - Initialize with SmartProxy
   - Fetch spec from `/pulp/api/v3/docs/api.json` on first call
   - Build operation index (Hash mapping operation_id → spec details)
   - Implement `call(operation_id, params:, body:)` method
   - Handle SSL/auth configuration per SmartProxy
   - Include spec caching in-memory

2. Create `lib/katello/pulp_client/spec_index.rb`
   - Parse OpenAPI spec JSON
   - Build flat Hash: `operation_id => { method:, path:, params: }`
   - Extract plugin versions from `x-pulp-app-versions`
   - O(1) operation lookup

3. Create `lib/katello/pulp_client/response.rb`
   - Wrap HTTP response
   - Use `method_missing` for permissive field access
   - Return nil for missing fields (no errors)
   - Provide access to raw response

4. Create `lib/katello/pulp_client/api_error.rb`
   - Single unified error class
   - Include HTTP status, response body, operation_id
   - Replace all 9 gem error classes

5. Create `lib/katello/pulp_client/quirks/` modules
   - `spec_quirks.rb` - Fix incorrect OpenAPI specs before indexing
   - `capabilities.rb` - Feature gates for version-specific operations
   - `response_quirks.rb` - Handle behavioral differences (204 vs 202)

**Deliverables:**
- Complete, working PulpClient module (~350 lines total)
- Unit tests for Connection, SpecIndex, Response, ApiError
- Example usage in `docs/pulp_client_usage_examples.md`

**Reference Implementation:**
- Read Ian's design doc for detailed architecture
- Study existing SmartProxy SSL/auth configuration in `app/models/katello/concerns/smart_proxy_extensions.rb`
- Review Faraday usage in current codebase

---

### Agent 2: Core Pulp API Refactoring (core-api-agent)

**Responsibility:** Refactor core Pulp API and YUM/RPM plugin integration

**Scope:**
- `app/services/katello/pulp3/api/core.rb`
- `app/services/katello/pulp3/api/yum.rb`
- `lib/katello/repository_types/yum.rb`
- All YUM-related Dynflow actions

**Tasks:**

1. **Refactor `Katello::Pulp3::Api::Core`**
   ```ruby
   # OLD
   def api_client
     @api_client ||= begin
       config = smart_proxy.pulp3_configuration(PulpcoreClient::Configuration)
       PulpcoreClient::ApiClient.new(config)
     end
   end

   # NEW
   def pulp_connection
     @pulp_connection ||= Katello::PulpClient::Connection.new(smart_proxy)
   end
   ```

2. **Refactor `Katello::Pulp3::Api::Yum`**
   - Replace all `PulpRpmClient::*Api` usage with `pulp_connection.call(...)`
   - Update method signatures to use operation IDs
   - Map old method calls to operation IDs
   - Example:
     ```ruby
     # OLD
     def sync_repository(repository_href, params)
       sync_api = PulpRpmClient::RepositoriesRpmApi.new(api_client)
       sync_api.sync(repository_href, params)
     end

     # NEW
     def sync_repository(repository_href, params)
       pulp_connection.call(
         "repositories_rpm_rpm_sync",
         params: { rpm_rpm_repository_href: repository_href },
         body: params
       )
     end
     ```

3. **Update Repository Type Registration**
   ```ruby
   # OLD
   client_module_class PulpRpmClient
   api_class PulpRpmClient::ApiClient
   configuration_class PulpRpmClient::Configuration

   # NEW (simplified - just need connection)
   # Most of this goes away, just keep metadata
   pulp3_plugin 'pulp_rpm'
   ```

4. **Refactor YUM Dynflow Actions**
   - Update all actions that call Pulp RPM APIs
   - Change from method-based to operation-ID-based calls
   - Maintain exact same business logic

**Deliverables:**
- Core and YUM APIs refactored to use spec-driven client
- All YUM tests passing
- Operation ID mapping documented

**Reference:**
- Ian's doc section on "Callsite Changes"
- Current API wrapper structure in `app/services/katello/pulp3/api/`

---

### Agent 3: File & Container Plugin Refactoring (file-container-agent)

**Responsibility:** Refactor File and Container plugin integration

**Scope:**
- `app/services/katello/pulp3/api/file.rb`
- `app/services/katello/pulp3/api/docker.rb`
- `lib/katello/repository_types/file.rb`
- `lib/katello/repository_types/docker.rb`
- All File/Container Dynflow actions

**Tasks:**
1. Refactor File API wrapper
2. Refactor Docker/Container API wrapper
3. Update repository type registrations
4. Refactor related Dynflow actions
5. Update tests

**Pattern:** Same as Agent 2, but for File and Container plugins

**Deliverables:**
- File and Container APIs refactored
- All File/Container tests passing

---

### Agent 4: Deb & Ansible Plugin Refactoring (deb-ansible-agent)

**Responsibility:** Refactor Deb and Ansible plugin integration

**Scope:**
- `app/services/katello/pulp3/api/apt.rb`
- `app/services/katello/pulp3/api/ansible_collection.rb`
- `lib/katello/repository_types/deb.rb`
- `lib/katello/repository_types/ansible_collection.rb`
- All Deb/Ansible Dynflow actions

**Tasks:**
1. Refactor Apt API wrapper
2. Refactor Ansible Collection API wrapper
3. Update repository type registrations
4. Refactor related Dynflow actions
5. Update tests

**Deliverables:**
- Deb and Ansible APIs refactored
- All Deb/Ansible tests passing

---

### Agent 5: Python, OSTree & ContentGuard Refactoring (misc-plugins-agent)

**Responsibility:** Refactor Python, OSTree, and ContentGuard plugin integration

**Scope:**
- `app/services/katello/pulp3/api/generic.rb` (used by Python/OSTree)
- `app/services/katello/pulp3/api/content_guard.rb`
- `lib/katello/repository_types/python.rb`
- `lib/katello/repository_types/ostree.rb`
- All Python/OSTree/ContentGuard Dynflow actions

**Tasks:**
1. Refactor Generic API wrapper (handles Python & OSTree)
2. Refactor ContentGuard API wrapper
3. Update repository type registrations
4. Refactor related Dynflow actions
5. Update tests

**Deliverables:**
- Python, OSTree, ContentGuard APIs refactored
- All related tests passing

---

### Agent 6: VCR Test Infrastructure (vcr-agent)

**Responsibility:** Update VCR test infrastructure for spec-driven approach

**Tasks:**

1. **Create Spec Caching Helper**
   ```ruby
   # test/test_pulp_client_helper.rb
   module TestPulpClientHelper
     mattr_accessor :spec_cache

     def self.setup
       # Record spec fetch once for entire suite
       VCR.use_cassette('shared/pulp_openapi_spec', record: :once) do
         self.spec_cache = Katello::PulpClient::Connection.load_spec(
           SmartProxy.pulp_primary
         )
       end
     end

     def pulp_connection(smart_proxy = SmartProxy.pulp_primary)
       Katello::PulpClient::Connection.new(smart_proxy,
         spec: TestPulpClientHelper.spec_cache)
     end
   end
   ```

2. **Update Test Helper**
   - Add `TestPulpClientHelper.setup` to test suite initialization
   - Provide `pulp_connection` helper to all tests
   - Ensure spec cassette recorded once

3. **Create Migration Guide**
   - Document how to update tests from generated clients to spec-driven
   - Provide before/after examples
   - List common patterns and their replacements

4. **Update Sample Tests**
   - Convert 5-10 representative tests as examples
   - Cover different test patterns (unit, integration, VCR)
   - Document any issues encountered

5. **Regenerate Core Cassettes**
   - Re-record cassettes for refactored code
   - Ensure spec cassette is minimal and shared
   - Verify cassette sizes are reasonable

**Deliverables:**
- VCR infrastructure updated for spec-driven client
- Shared spec cassette (`shared/pulp_openapi_spec.yml`)
- Test helper module with caching
- Migration guide for test updates
- Sample tests converted and passing

**Reference:**
- Current VCR usage in `test/`
- My earlier analysis of VCR compatibility

---

### Agent 7: Code Quality & Issues Review (review-agent)

**Responsibility:** Review all refactored code for bugs, edge cases, and quality

**Tasks:**

1. **API Coverage Audit**
   - Verify all 83 unique Pulp API calls are migrated
   - Check for missed callsites
   - Ensure operation IDs are correct
   - Cross-reference with Ian's operation ID list

2. **Error Handling Review**
   - Verify error cases are handled properly
   - Check ApiError propagation
   - Ensure error messages are helpful
   - Test failure scenarios

3. **Edge Cases**
   - Multi-SmartProxy scenarios
   - Concurrent API calls (Dynflow parallelism)
   - Network failures during spec fetch
   - Spec parsing errors
   - Invalid operation IDs

4. **Response Handling**
   - Verify permissive response wrapper works for all cases
   - Check nil handling for missing fields
   - Test nested response structures
   - Ensure polymorphic responses work (old monkey patch case)

5. **Integration Testing**
   - Full repository lifecycle (create, sync, publish, promote)
   - Test each content type end-to-end
   - Verify no regressions from generated client behavior

6. **Code Quality**
   - Check for code duplication
   - Verify consistent patterns across plugins
   - Review method naming and clarity
   - Check for proper documentation

**Deliverables:**
- Comprehensive code review report
- List of bugs found and fixed
- Edge case test coverage
- Integration test results
- Quality metrics (coverage, complexity, etc.)

**Success Criteria:**
- Zero regressions in existing functionality
- All edge cases handled gracefully
- Error messages clear and actionable
- Code meets Katello quality standards

---

### Agent 8: Maintainability & Upgrade Path Review (maintainability-agent)

**Responsibility:** Assess long-term maintainability and upgrade procedures

**Tasks:**

1. **Code Maintainability Assessment**
   - Review ~350 lines of PulpClient code
   - Compare to ~30,000 lines of generated code
   - Assess understandability for new developers
   - Check for clear separation of concerns
   - Evaluate testability

2. **Pulp Upgrade Workflow**
   - Document step-by-step upgrade process when Pulp is upgraded
   - Identify what changes when Pulp API evolves:
     * New operation IDs added
     * Operation IDs renamed/removed
     * Request/response format changes
     * New required parameters
   - Create upgrade checklist
   - Estimate effort for typical upgrade (3.85 → 3.86)

3. **VCR Re-recording Procedure**
   - Document complete VCR cassette regeneration workflow
   - Estimate time to re-record all cassettes
   - Identify which cassettes need updating vs. unchanged
   - Create automation scripts if possible

4. **Quirks System Maintenance**
   - Assess how quirks accumulate over time
   - Estimate effort to maintain quirks across versions
   - Document when quirks can be removed (version sunset)
   - Evaluate quirks system vs. monkey patches (better/worse?)

5. **Operation ID Discovery**
   - Evaluate developer experience finding operation IDs
   - Compare to method name discovery (autocomplete)
   - Recommend tooling/documentation to help
   - Consider creating operation ID → endpoint mapping doc

6. **Debugging Experience**
   - How easy is it to debug API call failures?
   - Are error messages actionable?
   - Can developers trace through the code easily?
   - Compare to generated client debugging

7. **Testing Effort**
   - Assess test coverage of new code
   - Evaluate test maintenance burden
   - Compare test complexity: generated vs spec-driven
   - Estimate effort to update tests during Pulp upgrades

8. **Risk Assessment**
   - What could go wrong with spec-driven approach?
   - Single points of failure (spec parsing, index building)
   - Performance concerns (spec fetch, parsing overhead)
   - Compatibility with future Pulp versions

**Deliverables:**
- Comprehensive maintainability report
- Pulp upgrade workflow documentation
- VCR re-recording procedure
- Quirks maintenance guide
- Operation ID discovery tooling recommendations
- Risk analysis with mitigations
- Comparison: spec-driven vs generated client maintenance effort
- Long-term sustainability assessment

**Format:** Markdown document with:
- Executive Summary
- Detailed Findings (each topic above)
- Recommendations
- Comparison Tables
- Code Examples
- Estimated Effort Metrics

---

### Agent 9: Developer Documentation (documentation-agent)

**Responsibility:** Create comprehensive developer onboarding and reference documentation

**Tasks:**

1. **Architecture Overview Document**
   ```markdown
   # Pulp Spec-Driven Client Architecture

   ## Overview
   ## Core Components
   ## How It Works
   ## Integration with Katello
   ## Comparison to Generated Clients
   ```

2. **Developer Onboarding Guide**
   - For new developers joining Katello
   - Explains the spec-driven approach
   - How to make Pulp API calls
   - How to find operation IDs
   - Common patterns and examples
   - Troubleshooting guide

3. **API Reference**
   - `PulpClient::Connection` API documentation
   - `call()` method signature and options
   - Response wrapper usage
   - Error handling
   - Multi-proxy usage
   - Code examples for each

4. **Operation ID Mapping Reference**
   ```markdown
   # Pulp Operation ID Reference

   ## Core (pulpcore)
   - `artifacts_create` - Create artifact
   - `repositories_list` - List repositories

   ## RPM (pulp_rpm)
   - `repositories_rpm_rpm_create` - Create RPM repository
   - `repositories_rpm_rpm_sync` - Sync RPM repository

   [etc for all operations]
   ```

5. **Migration Guide (From Generated Clients)**
   - Step-by-step migration instructions
   - Before/after code examples
   - Common patterns and how they change
   - Troubleshooting migration issues
   - VCR test updates

6. **Quirks System Documentation**
   - What are quirks and why they exist
   - How to add new quirks
   - Examples of spec/capability/response quirks
   - When quirks can be removed

7. **Testing Guide**
   - How to test code using PulpClient
   - VCR usage with spec caching
   - Writing new tests
   - Debugging test failures
   - Regenerating cassettes

8. **Pulp Upgrade Procedure**
   - Complete workflow for Pulp upgrades
   - How to identify API changes
   - Updating operation IDs
   - Adding/removing quirks
   - Re-recording VCR cassettes
   - Testing checklist

9. **Troubleshooting Guide**
   - Common errors and solutions
   - Debugging API call failures
   - Spec fetch issues
   - Operation ID not found
   - Response parsing problems
   - Performance issues

10. **Code Examples Collection**
    ```ruby
    # examples/pulp_client_examples.rb

    # Basic usage
    connection = Katello::PulpClient::Connection.new(smart_proxy)

    # List repositories
    response = connection.call("repositories_rpm_rpm_list",
      params: { offset: 0, limit: 10 })

    # Create repository
    response = connection.call("repositories_rpm_rpm_create",
      body: { name: "my-repo", description: "Test" })

    # Sync repository
    response = connection.call("repositories_rpm_rpm_sync",
      params: { rpm_rpm_repository_href: repo.pulp_id },
      body: { remote: remote.pulp_id, mirror: true })

    [... 20+ more examples covering common operations]
    ```

**Deliverables:**
- `docs/pulp_spec_driven_client/`
  - `architecture.md`
  - `developer_guide.md`
  - `api_reference.md`
  - `operation_ids.md`
  - `migration_guide.md`
  - `quirks_system.md`
  - `testing_guide.md`
  - `upgrade_procedure.md`
  - `troubleshooting.md`
- `examples/pulp_client_examples.rb`
- Updated main `README.md` with links to new docs

**Quality Standards:**
- Clear, concise writing
- Plenty of code examples
- Diagrams where helpful (architecture, flow charts)
- Cross-referenced between docs
- Up-to-date with actual implementation
- Reviewed by other agents for accuracy

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Agents:** infrastructure-agent
- Build core PulpClient module
- Create unit tests
- Verify connection, spec fetch, operation lookup work

**Gate:** Core client can make basic API calls successfully

### Phase 2: Core Integration (Week 2)
**Agents:** core-api-agent, vcr-agent
- Refactor Core and YUM APIs
- Update VCR infrastructure
- Migrate YUM tests
- Ensure end-to-end YUM workflow works

**Gate:** YUM repository lifecycle works with spec-driven client

### Phase 3: Parallel Plugin Refactoring (Week 3)
**Agents:** file-container-agent, deb-ansible-agent, misc-plugins-agent (parallel)
- Refactor all remaining plugins simultaneously
- Each agent owns their plugin domains
- Update tests in parallel

**Gate:** All 7 content types work with spec-driven client

### Phase 4: Quality & Review (Week 4)
**Agents:** review-agent, maintainability-agent, documentation-agent (parallel)
- Comprehensive code review
- Maintainability assessment
- Documentation creation
- Final testing and validation

**Gate:** Production-ready, documented, maintainable implementation

### Phase 5: Cleanup (Week 4-5)
**All Agents:**
- Delete monkey patches
- Delete generated client code
- Remove generation tooling
- Update gemspec (remove 9 gem dependencies)
- Final PR review and merge

---

## Success Criteria

### Functional Requirements
- ✅ All 83 unique Pulp API calls working via spec-driven client
- ✅ All 7 content types (YUM, Deb, Container, File, Ansible, Python, OSTree) functional
- ✅ Full repository lifecycle works (create, sync, publish, promote, delete)
- ✅ Multi-SmartProxy support with isolated SSL/auth configs
- ✅ VCR tests passing with spec caching
- ✅ Zero regressions from generated client behavior

### Code Quality
- ✅ ~350 lines of PulpClient code (vs ~30,000 before)
- ✅ Test coverage >90% for new code
- ✅ No monkey patches remaining
- ✅ Clear, documented, maintainable code
- ✅ Rubocop passing
- ✅ All tests green

### Performance
- ✅ Spec fetch + parse <100ms on first call
- ✅ Subsequent calls have negligible overhead
- ✅ No performance regression vs generated clients
- ✅ Concurrent Dynflow tasks work correctly

### Developer Experience
- ✅ Clear documentation for onboarding
- ✅ Easy to find operation IDs
- ✅ Helpful error messages
- ✅ Simple debugging process
- ✅ Straightforward Pulp upgrade procedure

### Long-term Maintainability
- ✅ Pulp upgrade effort <1 day (vs 2-3 days before)
- ✅ VCR re-recording effort <2 hours
- ✅ Quirks system manageable and documented
- ✅ New developers can understand architecture in <1 hour
- ✅ Lower maintenance burden than generated clients

---

## Coordination & Communication

### Daily Standups
Each agent reports:
- What I completed yesterday
- What I'm working on today
- Any blockers or questions

### Dependencies
- **Phase 2 depends on Phase 1** (core client must exist)
- **Phase 3 agents work independently** (can parallelize)
- **Phase 4 depends on Phase 3** (need complete implementation to review)

### Shared Resources
- **Operation ID Mapping:** All agents share this reference
- **VCR Spec Cassette:** Single shared cassette for spec fetch
- **Test Helpers:** VCR agent provides helpers for all other agents

### Communication Channels
- **Blockers:** Post in team chat immediately
- **Questions:** Use AskTeamLead or agent-to-agent messages
- **Design Decisions:** Document in shared design decisions log
- **Progress:** Update task status regularly

---

## Reference Materials

### Required Reading
1. **Ian's Design Document:** https://hackmd.io/@ianballou/rkJKDeicWx
   - Read entire document
   - Understand Option A architecture
   - Study code examples
   - Note quirks system design

2. **Implementation Comparison:** `/home/sajha/mnt1/katello/docs/pulp_vendored_clients_implementation.md`
   - See "Comparison" section
   - Understand trade-offs
   - Review technical differences

3. **Current Codebase:**
   - `app/services/katello/pulp3/api/` - Current API wrappers
   - `lib/katello/repository_types/` - Repository type registrations
   - `app/models/katello/concerns/smart_proxy_extensions.rb` - SmartProxy config
   - `lib/monkeys/` - Monkey patches to eliminate

### OpenAPI Spec Reference
- Fetch from running Pulp: `https://<pulp-server>/pulp/api/v3/docs/api.json`
- Study structure:
  - `paths` - All endpoints and operations
  - `components.schemas` - Data models
  - `info.x-pulp-app-versions` - Plugin versions
  - `operationId` - Operation identifiers

### Operation ID Discovery
```bash
# Fetch spec and extract operation IDs
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq -r '.paths[][] | select(.operationId) | .operationId' | sort

# Find specific operation
curl -u admin:password https://$(hostname)/pulp/api/v3/docs/api.json | \
  jq '.paths[][] | select(.operationId | contains("rpm_sync"))'
```

---

## Risk Mitigation

### Risk: Operation ID Changes Between Pulp Versions
**Mitigation:**
- Build operation ID registry from spec dynamically
- Add aliases for renamed operations in quirks
- Test against multiple Pulp versions

### Risk: Spec Fetch Failure
**Mitigation:**
- Retry with exponential backoff
- Cache spec to disk as fallback
- Provide helpful error messages
- Document manual spec loading for offline environments

### Risk: Unknown API Patterns
**Mitigation:**
- Start with well-known operations (repositories, sync)
- Expand gradually to complex operations
- Test each operation thoroughly
- Document unexpected behaviors in quirks

### Risk: Performance Issues
**Mitigation:**
- Benchmark spec parsing (target <100ms)
- Cache parsed index in memory
- Consider disk cache for development
- Profile critical paths

### Risk: Missing Edge Cases
**Mitigation:**
- Comprehensive test coverage
- Review agent validates all scenarios
- Run existing test suite with new client
- Beta test with dev team before production

---

## Deliverables Checklist

### Code
- [ ] `lib/katello/pulp_client/` complete module (~350 lines)
- [ ] All API wrappers refactored (7 files)
- [ ] All repository types updated (7 files)
- [ ] All Dynflow actions migrated (~50 files)
- [ ] All tests updated and passing (~200 test files)
- [ ] Monkey patches deleted (3 files)
- [ ] Generated client code deleted (~30MB)
- [ ] Gemspec updated (9 dependencies removed)

### Documentation
- [ ] Architecture overview
- [ ] Developer onboarding guide
- [ ] API reference
- [ ] Operation ID mapping
- [ ] Migration guide
- [ ] Quirks system documentation
- [ ] Testing guide
- [ ] Pulp upgrade procedure
- [ ] Troubleshooting guide
- [ ] Code examples collection

### Quality Assurance
- [ ] Code review report
- [ ] Maintainability assessment
- [ ] Upgrade path documentation
- [ ] VCR re-recording procedure
- [ ] Risk analysis
- [ ] Performance benchmarks
- [ ] Test coverage report

---

## Final Notes

### This is a Major Refactoring
- **83 API callsites** to update across codebase
- **~200 test files** to migrate
- **4-5 weeks** estimated effort with parallel agents
- **High risk but high reward** - eliminates technical debt

### Quality Over Speed
- Take time to get it right
- Comprehensive testing at each phase
- Don't skip edge cases
- Document as you go

### Team Coordination is Critical
- Communicate blockers immediately
- Share learnings across agents
- Maintain shared operation ID registry
- Keep documentation up-to-date

### Success Looks Like
- Clean, minimal codebase (~350 lines)
- No monkey patches
- No generated code
- Easy Pulp upgrades
- Happy developers

---

## Getting Started

1. **Team Lead:** Create team and spawn all 9 agents
2. **All Agents:** Read required materials (Ian's doc, comparison)
3. **Infrastructure Agent:** Start Phase 1 immediately
4. **Other Agents:** Prepare by studying current codebase
5. **Daily Standups:** Keep team synchronized
6. **Gate Reviews:** Ensure quality at each phase transition

**Ready to build a better Pulp client! 🚀**

---

## Questions for Team Lead

Before starting, please confirm:

1. **Scope:** Are all 7 content types in scope, or should we prioritize subset?
2. **Timeline:** Is 4-5 week timeline acceptable, or is there urgency?
3. **Testing:** Can we use live Pulp server, or VCR-only?
4. **Rollback:** Should we maintain generated clients in parallel during transition?
5. **Documentation:** Any specific format/location preferences?

**Awaiting approval to proceed with implementation.**
