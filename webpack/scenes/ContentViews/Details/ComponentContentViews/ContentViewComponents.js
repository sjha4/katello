import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Bullseye,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TableVariant, fitContent, TableText } from '@patternfly/react-table';
import { STATUS } from 'foremanReact/constants';
import { translate as __ } from 'foremanReact/common/I18n';
import { urlBuilder } from 'foremanReact/common/urlHelpers';
import PropTypes from 'prop-types';

import TableWrapper from '../../../../components/Table/TableWrapper';
import onSelect from '../../../../components/Table/helpers';
import {
  selectCVComponents,
  selectCVComponentsStatus,
  selectCVComponentsError,
} from '../ContentViewDetailSelectors';
import { getContentViewComponents } from '../ContentViewDetailActions';
import AddedStatusLabel from '../../../../components/AddedStatusLabel';
import ComponentVersion from './ComponentVersion';
import ComponentEnvironments from './ComponentEnvironments';
import ContentViewIcon from '../../components/ContentViewIcon';

const ContentViewComponents = ({ cvId, details }) => {
  const response = useSelector(state => selectCVComponents(state, cvId));
  const status = useSelector(state => selectCVComponentsStatus(state, cvId));
  const error = useSelector(state => selectCVComponentsError(state, cvId));

  const [rows, setRows] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [searchQuery, updateSearchQuery] = useState('');
  const columnHeaders = [
    { title: __('Type'), transforms: [fitContent] },
    { title: __('Name') },
    { title: __('Version') },
    { title: __('Environments') },
    { title: __('Repositories') },
    { title: __('Status') },
    { title: __('Description') },
  ];
  const loading = status === STATUS.PENDING;
  const { label } = details || {};

  const buildRows = (results) => {
    const newRows = [];
    results.forEach((componentCV) => {
      const { added_to_content_view: addedToCV, id, name, description, cv_versions: cvVersions } = componentCV;
      const { content_view_version: cvVersion} = cvVersions || {};
      const { environments, repositories } = cvVersion || {};

      const cells = [
        { title: <Bullseye><ContentViewIcon composite={false} /></Bullseye> },
        { title: <Link to={urlBuilder('labs/content_views', '', id)}>{name}</Link> },
        { title: cvVersions ? <ComponentVersion componentCV={cvVersions} /> : 'N/A' },
        { title: environments ? <ComponentEnvironments {...{ environments }} /> : 'N/A' },
        { title: <Link to={urlBuilder(`labs/content_views/${id}#repositories`, '')}>{ repositories ? repositories.length : 0 }</Link> },
        {
          title: <AddedStatusLabel added={addedToCV} />,
        },
        { title: <TableText wrapModifier="truncate">{description || 'No description'}</TableText> },
      ];
      newRows.push({ componentCvId: id, cells });
    });
    return newRows;
  };

  const actionResolver = (rowData, { _rowIndex }) => {
    return [
      {
        title: 'Add',
        onClick: (_event, rowId, rowInfo) => {
          console.log(rowInfo.componentCvId, cvId);
        },
      },
      {
        title: 'Remove',
        onClick: (_event, rowId, rowInfo) => {
          console.log(rowInfo.componentCvId, cvId);
        },
      },
    ];
  };


  const emptyContentTitle = __(`No content views belong to ${label}`);
  const emptyContentBody = __('Please add some content views.');
  const emptySearchTitle = __('No matching content views found');
  const emptySearchBody = __('Try changing your search settings.');

  useEffect(() => {
    const { results, ...meta } = response;
    setMetadata(meta);

    if (!loading && results) {
      const newRows = buildRows(results);
      setRows(newRows);
    }
  }, [JSON.stringify(response)]);

  return (
    <TableWrapper
      {...{
        rows,
        metadata,
        emptyContentTitle,
        emptyContentBody,
        emptySearchTitle,
        emptySearchBody,
        searchQuery,
        updateSearchQuery,
        actionResolver,
        error,
        status,
      }}
      onSelect={onSelect(rows, setRows)}
      cells={columnHeaders}
      variant={TableVariant.compact}
      autocompleteEndpoint="/content_views/auto_complete_search"
      fetchItems={params => getContentViewComponents(cvId, params)}
    />
  );
};

ContentViewComponents.propTypes = {
  cvId: PropTypes.number.isRequired,
  details: PropTypes.shape({
    label: PropTypes.string,
  }),
};

ContentViewComponents.defaultProps = {
  details: {
    label: '',
  },
};

export default ContentViewComponents;
