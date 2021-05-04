import { translate as __ } from 'foremanReact/common/I18n';
import { API_OPERATIONS, get, post } from 'foremanReact/redux/API';
import { Link } from 'react-router-dom';
import { urlBuilder } from 'foremanReact/common/urlHelpers';
import api, { orgId } from '../../services/api';
import CONTENT_VIEWS_KEY, {
  CREATE_CONTENT_VIEW_KEY, COPY_CONTENT_VIEW_KEY,
  PUBLISH_CONTENT_VIEW_KEY,
} from './ContentViewsConstants';
import { getResponseErrorMsgs } from '../../utils/helpers';

export const createContentViewsParams = extraParams => ({
  organization_id: orgId(),
  nondefault: true,
  ...extraParams,
});

const getContentViews = extraParams => get({
  type: API_OPERATIONS.GET,
  key: CONTENT_VIEWS_KEY,
  url: api.getApiUrl('/content_views'),
  params: createContentViewsParams(extraParams),
});

const cvSuccessToast = (response) => {
  const { data: { name } } = response;
  return __(`Content view ${name} created`);
};

const cvPublishSuccessToast = (response) => {
  const { data: { id } } = response;
  return __(`Content view publish task started ${id}`);
};

const cvErrorToast = (error) => {
  const message = getResponseErrorMsgs(error.response);
  return message;
};

export const createContentView = params => post({
  type: API_OPERATIONS.POST,
  key: CREATE_CONTENT_VIEW_KEY,
  url: api.getApiUrl('/content_views'),
  params,
  successToast: response => cvSuccessToast(response),
  errorToast: error => cvErrorToast(error),
});

export const copyContentView = params => post({
  type: API_OPERATIONS.POST,
  key: COPY_CONTENT_VIEW_KEY,
  url: api.getApiUrl(`/content_views/${params.id}/copy`),
  params,
  successToast: response => cvSuccessToast(response),
  errorToast: error => cvErrorToast(error),
});

export const publishContentView = params => post({
  type: API_OPERATIONS.POST,
  key: PUBLISH_CONTENT_VIEW_KEY,
  url: api.getApiUrl(`/content_views/${params.id}/publish`),
  params,
  successToast: response => cvPublishSuccessToast(response),
  errorToast: error => cvErrorToast(error),
});

export default getContentViews;
