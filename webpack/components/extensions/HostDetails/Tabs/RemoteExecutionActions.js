import { API_OPERATIONS, post } from 'foremanReact/redux/API';
import { REX_JOB_INVOCATIONS_KEY, REX_FEATURES } from './RemoteExecutionConstants';
import { foremanApi } from '../../../../services/api';
import { getResponseErrorMsgs } from '../../../../utils/helpers';
import { renderTaskStartedToast } from '../../../../scenes/Tasks/helpers';

const errorToast = (error) => {
  const message = getResponseErrorMsgs(error.response);
  return message;
};

const katelloPackageInstallParams = ({ hostname, packageName }) => ({
  job_invocation: {
    feature: REX_FEATURES.KATELLO_PACKAGE_INSTALL,
    inputs: {
      package: packageName,
    },
    search_query: `name ^ (${hostname})`,
  },
});

const installPackage = ({ hostname, packageName }) => post({
  type: API_OPERATIONS.POST,
  key: REX_JOB_INVOCATIONS_KEY,
  url: foremanApi.getApiUrl('/job_invocations'),
  params: katelloPackageInstallParams({ hostname, packageName }),
  handleSuccess: response => renderTaskStartedToast({
    humanized: { action: `Install ${packageName} on ${hostname}` },
    id: response?.data?.dynflow_task?.id,
  }),
  errorToast: error => errorToast(error),
});

export default installPackage;