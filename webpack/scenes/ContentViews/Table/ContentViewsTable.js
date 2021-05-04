import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { translate as __ } from 'foremanReact/common/I18n';
import { STATUS } from 'foremanReact/constants';
import { Button } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import TableWrapper from '../../../components/Table/TableWrapper';
import tableDataGenerator from './tableDataGenerator';
import getContentViews from '../ContentViewsActions';
import CreateContentViewModal from '../Create/CreateContentViewModal';
import CopyContentViewModal from '../Copy/CopyContentViewModal';
import PublishContentViewWizard from '../Publish/PublishContentViewWizard';
import { selectContentViews, selectContentViewStatus, selectContentViewError } from '../ContentViewSelectors';

const ContentViewTable = () => {
  const response = useSelector(selectContentViews);
  const status = useSelector(selectContentViewStatus);
  const error = useSelector(selectContentViewError);
  const [table, setTable] = useState({ rows: [], columns: [] });
  const [rowMappingIds, setRowMappingIds] = useState([]);
  const [searchQuery, updateSearchQuery] = useState('');
  const loadingResponse = status === STATUS.PENDING;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copy, setCopy] = useState(false);
  const [results, setResults] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [actionableCvId, setActionableCvId] = useState('');
  const [actionableCvName, setActionableCvName] = useState('');
  const [actionableCvComposite, setActionableCvComposite] = useState(false);
  function openForm() {
    setIsModalOpen(true);
  }

  useEffect(
    () => {
      const { results, ...metadata } = response;
      if (!loadingResponse && results) {
        setResults(results);
        setMetadata(metadata);
        const { newRowMappingIds, ...tableData } = tableDataGenerator(results);
        setTable(tableData);
        setRowMappingIds(newRowMappingIds);
      }
    },
    [JSON.stringify(response), loadingResponse, setTable, setRowMappingIds],
  );

  const onSelect = (_event, isSelected, rowId) => {
    let rows;
    if (rowId === -1) {
      rows = table.rows.map(row => ({ ...row, selected: isSelected }));
    } else {
      rows = [...table.rows];
      rows[rowId].selected = isSelected;
    }

    setTable(prevTable => ({ ...prevTable, rows }));
  };

  const onCollapse = (event, rowId, isOpen) => {
    let rows;
    if (rowId === -1) {
      rows = table.rows.map(row => ({ ...row, isOpen }));
    } else {
      rows = [...table.rows];
      rows[rowId].isOpen = isOpen;
    }

    setTable(prevTable => ({ ...prevTable, rows }));
  };

  const actionResolver = (rowData, { _rowIndex }) => {
    // don't show actions for the expanded parts
    if (rowData.parent !== undefined || rowData.compoundParent || rowData.noactions) return null;

    // printing to the console for now until these are hooked up
    /* eslint-disable no-console */
    return [
      {
        title: 'Publish and Promote',
        onClick: (_event, rowId, rowInfo) => {
          setIsPublishModalOpen(true);
          setActionableCvId(rowInfo.cvId.toString());
          setActionableCvName(rowInfo.cvName);
          setActionableCvComposite(rowInfo.cvComposite);
        },
      },
      {
        title: 'Promote',
        isDisabled: true,
        onClick: (_event, rowId, rowInfo) => console.log(`clicked on row ${rowInfo.cvName}`),
      },
      {
        title: 'Copy',
        onClick: (_event, rowId, rowInfo) => {
          setCopy(true);
          setActionableCvId(rowInfo.cvId.toString());
          setActionableCvName(rowInfo.cvName);
        },
      },
      {
        title: 'Delete',
        isDisabled: true,
        onClick: (_event, rowId, _rowInfo) => console.log(`clicked on row ${rowId}`),
      },
    ];
    /* eslint-enable no-console */
  };
  // Prevents flash of "No Content" before rows are loaded
  const tableStatus = () => {
    if (typeof results === 'undefined') return status; // will handle errored state
    const resultsIds = Array.from(results.map(result => result.id));
    // All results are accounted for in row mapping, the page is ready to load
    if (resultsIds.length === rowMappingIds.length &&
        resultsIds.every(id => rowMappingIds.includes(id))) {
      return status;
    }
    return STATUS.PENDING; // Fallback to pending
  };

  const additionalListeners = new Array(isPublishModalOpen);
  const emptyContentTitle = __("You currently don't have any Content Views.");
  const emptyContentBody = __('A content view can be added by using the "New content view" button below.');
  const emptySearchTitle = __('No matching content views found');
  const emptySearchBody = __('Try changing your search settings.');

  const { rows, columns } = table;
  return (
    <TableWrapper
      {...{
        rows,
        error,
        metadata,
        emptyContentTitle,
        emptyContentBody,
        emptySearchTitle,
        emptySearchBody,
        onSelect,
        actionResolver,
        searchQuery,
        updateSearchQuery,
        additionalListeners,
      }}
      variant={TableVariant.compact}
      status={tableStatus()}
      fetchItems={getContentViews}
      onCollapse={onCollapse}
      canSelectAll={false}
      cells={columns}
      autocompleteEndpoint="/content_views/auto_complete_search"
    >
      <React.Fragment>
        <Button onClick={openForm} variant="primary" aria-label="create_content_view">
          Create content view
        </Button>
        <CreateContentViewModal show={isModalOpen} setIsOpen={setIsModalOpen} aria-label="create_content_view_modal" />
      </React.Fragment>
      <React.Fragment>
        <CopyContentViewModal cvId={actionableCvId} cvName={actionableCvName} show={copy} setIsOpen={setCopy} aria-label="copy_content_view_modal" />
      </React.Fragment>
      <React.Fragment>
        <PublishContentViewWizard
          details={{ id: actionableCvId, name: actionableCvName, composite: actionableCvComposite }}
          show={isPublishModalOpen}
          setIsOpen={setIsPublishModalOpen}
          aria-label="publish_content_view_modal"
        />
      </React.Fragment>
    </TableWrapper>
  );
};

export default ContentViewTable;
