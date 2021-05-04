import {
  selectAPIStatus,
  selectAPIError,
  selectAPIResponse,
} from 'foremanReact/redux/API/APISelectors';
import { STATUS } from 'foremanReact/constants';
import { PUBLISH_CONTENT_VIEW_KEY } from '../ContentViewsConstants';

export const selectPublishContentViews = state =>
  selectAPIResponse(state, PUBLISH_CONTENT_VIEW_KEY) || {};

export const selectPublishContentViewStatus = state =>
  selectAPIStatus(state, PUBLISH_CONTENT_VIEW_KEY) || STATUS.PENDING;

export const selectPublishContentViewError = state =>
  selectAPIError(state, PUBLISH_CONTENT_VIEW_KEY);
