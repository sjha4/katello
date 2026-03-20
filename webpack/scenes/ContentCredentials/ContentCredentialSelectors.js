import {
  selectAPIStatus,
  selectAPIResponse,
  selectAPIError,
} from 'foremanReact/redux/API/APISelectors';
import { STATUS } from 'foremanReact/constants';

import {
  GET_CONTENT_CREDENTIALS_KEY,
  contentCredentialDetailsKey,
} from './ContentCredentialConstants';

export const selectContentCredentials = (state) => {
  const response = selectAPIResponse(state, GET_CONTENT_CREDENTIALS_KEY);
  return response.results;
};

export const selectContentCredentialsStatus = state =>
  selectAPIStatus(state, GET_CONTENT_CREDENTIALS_KEY) || STATUS.PENDING;

export const selectContentCredentialDetails = (state, id) =>
  selectAPIResponse(state, contentCredentialDetailsKey(id)) || {};

export const selectContentCredentialDetailsStatus = (state, id) =>
  selectAPIStatus(state, contentCredentialDetailsKey(id)) || STATUS.PENDING;

export const selectContentCredentialDetailsError = (state, id) =>
  selectAPIError(state, contentCredentialDetailsKey(id));
