# Sync Plans React Migration

This directory contains the React implementation of the Sync Plans UI, migrated from AngularJS (Bastion).

## Migration Overview

The Sync Plans feature has been fully migrated from AngularJS to React, providing:
- Modern React patterns using functional components and hooks
- Improved performance and maintainability
- Better type safety and error handling
- Consistent UI/UX with other React-based pages in Katello

## Directory Structure

```
SyncPlans/
├── Table/                      # List view of sync plans
│   ├── SyncPlansTable.js      # Main table component
│   └── index.js
├── Details/                    # Sync plan details and management
│   ├── SyncPlanDetails.js     # Details page container
│   ├── SyncPlanDetailsInfo.js # Info tab with editable fields
│   ├── SyncPlanProducts.js    # Products management (list/add/remove)
│   └── index.js
├── Create/                     # Create new sync plan
│   ├── CreateSyncPlanModal.js # Modal form for creating sync plans
│   └── index.js
├── components/                 # Shared components (if needed)
├── SyncPlansActions.js        # Redux actions and API calls
├── SyncPlansConstants.js      # Constants and enums
├── SyncPlansReducer.js        # Redux reducer
├── SyncPlansSelectors.js      # Redux selectors
├── SyncPlansPage.js           # Main page component
└── index.js
```

## Features Migrated

### 1. Sync Plans List View
- **AngularJS**: `sync-plans.controller.js` + `sync-plans.html`
- **React**: `Table/SyncPlansTable.js`
- Features:
  - Sortable table with pagination
  - Search and filtering via SearchBar
  - Create new sync plan button
  - Quick actions: Run sync, Delete
  - Links to detail pages

### 2. Create Sync Plan
- **AngularJS**: `new-sync-plan.controller.js` + `new-sync-plan-form.html`
- **React**: `Create/CreateSyncPlanModal.js`
- Features:
  - Modal form with validation
  - Support for all sync intervals (hourly, daily, weekly, custom cron)
  - Date/time picker for sync schedule
  - Form validation with server-side error handling
  - Auto-redirect to details page after creation

### 3. Sync Plan Details
- **AngularJS**: `sync-plan-details-info.controller.js` + `sync-plan-info.html`
- **React**: `Details/SyncPlanDetailsInfo.js`
- Features:
  - Inline editing of all fields
  - Display sync plan information
  - Quick actions: Run sync, Delete
  - Edit mode with save/cancel for each field
  - Link to recurring logic in Foreman Tasks

### 4. Products Management
- **AngularJS**: `sync-plan-products.controller.js` + `sync-plan-add-products.controller.js`
- **React**: `Details/SyncPlanProducts.js`
- Features:
  - Tabbed interface (List/Remove vs Add)
  - Product selection with checkboxes
  - Bulk add/remove operations
  - Product search and filtering
  - Links to product detail pages

## API Endpoints

All API interactions use the Katello API v2:

- `GET /katello/api/v2/organizations/:org_id/sync_plans` - List sync plans
- `POST /katello/api/v2/organizations/:org_id/sync_plans` - Create sync plan
- `GET /katello/api/v2/organizations/:org_id/sync_plans/:id` - Get sync plan details
- `PUT /katello/api/v2/organizations/:org_id/sync_plans/:id` - Update sync plan
- `DELETE /katello/api/v2/organizations/:org_id/sync_plans/:id` - Delete sync plan
- `PUT /katello/api/v2/organizations/:org_id/sync_plans/:id/sync` - Run sync now
- `PUT /katello/api/v2/organizations/:org_id/sync_plans/:id/add_products` - Add products
- `PUT /katello/api/v2/organizations/:org_id/sync_plans/:id/remove_products` - Remove products
- `GET /katello/api/v2/products?sync_plan_id=:id` - List products in sync plan
- `GET /katello/api/v2/products?available_for=sync_plan&sync_plan_id=:id` - List available products

## Key Components

### SyncPlansTable
Main table view using TableWrapper component from Katello. Provides:
- Sorting by name, sync_date, interval, next_sync
- Pagination
- Search with bookmarks
- Action menu for each sync plan

### CreateSyncPlanModal
PatternFly modal form for creating new sync plans. Features:
- Form validation
- Date and time pickers
- Interval selector with custom cron support
- Server-side error handling
- Success navigation to details page

### SyncPlanDetailsInfo
Detail view with inline editing capabilities:
- Each field can be edited individually
- Save/cancel buttons per field
- Combines date and time fields for sync_date
- Handles custom cron expressions
- Actions for run sync and delete

### SyncPlanProducts
Dual-purpose component for managing products:
- Tab-based navigation (List/Remove vs Add)
- Uses separate API calls for assigned vs available products
- Bulk selection and operations
- Integrates with existing product table patterns

## Redux Integration

The sync plans state is managed through Redux:

```javascript
state.katello.syncPlans = {
  SYNC_PLANS: {              // Main list
    results: [],
    status: 'RESOLVED',
    // ... metadata
  },
  SYNC_PLAN_DETAILS_<id>: {  // Individual sync plan details
    results: {},
    status: 'RESOLVED',
  },
  SYNC_PLAN_PRODUCTS_<id>: { // Products for sync plan
    results: [],
    status: 'RESOLVED',
  },
  // ... other keys for create, update, delete operations
}
```

## Routing

Routes are registered in `/webpack/containers/Application/config.js`:

- `/sync_plans` - List view
- `/sync_plans/:id` - Details view (with sub-routes for products, etc.)

## Migration Notes

### Key Differences from AngularJS

1. **State Management**: Uses Redux instead of AngularJS services
2. **Forms**: PatternFly 4 form components instead of custom directives
3. **Inline Editing**: Custom implementation instead of bst-edit directives
4. **Date/Time**: PatternFly DatePicker/TimePicker instead of ui-bootstrap
5. **Tabs**: PatternFly Tabs component instead of ui-router states

### Improvements Over AngularJS

1. **Better Performance**: React's virtual DOM and efficient rendering
2. **Type Safety**: PropTypes validation (can be enhanced with TypeScript)
3. **Error Handling**: Comprehensive error handling with user-friendly messages
4. **Code Organization**: Clear separation of concerns
5. **Maintainability**: Modern React patterns are easier to understand and maintain
6. **Consistency**: Matches patterns used in other Katello React pages

### Known Limitations

1. **Permissions**: Permission checking needs to be implemented (denied() helper)
2. **Advanced Features**: Some advanced features from AngularJS may need additional implementation
3. **Sync Status Display**: Product sync status display needs proper implementation
4. **Testing**: Comprehensive unit and integration tests should be added

## Testing

TODO: Add comprehensive tests for:
- Component rendering
- User interactions
- API integration
- Error handling
- Redux state management

## Future Enhancements

1. Add TypeScript for better type safety
2. Implement comprehensive permission checking
3. Add product sync status visualization
4. Enhance error messages and validation
5. Add loading skeletons for better UX
6. Implement undo/redo for edits
7. Add bulk operations for sync plans
8. Implement export/import functionality

## Related Files

- **AngularJS Implementation**: `/engines/bastion_katello/app/assets/javascripts/bastion_katello/sync-plans/`
- **API Routes**: `/app/controllers/katello/api/v2/sync_plans_controller.rb`
- **Model**: `/app/models/katello/sync_plan.rb`
- **Permissions**: Defined in Foreman's permission system

## Developer Notes

When making changes to this implementation:

1. Follow existing React patterns in Katello
2. Use TableWrapper for list views
3. Use PatternFly 4 components
4. Handle errors gracefully with user-friendly messages
5. Maintain backward compatibility with the API
6. Update this README with significant changes
7. Add tests for new features

## References

- [PatternFly React Documentation](https://www.patternfly.org/v4/get-started/develop)
- [Katello API Documentation](https://theforeman.org/plugins/katello/nightly/api/apidoc/v2/sync_plans.html)
- [React Hooks Documentation](https://reactjs.org/docs/hooks-intro.html)
- [Redux Documentation](https://redux.js.org/)