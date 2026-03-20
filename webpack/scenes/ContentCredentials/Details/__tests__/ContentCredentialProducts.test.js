import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ContentCredentialProducts from '../ContentCredentialProducts';

const mockDetailsWithProducts = {
  gpg_key_products: [
    {
      id: 1,
      name: 'RHEL 8',
      repository_count: 5,
    },
    {
      id: 2,
      name: 'RHEL 9',
      repository_count: 3,
    },
  ],
  ssl_ca_products: [
    {
      id: 3,
      name: 'Custom Product',
      repository_count: 2,
    },
  ],
  ssl_client_products: [],
  ssl_key_products: [],
};

const mockDetailsEmpty = {
  gpg_key_products: [],
  ssl_ca_products: [],
  ssl_client_products: [],
  ssl_key_products: [],
};

test('Can render products table with data', () => {
  const { getByText } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  expect(getByText('RHEL 8')).toBeInTheDocument();
  expect(getByText('RHEL 9')).toBeInTheDocument();
  expect(getByText('Custom Product')).toBeInTheDocument();
  expect(getByText('GPG Key')).toBeInTheDocument();
  expect(getByText('SSL CA Cert')).toBeInTheDocument();
});

test('Can display table headers correctly', () => {
  const { getByText } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  expect(getByText('Name')).toBeInTheDocument();
  expect(getByText('Used as')).toBeInTheDocument();
  expect(getByText('Repositories')).toBeInTheDocument();
});

test('Can display repository counts', () => {
  const { getByText } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  expect(getByText('5')).toBeInTheDocument(); // RHEL 8
  expect(getByText('3')).toBeInTheDocument(); // RHEL 9
  expect(getByText('2')).toBeInTheDocument(); // Custom Product
});

test('Can filter products by name', () => {
  const { getByPlaceholderText, getByText, queryByText } = render(
    <ContentCredentialProducts details={mockDetailsWithProducts} />,
  );

  const filterInput = getByPlaceholderText('Filter...');
  expect(filterInput).toBeInTheDocument();

  // Initially all products should be visible
  expect(getByText('RHEL 8')).toBeInTheDocument();
  expect(getByText('RHEL 9')).toBeInTheDocument();
  expect(getByText('Custom Product')).toBeInTheDocument();

  // Filter for RHEL products
  fireEvent.change(filterInput, { target: { value: 'RHEL' } });

  expect(getByText('RHEL 8')).toBeInTheDocument();
  expect(getByText('RHEL 9')).toBeInTheDocument();
  expect(queryByText('Custom Product')).not.toBeInTheDocument();
});

test('Can filter products case-insensitively', () => {
  const { getByPlaceholderText, getByText, queryByText } = render(
    <ContentCredentialProducts details={mockDetailsWithProducts} />,
  );

  const filterInput = getByPlaceholderText('Filter...');

  // Filter with lowercase
  fireEvent.change(filterInput, { target: { value: 'rhel' } });

  expect(getByText('RHEL 8')).toBeInTheDocument();
  expect(getByText('RHEL 9')).toBeInTheDocument();
  expect(queryByText('Custom Product')).not.toBeInTheDocument();
});

test('Can show empty state when no products exist', () => {
  const { getByText, queryByRole } = render(<ContentCredentialProducts details={mockDetailsEmpty} />);

  expect(getByText(/don't have any Products associated/)).toBeInTheDocument();
  expect(queryByRole('table')).not.toBeInTheDocument();
});

test('Can show empty state when filter matches no products', () => {
  const { getByPlaceholderText, queryByText } = render(
    <ContentCredentialProducts details={mockDetailsWithProducts} />,
  );

  const filterInput = getByPlaceholderText('Filter...');
  fireEvent.change(filterInput, { target: { value: 'NonexistentProduct' } });

  expect(queryByText('RHEL 8')).not.toBeInTheDocument();
  expect(queryByText('RHEL 9')).not.toBeInTheDocument();
  expect(queryByText('Custom Product')).not.toBeInTheDocument();
});

test('Can render product links correctly', () => {
  const { container } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  const productLinks = container.querySelectorAll('a[href^="/products/"]');
  expect(productLinks.length).toBeGreaterThan(0);

  // Check first product link
  expect(productLinks[0]).toHaveAttribute('href', '/products/1');
  expect(productLinks[0]).toHaveTextContent('RHEL 8');
});

test('Can render repository count links correctly', () => {
  const { container } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  const repoLinks = container.querySelectorAll('a[href*="#/repositories"]');
  expect(repoLinks.length).toBeGreaterThan(0);

  // Check first repo link
  expect(repoLinks[0]).toHaveAttribute('href', '/products/1#/repositories');
});

test('Can handle multiple product types correctly', () => {
  const multiTypeDetails = {
    gpg_key_products: [
      { id: 1, name: 'GPG Product', repository_count: 1 },
    ],
    ssl_ca_products: [
      { id: 2, name: 'CA Cert Product', repository_count: 2 },
    ],
    ssl_client_products: [
      { id: 3, name: 'Client Cert Product', repository_count: 3 },
    ],
    ssl_key_products: [
      { id: 4, name: 'Key Product', repository_count: 4 },
    ],
  };

  const { getByText } = render(<ContentCredentialProducts details={multiTypeDetails} />);

  expect(getByText('GPG Product')).toBeInTheDocument();
  expect(getByText('CA Cert Product')).toBeInTheDocument();
  expect(getByText('Client Cert Product')).toBeInTheDocument();
  expect(getByText('Key Product')).toBeInTheDocument();

  expect(getByText('GPG Key')).toBeInTheDocument();
  expect(getByText('SSL CA Cert')).toBeInTheDocument();
  expect(getByText('SSL Client Cert')).toBeInTheDocument();
  expect(getByText('SSL Client Key')).toBeInTheDocument();
});

test('Can clear filter and show all products', () => {
  const { getByPlaceholderText, getByText } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Apply filter
  fireEvent.change(filterInput, { target: { value: 'RHEL 8' } });
  expect(getByText('RHEL 8')).toBeInTheDocument();

  // Clear filter
  fireEvent.change(filterInput, { target: { value: '' } });

  // All products should be visible again
  expect(getByText('RHEL 8')).toBeInTheDocument();
  expect(getByText('RHEL 9')).toBeInTheDocument();
  expect(getByText('Custom Product')).toBeInTheDocument();
});

test('Can render table with correct OUIA IDs for accessibility', () => {
  const { container } = render(<ContentCredentialProducts details={mockDetailsWithProducts} />);

  expect(container.querySelector('[ouiaId="cc-products-toolbar"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-products-filter"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-products-table"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-products-table-header"]')).toBeInTheDocument();
});

test('Can handle products with missing or null names', () => {
  const detailsWithNullNames = {
    gpg_key_products: [
      { id: 1, name: null, repository_count: 1 },
      { id: 2, name: undefined, repository_count: 2 },
      { id: 3, name: 'Valid Product', repository_count: 3 },
    ],
    ssl_ca_products: [],
    ssl_client_products: [],
    ssl_key_products: [],
  };

  const { getByText } = render(<ContentCredentialProducts details={detailsWithNullNames} />);

  // Should still render the valid product
  expect(getByText('Valid Product')).toBeInTheDocument();
});
