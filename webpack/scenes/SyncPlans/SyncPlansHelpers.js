import { translate as __ } from 'foremanReact/common/I18n';

/**
 * Formats a sync plan interval for display
 * @param {string} interval - The interval value
 * @returns {string} Formatted interval
 */
export const formatInterval = (interval) => {
  if (!interval) return '';
  const formatted = interval.replace('_', ' ');
  return __(formatted.charAt(0).toUpperCase() + formatted.slice(1));
};

/**
 * Combines date and time into a single datetime string
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @returns {string} Combined datetime string
 */
export const combineDateAndTime = (date, time) => {
  if (!date || !time) return null;

  const [hours, minutes] = time.split(':');
  const syncDateTime = new Date(date);
  syncDateTime.setHours(parseInt(hours, 10));
  syncDateTime.setMinutes(parseInt(minutes, 10));
  syncDateTime.setSeconds(0);

  return syncDateTime.toString();
};

/**
 * Extracts date and time from a datetime string
 * @param {string} datetime - Datetime string
 * @returns {object} Object with date and time properties
 */
export const extractDateAndTime = (datetime) => {
  if (!datetime) {
    return {
      date: new Date().toISOString().split('T')[0],
      time: '00:00',
    };
  }

  const dt = new Date(datetime);
  const date = dt.toISOString().split('T')[0];
  const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  return { date, time };
};

/**
 * Validates a cron expression (basic validation)
 * @param {string} cronExpression - Cron expression to validate
 * @returns {boolean} True if valid
 */
export const validateCronExpression = (cronExpression) => {
  if (!cronExpression) return false;

  const parts = cronExpression.trim().split(/\s+/);
  // Basic check: cron expressions typically have 5 or 6 parts
  return parts.length >= 5 && parts.length <= 6;
};

/**
 * Gets the label for a sync plan interval
 * @param {string} intervalId - Interval ID
 * @param {array} intervals - Array of interval objects
 * @returns {string} Interval label
 */
export const getIntervalLabel = (intervalId, intervals) => {
  const interval = intervals.find(i => i.id === intervalId);
  return interval ? interval.label : intervalId;
};

/**
 * Checks if a sync plan is enabled
 * @param {object} syncPlan - Sync plan object
 * @returns {boolean} True if enabled
 */
export const isSyncPlanEnabled = (syncPlan) => {
  return syncPlan?.enabled === true;
};

/**
 * Checks if a sync plan uses custom cron
 * @param {object} syncPlan - Sync plan object
 * @returns {boolean} True if uses custom cron
 */
export const usesCustomCron = (syncPlan) => {
  return syncPlan?.interval === 'custom cron';
};

/**
 * Formats the sync plan name with enabled status indicator
 * @param {string} name - Sync plan name
 * @param {boolean} enabled - Whether sync is enabled
 * @returns {string} Formatted name
 */
export const formatSyncPlanName = (name, enabled) => {
  return enabled ? name : `${name} (${__('Disabled')})`;
};

/**
 * Calculates the next sync date based on interval
 * This is a helper for display purposes only
 * The actual next sync is calculated by the backend
 * @param {string} lastSync - Last sync date
 * @param {string} interval - Sync interval
 * @returns {Date|null} Estimated next sync date
 */
export const estimateNextSync = (lastSync, interval) => {
  if (!lastSync || !interval) return null;

  const last = new Date(lastSync);
  const next = new Date(last);

  switch (interval) {
    case 'hourly':
      next.setHours(last.getHours() + 1);
      break;
    case 'daily':
      next.setDate(last.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(last.getDate() + 7);
      break;
    default:
      return null; // Can't estimate for custom cron
  }

  return next;
};

/**
 * Validates sync plan form data
 * @param {object} formData - Form data to validate
 * @returns {object} Validation errors object
 */
export const validateSyncPlanForm = (formData) => {
  const errors = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = __('Name is required');
  }

  if (!formData.interval) {
    errors.interval = __('Interval is required');
  }

  if (formData.interval === 'custom cron' && !formData.cronExpression?.trim()) {
    errors.cronExpression = __('Cron expression is required for custom cron interval');
  }

  if (formData.interval === 'custom cron' && formData.cronExpression &&
      !validateCronExpression(formData.cronExpression)) {
    errors.cronExpression = __('Invalid cron expression format');
  }

  if (!formData.syncDate) {
    errors.syncDate = __('Start date is required');
  }

  if (!formData.syncTime) {
    errors.syncTime = __('Start time is required');
  }

  return errors;
};

/**
 * Prepares sync plan data for API submission
 * @param {object} formData - Form data
 * @returns {object} API-ready data
 */
export const prepareSyncPlanData = (formData) => {
  const data = {
    name: formData.name,
    description: formData.description || '',
    interval: formData.interval,
    sync_date: combineDateAndTime(formData.syncDate, formData.syncTime),
    enabled: formData.enabled !== undefined ? formData.enabled : true,
  };

  if (formData.interval === 'custom cron') {
    data.cron_expression = formData.cronExpression;
  }

  return data;
};

export default {
  formatInterval,
  combineDateAndTime,
  extractDateAndTime,
  validateCronExpression,
  getIntervalLabel,
  isSyncPlanEnabled,
  usesCustomCron,
  formatSyncPlanName,
  estimateNextSync,
  validateSyncPlanForm,
  prepareSyncPlanData,
};