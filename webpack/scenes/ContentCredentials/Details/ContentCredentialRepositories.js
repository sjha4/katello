import React, { useState, useMemo } from 'react';
import {
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table';
import PropTypes from 'prop-types';
import { translate as __ } from 'foremanReact/common/I18n';

import { REPO_TYPE_MAP } from '../ContentCredentialConstants';

const parseRepositories = (details) => {
  const allRepos = [];
  Object.entries(REPO_TYPE_MAP).forEach(([key, usedAs]) => {
    (details[key] || []).forEach((repo) => {
      allRepos.push({ ...repo, usedAs });
    });
  });
  return allRepos;
};

const ContentCredentialRepositories = ({ details }) => {
  const [filterValue, setFilterValue] = useState('');
  const allRepos = useMemo(() => parseRepositories(details), [details]);

  const filteredRepos = allRepos.filter(repo =>
    repo.name?.toLowerCase().includes(filterValue.toLowerCase()));

  return (
    <div className="margin-0-24">
      <Toolbar ouiaId="cc-repos-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <TextInput
              type="text"
              ouiaId="cc-repos-filter"
              aria-label={__('Filter repositories')}
              placeholder={__('Filter...')}
              value={filterValue}
              onChange={(_event, value) => setFilterValue(value)}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredRepos.length === 0 ? (
        <p>{__('You currently don\'t have any Repositories associated with this Content Credential.')}</p>
      ) : (
        <Table
          ouiaId="cc-repos-table"
          aria-label={__('Repositories table')}
          variant="compact"
        >
          <Thead>
            <Tr ouiaId="cc-repos-table-header">
              <Th>{__('Name')}</Th>
              <Th>{__('Product')}</Th>
              <Th>{__('Type')}</Th>
              <Th>{__('Used as')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRepos.map((repo, index) => (
              <Tr key={`${repo.id}-${repo.usedAs}`} ouiaId={`cc-repos-table-row-${index}`}>
                <Td>
                  <a href={`/products/${repo.product?.id}/repositories/${repo.library_instance_id}`}>
                    {repo.name}
                  </a>
                </Td>
                <Td>
                  <a href={`/products/${repo.product?.id}#/repositories`}>
                    {repo.product?.name}
                  </a>
                </Td>
                <Td>{repo.content_type}</Td>
                <Td>{repo.usedAs}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

ContentCredentialRepositories.propTypes = {
  details: PropTypes.shape({}).isRequired,
};

export default ContentCredentialRepositories;
