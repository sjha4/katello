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

import { PRODUCT_TYPE_MAP } from '../ContentCredentialConstants';

const parseProducts = (details) => {
  const allProducts = [];
  Object.entries(PRODUCT_TYPE_MAP).forEach(([key, usedAs]) => {
    (details[key] || []).forEach((product) => {
      allProducts.push({ ...product, usedAs });
    });
  });
  return allProducts;
};

const ContentCredentialProducts = ({ details }) => {
  const [filterValue, setFilterValue] = useState('');
  const allProducts = useMemo(() => parseProducts(details), [details]);

  const filteredProducts = allProducts.filter(product =>
    product.name?.toLowerCase().includes(filterValue.toLowerCase()));

  return (
    <div className="margin-0-24">
      <Toolbar ouiaId="cc-products-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <TextInput
              type="text"
              ouiaId="cc-products-filter"
              aria-label={__('Filter products')}
              placeholder={__('Filter...')}
              value={filterValue}
              onChange={(_event, value) => setFilterValue(value)}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredProducts.length === 0 ? (
        <p>{__('You currently don\'t have any Products associated with this Content Credential.')}</p>
      ) : (
        <Table
          ouiaId="cc-products-table"
          aria-label={__('Products table')}
          variant="compact"
        >
          <Thead>
            <Tr ouiaId="cc-products-table-header">
              <Th>{__('Name')}</Th>
              <Th>{__('Used as')}</Th>
              <Th>{__('Repositories')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredProducts.map((product, index) => (
              <Tr key={`${product.id}-${product.usedAs}`} ouiaId={`cc-products-table-row-${index}`}>
                <Td>
                  <a href={`/products/${product.id}`}>{product.name}</a>
                </Td>
                <Td>{product.usedAs}</Td>
                <Td>
                  <a href={`/products/${product.id}#/repositories`}>
                    {product.repository_count}
                  </a>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

ContentCredentialProducts.propTypes = {
  details: PropTypes.shape({}).isRequired,
};

export default ContentCredentialProducts;
