import React, { useState } from 'react';
import { translate as __ } from 'foremanReact/common/I18n';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Thead, Th, Tbody, Tr, Td } from '@patternfly/react-table';
import TableIndexPage from 'foremanReact/components/PF4/TableIndexPage/TableIndexPage';
import {
  useSetParamsAndApiAndSearch,
  useTableIndexAPIResponse,
} from 'foremanReact/components/PF4/TableIndexPage/Table/TableIndexHooks';
import { useTableSort } from 'foremanReact/components/PF4/Helpers/useTableSort';
import EmptyPage from 'foremanReact/routes/common/EmptyPage';
import Pagination from 'foremanReact/components/Pagination';
import { urlBuilder } from 'foremanReact/common/urlHelpers';
import { STATUS } from 'foremanReact/constants';
import { selectSyncPlans, selectSyncPlansError, selectSyncPlansStatus } from './SyncPlansSelectors';
import { getResponseErrorMsgs, truncate } from '../../utils/helpers';
import CreateSyncPlanModal from './Create/CreateSyncPlanModal';
import { runSyncPlan, deleteSyncPlan } from './SyncPlansActions';

const SyncPlansPage = () => {
  const response = useSelector(selectSyncPlans);
  const error = useSelector(selectSyncPlansError);
  const status = useSelector(selectSyncPlansStatus);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dispatch = useDispatch();

  const {
    results = [],
    subtotal,
    page,
    per_page: perPage,
    can_edit: canEdit = false,
    can_delete: canDelete = false,
  } = response || {};

  const canCreate = true; // All users can create sync plans
  const columnHeaders = [__('Name'), __('Interval'), __('Next Sync'), __('Products')];
  const COLUMNS_TO_SORT_PARAMS = {
    [columnHeaders[0]]: 'name',
    [columnHeaders[1]]: 'interval',
    [columnHeaders[2]]: 'next_sync',
  };

  const apiOptions = {
    key: 'SYNC_PLANS',
  };

  const defaultParams = {
    page: page || 1,
    per_page: perPage || 20,
  };

  const apiUrl = '/katello/api/v2/sync_plans';

  const apiResponse = useTableIndexAPIResponse({
    apiUrl,
    apiOptions,
    defaultParams,
  });

  const {
    setParamsAndAPI,
    params,
  } = useSetParamsAndApiAndSearch({
    defaultParams,
    apiOptions,
    setAPIOptions: apiResponse.setAPIOptions,
  });

  const onSort = (_event, index, direction) => {
    const sortBy = Object.values(COLUMNS_TO_SORT_PARAMS)[index];
    setParamsAndAPI({
      ...params,
      order: `${sortBy} ${direction}`,
    });
  };

  const onPaginationChange = (newPagination) => {
    setParamsAndAPI({
      ...params,
      ...newPagination,
    });
  };

  const { pfSortParams } = useTableSort({
    allColumns: columnHeaders,
    columnsToSortParams: COLUMNS_TO_SORT_PARAMS,
    onSort,
  });

  const openCreateModal = () => setIsCreateModalOpen(true);

  const formatNextSync = (syncPlan) => {
    if (!syncPlan.next_sync) return __('N/A');
    const date = new Date(syncPlan.next_sync);
    return date.toLocaleString();
  };

  const actionsWithPermissions = syncPlan => [
    {
      title: __('Run Sync'),
      isDisabled: !canEdit,
      onClick: () => { dispatch(runSyncPlan(syncPlan.id)); },
    },
    {
      title: __('Delete'),
      isDisabled: !canDelete,
      onClick: () => {
        if (window.confirm(__(`Are you sure you want to delete sync plan "${syncPlan.name}"?`))) {
          dispatch(deleteSyncPlan(syncPlan.id));
        }
      },
    },
  ];

  return (
    <TableIndexPage
      apiUrl={apiUrl}
      apiOptions={apiOptions}
      header={__('Sync Plans')}
      creatable={canCreate}
      customCreateAction={() => openCreateModal}
      controller="/katello/api/v2/sync_plans"
    >
      <>
        {results.length === 0 && !error && status === STATUS.PENDING && (
          <EmptyPage
            message={{
              type: 'loading',
              text: __('Loading...'),
            }}
          />
        )}
        {results.length === 0 && !error && status === STATUS.RESOLVED && (
          <EmptyPage message={{ type: 'empty' }} />
        )}
        {error && (
          <EmptyPage message={{ type: 'error', text: getResponseErrorMsgs(error?.response) }} />
        )}
        {results.length > 0 && (
          <Table variant="compact" ouiaId="sync-plans-table" isStriped>
            <Thead>
              <Tr ouiaId="syncPlansTableHeaderRow">
                {columnHeaders.map(col => (
                  <Th key={col} sort={pfSortParams(col)}>
                    {col}
                  </Th>
                ))}
                <Th key="action-menu" aria-label="action menu table header" />
              </Tr>
            </Thead>
            <Tbody>
              {results.map((syncPlan) => {
                const {
                  id, name, interval, products_count: productsCount = 0,
                } = syncPlan;
                return (
                  <Tr key={id} ouiaId={`sync-plan-row-${id}`}>
                    <Td><a href={`${urlBuilder('sync_plans', '')}${id}`}>{truncate(name)}</a></Td>
                    <Td>{interval || 'N/A'}</Td>
                    <Td>{formatNextSync(syncPlan)}</Td>
                    <Td>{productsCount}</Td>
                    <Td actions={{ items: actionsWithPermissions(syncPlan) }} />
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
        {results.length > 0 && (
          <Pagination
            key="table-bottom-pagination"
            page={page}
            perPage={perPage}
            itemCount={subtotal}
            onChange={onPaginationChange}
            updateParamsByUrl
          />
        )}
        <CreateSyncPlanModal
          show={isCreateModalOpen}
          setIsOpen={setIsCreateModalOpen}
        />
      </>
    </TableIndexPage>
  );
};

export default SyncPlansPage;