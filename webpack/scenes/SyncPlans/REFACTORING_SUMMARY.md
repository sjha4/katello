# Sync Plans Refactoring Summary

## Overview
The Sync Plans UI has been refactored to follow the FlatpakRemotes pattern, using `TableIndexPage` and the generic API Redux system instead of custom reducers.

## Key Changes

### 1. Removed Custom Reducer
**Before:** Used a custom `SyncPlansReducer.js` with action types for each operation
**After:** Uses the generic API reducer from `foremanReact/redux/API`

**Files Removed:**
- `webpack/scenes/SyncPlans/SyncPlansReducer.js`
- `webpack/scenes/SyncPlans/Table/` directory
- `webpack/scenes/SyncPlans/components/` directory

### 2. Updated Selectors
**File:** `SyncPlansSelectors.js`

**Before:**
```javascript
export const selectSyncPlansState = state =>
  state.katello?.syncPlans || {};
```

**After:**
```javascript
import { selectAPIResponse, selectAPIStatus, selectAPIError } from 'foremanReact/redux/API/APISelectors';

export const selectSyncPlans = (state, index = '') =>
  selectAPIResponse(state, SYNC_PLANS_KEY + index) || {};
```

### 3. Updated Actions
**File:** `SyncPlansActions.js`

**Before:** Used custom Redux actions with `dispatch()`
**After:** Uses `post`, `put`, `del` helpers from `foremanReact/redux/API`

```javascript
import { API_OPERATIONS, post, put, del } from 'foremanReact/redux/API';

export const createSyncPlan = params => post({
  type: API_OPERATIONS.POST,
  key: CREATE_SYNC_PLAN_KEY,
  url: api.getApiUrl('/sync_plans'),
  params: createParamsWithOrg(params),
  successToast: response => syncPlanCreateSuccessToast(response),
  errorToast: error => syncPlanErrorToast(error),
});
```

### 4. Refactored Main Page Component
**File:** `SyncPlansPage.js`

**Key Changes:**
- Now uses `TableIndexPage` wrapper component
- Uses `useTableIndexAPIResponse` and `useSetParamsAndApiAndSearch` hooks
- Directly renders PatternFly Table components instead of custom TableWrapper
- Manages modal state locally with `useState`

**Pattern:**
```javascript
const SyncPlansPage = () => {
  const response = useSelector(selectSyncPlans);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const apiOptions = { key: 'SYNC_PLANS' };
  const apiUrl = '/katello/api/v2/sync_plans';

  const apiResponse = useTableIndexAPIResponse({
    apiUrl,
    apiOptions,
    defaultParams,
  });

  return (
    <TableIndexPage
      apiUrl={apiUrl}
      apiOptions={apiOptions}
      header={__('Sync Plans')}
      creatable={canCreate}
      customCreateAction={() => openCreateModal}
    >
      {/* Table content */}
    </TableIndexPage>
  );
};
```

### 5. Updated Index Export
**File:** `index.js`

**Before:**
```javascript
export { default } from './SyncPlansPage';
```

**After:**
```javascript
import { withRouter } from 'react-router-dom';
import SyncPlansPage from './SyncPlansPage';

export default withRouter(SyncPlansPage);
```

### 6. Removed Reducer Registration
**File:** `webpack/redux/reducers/index.js`

**Removed:**
```javascript
import syncPlans from '../../scenes/SyncPlans/SyncPlansReducer';
// ...
export default combineReducers({
  // ...
  syncPlans,  // ❌ Removed
});
```

## Benefits of the Refactoring

1. **Less Boilerplate**: No need to define action types, action creators, and reducers
2. **Consistent Pattern**: Matches FlatpakRemotes and other modern Katello components
3. **Automatic Caching**: The API reducer handles caching automatically
4. **Better Hook Integration**: Uses modern React hooks throughout
5. **Cleaner Code**: Removed ~200 lines of reducer boilerplate

## File Structure Comparison

### Before
```
SyncPlans/
├── index.js
├── SyncPlansPage.js
├── SyncPlansActions.js
├── SyncPlansReducer.js        ❌ Removed
├── SyncPlansSelectors.js
├── SyncPlansConstants.js
├── SyncPlansHelpers.js
├── Table/
│   ├── SyncPlansTable.js      ❌ Removed
│   └── index.js               ❌ Removed
├── components/                 ❌ Removed
├── Create/
│   ├── CreateSyncPlanModal.js
│   └── index.js
└── Details/
    ├── SyncPlanDetails.js
    ├── SyncPlanDetailsInfo.js
    ├── SyncPlanProducts.js
    └── index.js
```

### After
```
SyncPlans/
├── index.js                    ✅ Updated
├── SyncPlansPage.js            ✅ Refactored
├── SyncPlansActions.js         ✅ Updated
├── SyncPlansSelectors.js       ✅ Updated
├── SyncPlansConstants.js       ✅ Simplified
├── SyncPlansHelpers.js
├── Create/
│   ├── CreateSyncPlanModal.js
│   └── index.js
└── Details/
    ├── SyncPlanDetails.js
    ├── SyncPlanDetailsInfo.js
    ├── SyncPlanProducts.js
    └── index.js
```

## Testing Checklist

- [ ] Sync Plans list page loads correctly
- [ ] Search and filtering work
- [ ] Sorting columns works
- [ ] Pagination works
- [ ] Create new sync plan opens modal
- [ ] Creating a sync plan saves and redirects to details
- [ ] Run sync action works
- [ ] Delete sync plan works
- [ ] Navigating to details page works
- [ ] Editing sync plan details works
- [ ] Managing products works

## Migration Notes

- All existing API endpoints remain unchanged
- No backend changes required
- The component is backward compatible with existing routes
- Details page components remain largely unchanged

## References

- FlatpakRemotes implementation: `webpack/scenes/FlatpakRemotes/`
- TableIndexPage: `foreman/webpack/foremanReact/components/PF4/TableIndexPage/`
- API Redux system: `foreman/webpack/foremanReact/redux/API/`