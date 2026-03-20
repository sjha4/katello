import { API_OPERATIONS, APIActions, get, put } from 'foremanReact/redux/API';
import { translate as __ } from 'foremanReact/common/I18n';
import api, { orgId } from '../../services/api';
import { getResponseErrorMsgs } from '../../utils/helpers';
import {
  GET_CONTENT_CREDENTIALS_KEY,
  contentCredentialDetailsKey,
  UPDATE_CONTENT_CREDENTIAL,
  UPDATE_CONTENT_CREDENTIAL_SUCCESS,
  UPDATE_CONTENT_CREDENTIAL_FAILURE,
  DELETE_CONTENT_CREDENTIAL_KEY,
} from './ContentCredentialConstants';

export const getContentCredentials = (params = {}) => get({
  type: API_OPERATIONS.GET,
  key: GET_CONTENT_CREDENTIALS_KEY,
  url: api.getApiUrl('/content_credentials'),
  params: { organization_id: orgId(), ...params },
});

export const getContentCredentialDetails = (id, extraParams = {}) => get({
  type: API_OPERATIONS.GET,
  key: contentCredentialDetailsKey(id),
  params: { organization_id: orgId(), include_permissions: true, ...extraParams },
  url: api.getApiUrl(`/content_credentials/${id}`),
});

export const updateContentCredential = (id, params) => put({
  type: API_OPERATIONS.PUT,
  key: contentCredentialDetailsKey(id),
  url: api.getApiUrl(`/content_credentials/${id}`),
  params: { include_permissions: true, ...params },
  successToast: () => __('Content credential updated'),
  errorToast: error => getResponseErrorMsgs(error.response),
  updateData: (_prevState, respState) => respState,
  actionTypes: {
    REQUEST: UPDATE_CONTENT_CREDENTIAL,
    SUCCESS: UPDATE_CONTENT_CREDENTIAL_SUCCESS,
    FAILURE: UPDATE_CONTENT_CREDENTIAL_FAILURE,
  },
});

export const deleteContentCredential = (id, handleSuccess) => APIActions.delete({
  type: API_OPERATIONS.DELETE,
  key: DELETE_CONTENT_CREDENTIAL_KEY,
  url: api.getApiUrl(`/content_credentials/${id}`),
  handleSuccess,
  successToast: () => __('Content credential deleted'),
  errorToast: error => getResponseErrorMsgs(error.response),
});

export default getContentCredentials;
