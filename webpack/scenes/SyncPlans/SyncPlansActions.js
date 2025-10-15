import { translate as __ } from 'foremanReact/common/I18n';
import { API_OPERATIONS, get, post, put, del } from 'foremanReact/redux/API';
import api, { orgId } from '../../services/api';
import {
  CREATE_SYNC_PLAN_KEY,
  UPDATE_SYNC_PLAN_KEY,
  DELETE_SYNC_PLAN_KEY,
  SYNC_PLAN_RUN_KEY,
  syncPlanDetailsKey,
} from './SyncPlansConstants';
import { getResponseErrorMsgs } from '../../utils/helpers';

export const createParamsWithOrg = params => ({
  organization_id: orgId(),
  ...params,
});

const syncPlanCreateSuccessToast = (response) => {
  const { data: { name } } = response;
  return __(`Sync Plan ${name} created`);
};

const syncPlanUpdateSuccessToast = (response) => {
  const { data: { name } } = response;
  return __(`Sync Plan ${name} updated`);
};

const syncPlanDeleteSuccessToast = () => __('Sync Plan deleted');

const syncPlanRunSyncSuccessToast = (response) => {
  const { data: { name } } = response;
  return __(`Sync started for Sync Plan ${name}`);
};

export const syncPlanErrorToast = error => getResponseErrorMsgs(error.response);

export const createSyncPlan = params => post({
  type: API_OPERATIONS.POST,
  key: CREATE_SYNC_PLAN_KEY,
  url: api.getApiUrl(`/organizations/${orgId()}/sync_plans`),
  params: createParamsWithOrg(params),
  successToast: response => syncPlanCreateSuccessToast(response),
  errorToast: error => syncPlanErrorToast(error),
});

export const updateSyncPlan = (id, params) => put({
  type: API_OPERATIONS.PUT,
  key: UPDATE_SYNC_PLAN_KEY,
  url: api.getApiUrl(`/sync_plans/${id}`),
  params: createParamsWithOrg(params),
  successToast: response => syncPlanUpdateSuccessToast(response),
  errorToast: error => syncPlanErrorToast(error),
});

export const deleteSyncPlan = id => del({
  type: API_OPERATIONS.DELETE,
  key: DELETE_SYNC_PLAN_KEY,
  url: api.getApiUrl(`/sync_plans/${id}`),
  params: { organization_id: orgId() },
  successToast: () => syncPlanDeleteSuccessToast(),
  errorToast: error => syncPlanErrorToast(error),
});

export const runSyncPlan = id => put({
  type: API_OPERATIONS.PUT,
  key: SYNC_PLAN_RUN_KEY,
  url: api.getApiUrl(`/sync_plans/${id}/sync`),
  params: { organization_id: orgId() },
  successToast: response => syncPlanRunSyncSuccessToast(response),
  errorToast: error => syncPlanErrorToast(error),
});

export const getSyncPlanDetails = id => get({
  type: API_OPERATIONS.GET,
  key: syncPlanDetailsKey(id),
  url: api.getApiUrl(`/sync_plans/${id}`),
  params: { organization_id: orgId() },
});