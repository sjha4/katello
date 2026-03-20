# Content Credentials Details Test Suite

This directory contains comprehensive React Testing Library tests for the Content Credentials Details page and all its subtabs.

## Test Files

### ContentCredentialDetails.test.js
Main details page tests including:
- Page rendering and data loading
- Tab navigation (Details, Products, Repositories, ACS)
- Permission-based UI rendering
- Delete confirmation modal
- Error and loading states
- Breadcrumb navigation

**Total Tests: 15**

### ContentCredentialInfo.test.js
Details/Info tab tests including:
- GPG Key vs Certificate type rendering
- Product and repository count display
- Inline editing of name and content
- Permission-based edit controls
- Mixed content type handling (multiple product/repo types)

**Total Tests: 10**

### ContentCredentialProducts.test.js
Products tab tests including:
- Table rendering with product data
- Product filtering (case-insensitive)
- Empty state handling
- Product and repository count links
- Multiple product types (GPG Key, SSL CA, SSL Client, SSL Key)
- OUIA IDs for accessibility
- Null/missing data handling

**Total Tests: 13**

### ContentCredentialRepositories.test.js
Repositories tab tests including:
- Table rendering with repository data
- Repository filtering (case-insensitive)
- Product, type, and "Used as" columns
- Repository and product links
- Multiple repository types
- Missing product data handling
- OUIA IDs for accessibility

**Total Tests: 16**

### ContentCredentialACS.test.js
Alternate Content Sources tab tests including:
- ACS table rendering
- ACS filtering (case-insensitive)
- Empty state handling
- Multiple ACS types (SSL CA, SSL Client, SSL Key)
- Duplicate name handling
- OUIA IDs for accessibility

**Total Tests: 15**

### ContentCredentialDetailsIntegration.test.js
End-to-end integration tests including:
- Full tab navigation workflow
- Cross-tab filter independence
- Certificate type with ACS
- Empty content credential
- Content credential updates
- Read-only user scenarios
- API error handling
- Product/repository count verification

**Total Tests: 10**

### contentCredentialDetails.fixtures.json
Test data fixtures including:
- `contentCredentialGPG`: GPG key with products and repositories
- `contentCredentialCert`: SSL certificate with ACS
- `contentCredentialEmpty`: Empty content credential
- `contentCredentialReadOnly`: Read-only content credential

## Running Tests

```bash
# Run all Content Credentials tests
npm test -- webpack/scenes/ContentCredentials/Details/__tests__/

# Run a specific test file
npx jest webpack/scenes/ContentCredentials/Details/__tests__/ContentCredentialDetails.test.js

# Run in watch mode
npm run test:watch webpack/scenes/ContentCredentials/Details/__tests__/
```

## Test Coverage

**Total: 79 comprehensive tests**

Coverage includes:
- ✅ All four subtabs (Details, Products, Repositories, ACS)
- ✅ User permissions (view, edit, delete)
- ✅ API integration with nock mocking
- ✅ Filtering and search functionality
- ✅ Empty states and error handling
- ✅ Accessibility (OUIA IDs)
- ✅ Edge cases (null data, missing fields)
- ✅ Integration workflows

## Testing Patterns Used

- **React Testing Library** (RTL) for component rendering
- **nock** for HTTP request mocking
- **renderWithRedux** for components using Redux
- **patientlyWaitFor** for async assertions with extended timeout
- **fireEvent** for user interactions
- **OUIA IDs** for stable element selection

## Test Data Patterns

All tests use realistic mock data that matches the actual API response structure:
- Content credentials with different types (GPG, SSL cert)
- Products with repository counts
- Repositories with product associations
- Alternate Content Sources
- Permission structures

## Notes

- Tests follow existing Katello test patterns
- API endpoints use `/katello/api/v2/content_credentials/:id`
- All subtabs use client-side filtering (no API calls)
- Integration tests verify complete user workflows
- Tests ensure >80% code coverage target

## Future Enhancements

Potential additions:
- Snapshot testing for complex UI states
- Performance testing for large datasets
- Visual regression testing
- Additional edge case coverage
