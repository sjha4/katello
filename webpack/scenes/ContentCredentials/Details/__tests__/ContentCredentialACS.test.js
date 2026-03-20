import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ContentCredentialACS from '../ContentCredentialACS';

const mockDetailsWithACS = {
  ssl_ca_alternate_content_sources: [
    {
      id: 1,
      name: 'Custom ACS 1',
    },
    {
      id: 2,
      name: 'Custom ACS 2',
    },
  ],
  ssl_client_alternate_content_sources: [
    {
      id: 3,
      name: 'Client Cert ACS',
    },
  ],
  ssl_key_alternate_content_sources: [],
};

const mockDetailsEmpty = {
  ssl_ca_alternate_content_sources: [],
  ssl_client_alternate_content_sources: [],
  ssl_key_alternate_content_sources: [],
};

test('Can render alternate content sources table with data', () => {
  const { getByText } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  expect(getByText('Custom ACS 1')).toBeInTheDocument();
  expect(getByText('Custom ACS 2')).toBeInTheDocument();
  expect(getByText('Client Cert ACS')).toBeInTheDocument();
});

test('Can display table headers correctly', () => {
  const { getByText } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  expect(getByText('Name')).toBeInTheDocument();
  expect(getByText('Used as')).toBeInTheDocument();
});

test('Can display "Used as" column correctly', () => {
  const { getAllByText } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const caCerts = getAllByText('SSL CA Cert');
  expect(caCerts).toHaveLength(2); // Two CA cert ACS
  expect(getAllByText('SSL Client Cert')[0]).toBeInTheDocument();
});

test('Can filter ACS by name', () => {
  const {
    getByPlaceholderText, getByText, queryByText,
  } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Initially all ACS should be visible
  expect(getByText('Custom ACS 1')).toBeInTheDocument();
  expect(getByText('Custom ACS 2')).toBeInTheDocument();
  expect(getByText('Client Cert ACS')).toBeInTheDocument();

  // Filter for "Custom"
  fireEvent.change(filterInput, { target: { value: 'Custom' } });

  expect(getByText('Custom ACS 1')).toBeInTheDocument();
  expect(getByText('Custom ACS 2')).toBeInTheDocument();
  expect(queryByText('Client Cert ACS')).not.toBeInTheDocument();
});

test('Can filter ACS case-insensitively', () => {
  const {
    getByPlaceholderText, getByText, queryByText,
  } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Filter with lowercase
  fireEvent.change(filterInput, { target: { value: 'client' } });

  expect(getByText('Client Cert ACS')).toBeInTheDocument();
  expect(queryByText('Custom ACS 1')).not.toBeInTheDocument();
  expect(queryByText('Custom ACS 2')).not.toBeInTheDocument();
});

test('Can show empty state when no ACS exist', () => {
  const { getByText, queryByRole } = render(
    <ContentCredentialACS details={mockDetailsEmpty} />,
  );

  expect(getByText(/don't have any Alternate Content Sources associated/)).toBeInTheDocument();
  expect(queryByRole('table')).not.toBeInTheDocument();
});

test('Can show empty state when filter matches no ACS', () => {
  const { getByPlaceholderText, queryByText } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const filterInput = getByPlaceholderText('Filter...');
  fireEvent.change(filterInput, { target: { value: 'NonexistentACS' } });

  expect(queryByText('Custom ACS 1')).not.toBeInTheDocument();
  expect(queryByText('Custom ACS 2')).not.toBeInTheDocument();
  expect(queryByText('Client Cert ACS')).not.toBeInTheDocument();
});

test('Can render ACS links correctly', () => {
  const { container } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const acsLinks = container.querySelectorAll('a[href^="/alternate_content_sources/"]');
  expect(acsLinks.length).toBeGreaterThan(0);

  // Check first ACS link
  expect(acsLinks[0]).toHaveAttribute('href', '/alternate_content_sources/1/details');
  expect(acsLinks[0]).toHaveTextContent('Custom ACS 1');
});

test('Can handle multiple ACS types correctly', () => {
  const multiTypeDetails = {
    ssl_ca_alternate_content_sources: [
      { id: 1, name: 'CA Cert ACS' },
    ],
    ssl_client_alternate_content_sources: [
      { id: 2, name: 'Client Cert ACS' },
    ],
    ssl_key_alternate_content_sources: [
      { id: 3, name: 'Key ACS' },
    ],
  };

  const { getByText } = render(
    <ContentCredentialACS details={multiTypeDetails} />,
  );

  expect(getByText('CA Cert ACS')).toBeInTheDocument();
  expect(getByText('Client Cert ACS')).toBeInTheDocument();
  expect(getByText('Key ACS')).toBeInTheDocument();

  expect(getByText('SSL CA Cert')).toBeInTheDocument();
  expect(getByText('SSL Client Cert')).toBeInTheDocument();
  expect(getByText('SSL Client Key')).toBeInTheDocument();
});

test('Can clear filter and show all ACS', () => {
  const { getByPlaceholderText, getByText } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Apply filter
  fireEvent.change(filterInput, { target: { value: 'Custom ACS 1' } });
  expect(getByText('Custom ACS 1')).toBeInTheDocument();

  // Clear filter
  fireEvent.change(filterInput, { target: { value: '' } });

  // All ACS should be visible again
  expect(getByText('Custom ACS 1')).toBeInTheDocument();
  expect(getByText('Custom ACS 2')).toBeInTheDocument();
  expect(getByText('Client Cert ACS')).toBeInTheDocument();
});

test('Can render table with correct OUIA IDs for accessibility', () => {
  const { container } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  expect(container.querySelector('[ouiaId="cc-acs-toolbar"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-acs-filter"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-acs-table"]')).toBeInTheDocument();
  expect(container.querySelector('[ouiaId="cc-acs-table-header"]')).toBeInTheDocument();
});

test('Can handle ACS with missing or null names', () => {
  const detailsWithNullNames = {
    ssl_ca_alternate_content_sources: [
      { id: 1, name: null },
      { id: 2, name: undefined },
      { id: 3, name: 'Valid ACS' },
    ],
    ssl_client_alternate_content_sources: [],
    ssl_key_alternate_content_sources: [],
  };

  const { getByText } = render(<ContentCredentialACS details={detailsWithNullNames} />);

  // Should still render the valid ACS
  expect(getByText('Valid ACS')).toBeInTheDocument();
});

test('Can filter ACS by partial name match', () => {
  const {
    getByPlaceholderText, getByText, queryByText,
  } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const filterInput = getByPlaceholderText('Filter...');

  // Filter with partial match
  fireEvent.change(filterInput, { target: { value: 'ACS 2' } });

  expect(getByText('Custom ACS 2')).toBeInTheDocument();
  expect(queryByText('Custom ACS 1')).not.toBeInTheDocument();
  expect(queryByText('Client Cert ACS')).not.toBeInTheDocument();
});

test('Can handle empty arrays for all ACS types', () => {
  const emptyDetails = {
    ssl_ca_alternate_content_sources: [],
    ssl_client_alternate_content_sources: [],
    ssl_key_alternate_content_sources: [],
  };

  const { getByText } = render(<ContentCredentialACS details={emptyDetails} />);

  expect(getByText(/don't have any Alternate Content Sources associated/)).toBeInTheDocument();
});

test('Can display correct row count', () => {
  const { container } = render(<ContentCredentialACS details={mockDetailsWithACS} />);

  const tableRows = container.querySelectorAll('tbody tr');
  expect(tableRows).toHaveLength(3); // 2 CA cert + 1 client cert
});

test('Can handle ACS with same names but different types', () => {
  const duplicateNameDetails = {
    ssl_ca_alternate_content_sources: [
      { id: 1, name: 'Same Name ACS' },
    ],
    ssl_client_alternate_content_sources: [
      { id: 2, name: 'Same Name ACS' },
    ],
    ssl_key_alternate_content_sources: [],
  };

  const { getAllByText } = render(
    <ContentCredentialACS details={duplicateNameDetails} />,
  );

  const nameElements = getAllByText('Same Name ACS');
  expect(nameElements.length).toBeGreaterThanOrEqual(2); // Both should be displayed

  expect(getAllByText('SSL CA Cert')[0]).toBeInTheDocument();
  expect(getAllByText('SSL Client Cert')[0]).toBeInTheDocument();
});
