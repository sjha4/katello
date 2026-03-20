# Migration Troubleshooting

## Error: `undefined method pulp3_skip_publication' for nil:NilClass`

### Root Cause
This error occurs because Rails has cached the old repository type registrations from before the migration. The repository types were correctly migrated (gem classes removed, operation prefixes added), but the running Rails server still has the old definitions in memory.

### Solution

**Option 1: Restart Rails Server (Recommended)**
```bash
# Stop the server
pkill -f "puma\|foreman"

# Clear Spring cache if you use it
spring stop

# Clear Rails cache
cd /home/vagrant/foreman
bundle exec rake tmp:cache:clear

# Restart server
bundle exec foreman start
```

**Option 2: Clear All Caches**
```bash
cd /home/vagrant/foreman
bundle exec rake tmp:clear
bundle exec rake assets:clear
bundle exec rake cache:clear
```

**Option 3: Full Reset (if errors persist)**
```bash
cd /home/vagrant/foreman
bundle exec rake katello:reset
```

### Why This Happens
1. Repository type definitions are loaded when Rails starts
2. The migration changed the repository type registrations
3. The running server still has old definitions in memory
4. Accessing `repository_type.pulp3_skip_publication` fails because the cached definition doesn't have the right structure

### Verification
After restart, check that repository types load correctly:
```bash
cd /home/vagrant/foreman
bundle exec rails console
```

Then in console:
```ruby
# Verify repository types are loaded
Katello::RepositoryTypeManager.find('yum')
=> #<Katello::RepositoryType ...>

# Check a specific attribute
Katello::RepositoryTypeManager.find('docker').pulp3_skip_publication
=> true

# All types should be present
Katello::RepositoryTypeManager.enabled_repository_types.keys
=> [:yum, :file, :docker, :deb, :ansible_collection, :ostree, :python]
```

If you still see errors after restart, please share the full error trace.
