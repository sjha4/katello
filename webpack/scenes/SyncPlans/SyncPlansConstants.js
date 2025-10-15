import { translate as __ } from 'foremanReact/common/I18n';

export const SYNC_PLANS_KEY = 'SYNC_PLANS';
export const CREATE_SYNC_PLAN_KEY = 'CREATE_SYNC_PLAN';
export const UPDATE_SYNC_PLAN_KEY = 'UPDATE_SYNC_PLAN';
export const DELETE_SYNC_PLAN_KEY = 'DELETE_SYNC_PLAN';
export const SYNC_PLAN_DETAILS_KEY = 'SYNC_PLAN_DETAILS';
export const SYNC_PLAN_RUN_KEY = 'SYNC_PLAN_RUN';
export const SYNC_PLAN_ADD_PRODUCTS_KEY = 'SYNC_PLAN_ADD_PRODUCTS';
export const SYNC_PLAN_REMOVE_PRODUCTS_KEY = 'SYNC_PLAN_REMOVE_PRODUCTS';
export const SYNC_PLAN_PRODUCTS_KEY = 'SYNC_PLAN_PRODUCTS';

export const syncPlanDetailsKey = id => `${SYNC_PLANS_KEY}/DETAILS/${id}`;
export const syncPlanProductsKey = id => `${SYNC_PLANS_KEY}/PRODUCTS/${id}`;

export const SYNC_PLAN_INTERVALS = [
  { id: 'hourly', label: __('Hourly') },
  { id: 'daily', label: __('Daily') },
  { id: 'weekly', label: __('Weekly') },
  { id: 'custom cron', label: __('Custom cron') },
];

export default SYNC_PLANS_KEY;