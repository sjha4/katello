import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { translate as __ } from 'foremanReact/common/I18n';
import { Link } from 'react-router-dom';
import {
  Button,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { TableVariant, Thead, Tbody, Th, Tr, Td } from '@patternfly/react-table';
import { useTableSort } from 'foremanReact/components/PF4/Helpers/useTableSort';
import TableWrapper from '../../../components/Table/TableWrapper';
import {
  getSyncPlanProducts,
  getAvailableProducts,
  addProductsToSyncPlan,
  removeProductsFromSyncPlan,
  getSyncPlanDetails,
} from '../SyncPlansActions';
import { selectSyncPlanDetails } from '../SyncPlansSelectors';
import { urlBuilder } from 'foremanReact/common/urlHelpers';

const SyncPlanProducts = ({ mode }) => {
  const { id: syncPlanId } = useParams();
  const dispatch = useDispatch();
  const [searchQuery, updateSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [activeTabKey, setActiveTabKey] = useState(mode === 'add' ? 1 : 0);

  const syncPlanData = useSelector(state => selectSyncPlanDetails(state, syncPlanId));
  const { results: syncPlan = {} } = syncPlanData;

  const productsKey = activeTabKey === 0 ? `SYNC_PLAN_PRODUCTS_${syncPlanId}` : `SYNC_PLAN_PRODUCTS_available_${syncPlanId}`;
  const productsData = useSelector(state => state.katello?.syncPlans?.[productsKey] || {});
  const { results = [], ...metadata } = productsData;
  const status = productsData.status;

  const columnHeaders = [
    __('Name'),
    __('Description'),
    __('Sync status'),
    __('Repositories'),
  ];

  const COLUMNS_TO_SORT_PARAMS = {
    [columnHeaders[0]]: 'name',
  };

  const {
    pfSortParams,
    apiSortParams,
    activeSortColumn,
    activeSortDirection,
  } = useTableSort({
    allColumns: columnHeaders,
    columnsToSortParams: COLUMNS_TO_SORT_PARAMS,
    initialSortColumnName: __('Name'),
  });

  const fetchItems = useCallback(
    (params) => {
      if (activeTabKey === 0) {
        return getSyncPlanProducts(syncPlanId, {
          ...apiSortParams,
          ...params,
        });
      }
      return getAvailableProducts(syncPlanId, {
        ...apiSortParams,
        ...params,
      });
    },
    [syncPlanId, activeTabKey, apiSortParams],
  );

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch, fetchItems, activeTabKey]);

  const handleRemoveProducts = () => {
    const productIds = Array.from(selectedProducts);
    dispatch(removeProductsFromSyncPlan(syncPlanId, productIds, () => {
      setSelectedProducts(new Set());
      dispatch(getSyncPlanProducts(syncPlanId, apiSortParams));
      dispatch(getSyncPlanDetails(syncPlanId));
    }));
  };

  const handleAddProducts = () => {
    const productIds = Array.from(selectedProducts);
    dispatch(addProductsToSyncPlan(syncPlanId, productIds, () => {
      setSelectedProducts(new Set());
      dispatch(getAvailableProducts(syncPlanId, apiSortParams));
      dispatch(getSyncPlanDetails(syncPlanId));
    }));
  };

  const handleSelectProduct = (productId, isSelecting) => {
    const newSelected = new Set(selectedProducts);
    if (isSelecting) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAllProducts = (isSelecting) => {
    if (isSelecting) {
      setSelectedProducts(new Set(results.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const emptyContentTitle = activeTabKey === 0 ?
    __('No products assigned') :
    __('No products available');
  const emptyContentBody = activeTabKey === 0 ?
    __('No products have been added to this sync plan.') :
    __('No products are available to add to this sync plan.');

  const actionButtons = (
    <>
      {activeTabKey === 0 ? (
        <Button
          variant="secondary"
          onClick={handleRemoveProducts}
          isDisabled={selectedProducts.size === 0}
        >
          {__('Remove selected')}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={handleAddProducts}
          isDisabled={selectedProducts.size === 0}
        >
          {__('Add selected')}
        </Button>
      )}
    </>
  );

  return (
    <div>
      <Tabs
        activeKey={activeTabKey}
        onSelect={(event, tabIndex) => {
          setActiveTabKey(tabIndex);
          setSelectedProducts(new Set());
        }}
      >
        <Tab eventKey={0} title={<TabTitleText>{__('List / Remove')}</TabTitleText>} />
        <Tab eventKey={1} title={<TabTitleText>{__('Add')}</TabTitleText>} />
      </Tabs>

      <TableWrapper
        {...{
          metadata,
          emptyContentTitle,
          emptyContentBody,
          searchQuery,
          updateSearchQuery,
          fetchItems,
        }}
        ouiaId="sync-plan-products-table"
        variant={TableVariant.compact}
        autocompleteEndpoint="/katello/api/v2/products"
        bookmarkController="katello_products"
        status={status}
        additionalListeners={[activeSortColumn, activeSortDirection, activeTabKey]}
        actionButtons={actionButtons}
      >
        <Thead>
          <Tr ouiaId="sync-plan-products-header">
            <Th
              select={{
                onSelect: (_event, isSelecting) => handleSelectAllProducts(isSelecting),
                isSelected: selectedProducts.size === results.length && results.length > 0,
              }}
            />
            {columnHeaders.map(col => (
              <Th
                key={col}
                sort={COLUMNS_TO_SORT_PARAMS[col] ? pfSortParams(col) : undefined}
              >
                {col}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {results?.map((product) => {
            const {
              id,
              name,
              description,
              sync_summary,
              repository_count: repoCount,
            } = product;
            const isSelected = selectedProducts.has(id);

            return (
              <Tr key={id} ouiaId={`product-row-${id}`}>
                <Td
                  select={{
                    rowIndex: id,
                    onSelect: (_event, isSelecting) => handleSelectProduct(id, isSelecting),
                    isSelected,
                  }}
                />
                <Td>
                  <Link to={urlBuilder('products', '') + id}>
                    {name}
                  </Link>
                </Td>
                <Td>{description || ''}</Td>
                <Td>{sync_summary || ''}</Td>
                <Td>{repoCount || 0}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </TableWrapper>
    </div>
  );
};

SyncPlanProducts.propTypes = {
  mode: PropTypes.oneOf(['list', 'add']),
};

SyncPlanProducts.defaultProps = {
  mode: 'list',
};

export default SyncPlanProducts;