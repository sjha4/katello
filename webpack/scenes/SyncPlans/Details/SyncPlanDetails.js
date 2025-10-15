import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import { translate as __ } from 'foremanReact/common/I18n';
import { urlBuilder } from 'foremanReact/common/urlHelpers';
import { getSyncPlanDetails, deleteSyncPlan, runSyncPlan } from '../SyncPlansActions';
import { selectSyncPlanDetails } from '../SyncPlansSelectors';
import SyncPlanDetailsInfo from './SyncPlanDetailsInfo';
import SyncPlanProducts from './SyncPlanProducts';

const SyncPlanDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const history = useHistory();
  const syncPlanData = useSelector(state => selectSyncPlanDetails(state, id));
  const { results: syncPlan = {}, status } = syncPlanData;

  useEffect(() => {
    dispatch(getSyncPlanDetails(id));
  }, [dispatch, id]);

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(__(`Are you sure you want to delete sync plan "${syncPlan.name}"?`))) {
      dispatch(deleteSyncPlan(id, syncPlan.name, () => {
        history.push(urlBuilder('sync_plans', ''));
      }));
    }
  };

  const handleRunSync = () => {
    dispatch(runSyncPlan(id, () => {
      dispatch(getSyncPlanDetails(id));
    }));
  };

  const handleUpdate = () => {
    dispatch(getSyncPlanDetails(id));
  };

  return (
    <div>
      {/* This will be replaced with proper tabs component */}
      <SyncPlanDetailsInfo
        syncPlan={syncPlan}
        status={status}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRunSync={handleRunSync}
      />
    </div>
  );
};

SyncPlanDetails.propTypes = {
  // Props will be passed via react-router
};

export default SyncPlanDetails;