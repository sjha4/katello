import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ContentCredentialRepositories from '../ContentCredentialRepositories';

const mockDetailsWithRepos = {
  gpg_key_repos: [
    {
      id: 1,
      name: 'RHEL 8 BaseOS',
      library_instance_id: 101,
      content_type: 'yum',
      product: {
        id: 10,
        name: 'RHEL 8',
      },
    },
    {
      id: 2,
      name: 'RHEL 8 AppStream',
      library_instance_id: 102,
      content_type: 'yum',
      product: {
        id: 10,
        name: 'RHEL 8',
      },
    },
  ],
  ssl_ca_root_repos: [
    {
      id: 3,
      name: 'Custom Repo',
      library_instance_id: 103,
      content_type: 'docker',
      product: {
        id: 20,
        name: 'Custom Product',
      },
    },
  ],
  ssl_client_root_repos: [],
  ssl_key_root_repos: [],
};

const mockDetailsEmpty = {
  gpg_key_repos: [],
  ssl_ca_root_repos: [],
  ssl_client_root_repos: [],
  ssl_key_root_repos: [],
};

test('Can render repositories table with data', () => {
  const { getByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  expect(getByText('RHEL 8 BaseOS')).toBeInTheDocument();
  expect(getByText('RHEL 8 AppStream')).toBeInTheDocument();
  expect(getByText('Custom Repo')).toBeInTheDocument();
});

test('Can display table headers correctly', () => {
  const { getByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  expect(getByText('Name')).toBeInTheDocument();
  expect(getByText('Product')).toBeInTheDocument();
  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('Used as')).toBeInTheDocument();
});

test('Can display product names', () => {
  const { getAllByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const rhel8Products = getAllByText('RHEL 8');
  expect(rhel8Products.length).toBeGreaterThan(0);
  expect(getAllByText('Custom Product')[0]).toBeInTheDocument();
});

test('Can display content types', () => {
  const { getAllByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const yumTypes = getAllByText('yum');
  expect(yumTypes).toHaveLength(2); // Two yum repos
  expect(getAllByText('docker')[0]).toBeInTheDocument();
});

test('Can display "Used as" column correctly', () => {
  const { getAllByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const gpgKeys = getAllByText('GPG Key');
  expect(gpgKeys).toHaveLength(2); // Two repos using GPG key
  expect(getAllByText('SSL CA Cert')[0]).toBeInTheDocument();
});

test('Can filter repositories by name', () => {
  const { getByPlaceholderText, getByText, queryByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Initially all repos should be visible
  expect(getByText('RHEL 8 BaseOS')).toBeInTheDocument();
  expect(getByText('RHEL 8 AppStream')).toBeInTheDocument();
  expect(getByText('Custom Repo')).toBeInTheDocument();

  // Filter for BaseOS
  fireEvent.change(filterInput, { target: { value: 'BaseOS' } });

  expect(getByText('RHEL 8 BaseOS')).toBeInTheDocument();
  expect(queryByText('RHEL 8 AppStream')).not.toBeInTheDocument();
  expect(queryByText('Custom Repo')).not.toBeInTheDocument();
});

test('Can filter repositories case-insensitively', () => {
  const { getByPlaceholderText, getByText, queryByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Filter with lowercase
  fireEvent.change(filterInput, { target: { value: 'appstream' } });

  expect(getByText('RHEL 8 AppStream')).toBeInTheDocument();
  expect(queryByText('RHEL 8 BaseOS')).not.toBeInTheDocument();
});

test('Can show empty state when no repositories exist', () => {
  const { getByText, queryByRole } = render(<ContentCredentialRepositories details={mockDetailsEmpty} />);

  expect(getByText(/don't have any Repositories associated/)).toBeInTheDocument();
  expect(queryByRole('table')).not.toBeInTheDocument();
});

test('Can show empty state when filter matches no repositories', () => {
  const { getByPlaceholderText, queryByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const filterInput = getByPlaceholderText('Filter...');
  fireEvent.change(filterInput, { target: { value: 'NonexistentRepo' } });

  expect(queryByText('RHEL 8 BaseOS')).not.toBeInTheDocument();
  expect(queryByText('RHEL 8 AppStream')).not.toBeInTheDocument();
  expect(queryByText('Custom Repo')).not.toBeInTheDocument();
});

test('Can render repository links correctly', () => {
  const { container } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const repoLinks = container.querySelectorAll('a[href*="/repositories/"]');
  expect(repoLinks.length).toBeGreaterThan(0);

  // Check first repo link
  expect(repoLinks[0]).toHaveAttribute('href', '/products/10/repositories/101');
  expect(repoLinks[0]).toHaveTextContent('RHEL 8 BaseOS');
});

test('Can render product links correctly', () => {
  const { container } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const productLinks = container.querySelectorAll('a[href*="#/repositories"]');
  expect(productLinks.length).toBeGreaterThan(0);

  // Product links should include the anchor to repositories tab
  expect(productLinks[0]).toHaveAttribute('href', '/products/10#/repositories');
});

test('Can handle multiple repository types correctly', () => {
  const multiTypeDetails = {
    gpg_key_repos: [
      {
        id: 1,
        name: 'GPG Repo',
        library_instance_id: 101,
        content_type: 'yum',
        product: { id: 1, name: 'Product 1' },
      },
    ],
    ssl_ca_root_repos: [
      {
        id: 2,
        name: 'CA Cert Repo',
        library_instance_id: 102,
        content_type: 'docker',
        product: { id: 2, name: 'Product 2' },
      },
    ],
    ssl_client_root_repos: [
      {
        id: 3,
        name: 'Client Cert Repo',
        library_instance_id: 103,
        content_type: 'file',
        product: { id: 3, name: 'Product 3' },
      },
    ],
    ssl_key_root_repos: [
      {
        id: 4,
        name: 'Key Repo',
        library_instance_id: 104,
        content_type: 'yum',
        product: { id: 4, name: 'Product 4' },
      },
    ],
  };

  const { getByText } = render(<ContentCredentialRepositories details={multiTypeDetails} />);

  expect(getByText('GPG Repo')).toBeInTheDocument();
  expect(getByText('CA Cert Repo')).toBeInTheDocument();
  expect(getByText('Client Cert Repo')).toBeInTheDocument();
  expect(getByText('Key Repo')).toBeInTheDocument();

  expect(getByText('GPG Key')).toBeInTheDocument();
  expect(getByText('SSL CA Cert')).toBeInTheDocument();
  expect(getByText('SSL Client Cert')).toBeInTheDocument();
  expect(getByText('SSL Client Key')).toBeInTheDocument();
});

test('Can clear filter and show all repositories', () => {
  const { getByPlaceholderText, getByText } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Apply filter
  fireEvent.change(filterInput, { target: { value: 'BaseOS' } });
  expect(getByText('RHEL 8 BaseOS')).toBeInTheDocument();

  // Clear filter
  fireEvent.change(filterInput, { target: { value: '' } });

  // All repos should be visible again
  expect(getByText('RHEL 8 BaseOS')).toBeInTheDocument();
  expect(getByText('RHEL 8 AppStream')).toBeInTheDocument();
  expect(getByText('Custom Repo')).toBeInTheDocument();
});

test('Can render table with correct OUIA IDs for accessibility', () => {
  const { container } = render(<ContentCredentialRepositories details={mockDetailsWithRepos} />);

  expect(container.querySelector('[ouiaId="cc-repos-toolbar"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-repos-filter"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-repos-table"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-repos-table-header"]')).toBeInTheDocument();
});

test('Can handle repositories with missing product data', () => {
  const detailsWithMissingProduct = {
    gpg_key_repos: [
      {
        id: 1,
        name: 'Orphan Repo',
        library_instance_id: 101,
        content_type: 'yum',
        product: null,
      },
    ],
    ssl_ca_root_repos: [],
    ssl_client_root_repos: [],
    ssl_key_root_repos: [],
  };

  const { getByText } = render(<ContentCredentialRepositories details={detailsWithMissingProduct} />);

  // Should still render the repository
  expect(getByText('Orphan Repo')).toBeInTheDocument();
});

test('Can handle repositories with missing or null names', () => {
  const detailsWithNullNames = {
    gpg_key_repos: [
      {
        id: 1,
        name: null,
        library_instance_id: 101,
        content_type: 'yum',
        product: { id: 1, name: 'Product 1' },
      },
      {
        id: 2,
        name: 'Valid Repo',
        library_instance_id: 102,
        content_type: 'yum',
        product: { id: 1, name: 'Product 1' },
      },
    ],
    ssl_ca_root_repos: [],
    ssl_client_root_repos: [],
    ssl_key_root_repos: [],
  };

  const { getByText } = render(<ContentCredentialRepositories details={detailsWithNullNames} />);

  // Should still render the valid repository
  expect(getByText('Valid Repo')).toBeInTheDocument();
});
