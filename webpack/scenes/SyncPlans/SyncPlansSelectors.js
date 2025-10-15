import {
  selectAPIStatus,
  selectAPIError,
  selectAPIResponse,
} from 'foremanReact/redux/API/APISelectors';
import { STATUS } from 'foremanReact/constants';
import SYNC_PLANS_KEY, {
  CREATE_SYNC_PLAN_KEY,
  UPDATE_SYNC_PLAN_KEY,
  DELETE_SYNC_PLAN_KEY,
  SYNC_PLAN_RUN_KEY,
  syncPlanDetailsKey,
  syncPlanProductsKey,
} from './SyncPlansConstants';

// List selectors
export const selectSyncPlans = (state, index = '') =>
  selectAPIResponse(state, SYNC_PLANS_KEY + index) || {};

export const selectSyncPlansStatus = (state, index = '') =>
  selectAPIStatus(state, SYNC_PLANS_KEY + index) || STATUS.PENDING;

export const selectSyncPlansError = (state, index = '') =>
  selectAPIError(state, SYNC_PLANS_KEY + index);

// Create selectors
export const selectCreateSyncPlan = state =>
  selectAPIResponse(state, CREATE_SYNC_PLAN_KEY) || {};

export const selectCreateSyncPlanStatus = state =>
  selectAPIStatus(state, CREATE_SYNC_PLAN_KEY) || STATUS.PENDING;

export const selectCreateSyncPlanError = state =>
  selectAPIError(state, CREATE_SYNC_PLAN_KEY);

// Update selectors
export const selectUpdateSyncPlanStatus = state =>
  selectAPIStatus(state, UPDATE_SYNC_PLAN_KEY) || STATUS.PENDING;

export const selectUpdateSyncPlanError = state =>
  selectAPIError(state, UPDATE_SYNC_PLAN_KEY);

// Delete selectors
export const selectDeleteSyncPlanStatus = state =>
  selectAPIStatus(state, DELETE_SYNC_PLAN_KEY) || STATUS.PENDING;

export const selectDeleteSyncPlanError = state =>
  selectAPIError(state, DELETE_SYNC_PLAN_KEY);

// Details selectors
export const selectSyncPlanDetails = (state, id) =>
  selectAPIResponse(state, syncPlanDetailsKey(id)) || {};

export const selectSyncPlanDetailsStatus = (state, id) =>
  selectAPIStatus(state, syncPlanDetailsKey(id)) || STATUS.PENDING;

export const selectSyncPlanDetailsError = (state, id) =>
  selectAPIError(state, syncPlanDetailsKey(id));

// Products selectors
export const selectSyncPlanProducts = (state, id) =>
  selectAPIResponse(state, syncPlanProductsKey(id)) || {};

export const selectSyncPlanProductsStatus = (state, id) =>
  selectAPIStatus(state, syncPlanProductsKey(id)) || STATUS.PENDING;

export const selectSyncPlanProductsError = (state, id) =>
  selectAPIError(state, syncPlanProductsKey(id));