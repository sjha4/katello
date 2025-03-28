import React, { useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  DropdownItem,
  DropdownSeparator,
} from '@patternfly/react-core/deprecated';
import { CubeIcon, UndoIcon, RedoIcon } from '@patternfly/react-icons';

import { translate as __ } from 'foremanReact/common/I18n';
import { HOST_DETAILS_KEY } from 'foremanReact/components/HostDetails/consts';
import { ForemanActionsBarContext } from 'foremanReact/components/HostDetails/ActionsBar';
import { foremanUrl } from 'foremanReact/common/helpers';

import { selectHostDetails } from '../HostDetailsSelectors';
import { useRexJobPolling } from '../Tabs/RemoteExecutionHooks';
import { runSubmanRepos } from '../Cards/ContentViewDetailsCard/HostContentViewActions';
import { hasRequiredPermissions as can, userPermissionsFromHostDetails } from '../hostDetailsHelpers';

const HostActionsBar = () => {
  const hostDetails = useSelector(selectHostDetails);
  const dispatch = useDispatch();
  const hostname = hostDetails?.name;
  const { onKebabToggle } = useContext(ForemanActionsBarContext);

  const recalculateApplicability = ['edit_hosts', 'create_job_invocations'];
  const showRecalculate =
    can(recalculateApplicability, userPermissionsFromHostDetails({ hostDetails }));
  const changeContentSource = ['view_smart_proxies', 'view_capsule_content'];
  const showChangeContentSource =
    can(changeContentSource, userPermissionsFromHostDetails({ hostDetails }));

  const refreshHostDetails = () => dispatch({
    type: 'API_GET',
    payload: {
      key: HOST_DETAILS_KEY,
      url: `/api/hosts/${hostname}`,
    },
  });

  const {
    triggerJobStart: triggerRecalculate,
  } = useRexJobPolling(() => runSubmanRepos(hostname, refreshHostDetails));

  const handleRefreshApplicabilityClick = () => {
    triggerRecalculate();
    onKebabToggle();
  };

  return (
    <>
      <DropdownItem
        ouiaId="katello-legacy-contenthost-ui"
        key="katello-legacy-contenthost-ui"
        href={foremanUrl(`/content_hosts/${hostDetails?.id}`)}
        icon={<UndoIcon />}
      >
        {__('Legacy content host UI')}
      </DropdownItem>
      <DropdownSeparator key="separator" ouiaId="katello-separator" />
      {showRecalculate && (
        <DropdownItem
          ouiaId="katello-refresh-applicability"
          key="katello-refresh-applicability"
          onClick={handleRefreshApplicabilityClick}
          icon={<RedoIcon />}
        >
          {__('Refresh applicability')}
        </DropdownItem>
      )
      }
      {showChangeContentSource && (
        <DropdownItem
          ouiaId="katello-change-host-content-source"
          key="katello-change-host-content-source"
          href={foremanUrl(`/change_host_content_source?host_id=${hostDetails?.id}&initialContentSourceId=${hostDetails?.content_facet_attributes?.content_source_id}`)}
          icon={<CubeIcon />}
        >
          {__('Change content source')}
        </DropdownItem>
      )
      }
    </>
  );
};

export default HostActionsBar;
