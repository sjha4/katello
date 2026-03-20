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

import { ACS_TYPE_MAP } from '../ContentCredentialConstants';

const parseACS = (details) => {
  const allAcs = [];
  Object.entries(ACS_TYPE_MAP).forEach(([key, usedAs]) => {
    (details[key] || []).forEach((acs) => {
      allAcs.push({ ...acs, usedAs });
    });
  });
  return allAcs;
};

const ContentCredentialACS = ({ details }) => {
  const [filterValue, setFilterValue] = useState('');
  const allAcs = useMemo(() => parseACS(details), [details]);

  const filteredAcs = allAcs.filter(acs =>
    acs.name?.toLowerCase().includes(filterValue.toLowerCase()));

  return (
    <div className="margin-0-24">
      <Toolbar ouiaId="cc-acs-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <TextInput
              type="text"
              ouiaId="cc-acs-filter"
              aria-label={__('Filter alternate content sources')}
              placeholder={__('Filter...')}
              value={filterValue}
              onChange={(_event, value) => setFilterValue(value)}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredAcs.length === 0 ? (
        <p>{__('You currently don\'t have any Alternate Content Sources associated with this Content Credential.')}</p>
      ) : (
        <Table
          ouiaId="cc-acs-table"
          aria-label={__('Alternate content sources table')}
          variant="compact"
        >
          <Thead>
            <Tr ouiaId="cc-acs-table-header">
              <Th>{__('Name')}</Th>
              <Th>{__('Used as')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredAcs.map((acs, index) => (
              <Tr key={`${acs.id}-${acs.usedAs}`} ouiaId={`cc-acs-table-row-${index}`}>
                <Td>
                  <a href={`/alternate_content_sources/${acs.id}/details`}>
                    {acs.name}
                  </a>
                </Td>
                <Td>{acs.usedAs}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

ContentCredentialACS.propTypes = {
  details: PropTypes.shape({}).isRequired,
};

export default ContentCredentialACS;
