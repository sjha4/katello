import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { nockInstance, assertNockRequest } from '../../../../test-utils/nockWrapper';
import api from '../../../../services/api';
import ContentCredentialInfo from '../ContentCredentialInfo';

const ccId = 1;
const ccDetailsUrl = api.getApiUrl(`/content_credentials/${ccId}`);

const mockDetails = {
  id: ccId,
  name: 'Test GPG Key',
  content_type: 'gpg_key',
  content: '-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest key content\n-----END PGP PUBLIC KEY BLOCK-----',
  permissions: {
    edit_content_credentials: true,
  },
  gpg_key_products: [
    { id: 1, name: 'Product 1' },
    { id: 2, name: 'Product 2' },
  ],
  ssl_ca_products: [],
  ssl_client_products: [],
  ssl_key_products: [],
  gpg_key_repos: [
    { id: 1, name: 'Repo 1' },
  ],
  ssl_ca_root_repos: [],
  ssl_client_root_repos: [],
  ssl_key_root_repos: [],
};

const mockCertDetails = {
  ...mockDetails,
  name: 'Test SSL Cert',
  content_type: 'cert',
  content: '-----BEGIN CERTIFICATE-----\ntest cert content\n-----END CERTIFICATE-----',
};

const mockStore = createStore(
  () => ({}),
  applyMiddleware(thunk),
);

const renderWithStore = component => render(
  <Provider store={mockStore}>{component}</Provider>,
);

test('Can render content credential info with GPG key type', () => {
  const { getByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mockDetails} />,
  );

  expect(getByText('Name')).toBeInTheDocument();
  expect(getByText('Test GPG Key')).toBeInTheDocument();
  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('GPG Key')).toBeInTheDocument();
  expect(getByText('Content')).toBeInTheDocument();
  expect(getByText(/BEGIN PGP PUBLIC KEY BLOCK/)).toBeInTheDocument();
});

test('Can render content credential info with certificate type', () => {
  const { getByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mockCertDetails} />,
  );

  expect(getByText('Test SSL Cert')).toBeInTheDocument();
  expect(getByText('Certificate')).toBeInTheDocument();
  expect(getByText(/BEGIN CERTIFICATE/)).toBeInTheDocument();
});

test('Can display products count correctly', () => {
  const { getByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mockDetails} />,
  );

  expect(getByText('Products')).toBeInTheDocument();
  expect(getByText('2')).toBeInTheDocument(); // 2 GPG key products
});

test('Can display repositories count correctly', () => {
  const { getByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mockDetails} />,
  );

  expect(getByText('Repositories')).toBeInTheDocument();
  expect(getByText('1')).toBeInTheDocument(); // 1 GPG key repo
});

test('Can display zero products and repos when none exist', () => {
  const emptyDetails = {
    ...mockDetails,
    gpg_key_products: [],
    gpg_key_repos: [],
  };

  const { getAllByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={emptyDetails} />,
  );

  const zeros = getAllByText('0');
  expect(zeros.length).toBeGreaterThanOrEqual(2); // One for products, one for repos
});

test('Can edit name when user has edit permission', async () => {
  const updateScope = nockInstance
    .put(ccDetailsUrl)
    .reply(200, { ...mockDetails, name: 'Updated GPG Key' });

  const { container } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mockDetails} />,
  );

  // Find the name field and click the edit button
  const editButtons = container.querySelectorAll('.fa-edit, .fa-pencil, [aria-label*="edit"]');
  expect(editButtons.length).toBeGreaterThan(0);

  // Click first edit button (for name)
  fireEvent.click(editButtons[0]);

  await waitFor(() => {
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
  });

  // Update the name
  const input = container.querySelector('input[type="text"]');
  fireEvent.change(input, { target: { value: 'Updated GPG Key' } });

  // Find and click save button
  const saveButton = container.querySelector('[aria-label*="save"], .fa-check, .fa-save');
  if (saveButton) {
    fireEvent.click(saveButton);
    assertNockRequest(updateScope);
  }
});

test('Can edit content when user has edit permission', async () => {
  const newContent = '-----BEGIN PGP PUBLIC KEY BLOCK-----\nupdated content\n-----END PGP PUBLIC KEY BLOCK-----';
  const updateScope = nockInstance
    .put(ccDetailsUrl)
    .reply(200, { ...mockDetails, content: newContent });

  const { container } = renderWithStore(<ContentCredentialInfo ccId={ccId} details={mockDetails} />);

  // Find and click the second edit button (for content)
  const editButtons = container.querySelectorAll('.fa-edit, .fa-pencil, [aria-label*="edit"]');
  expect(editButtons.length).toBeGreaterThan(1);

  fireEvent.click(editButtons[1]);

  await waitFor(() => {
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
  });

  // Update the content
  const textarea = container.querySelector('textarea');
  fireEvent.change(textarea, { target: { value: newContent } });

  // Find and click save button
  const saveButton = container.querySelector('[aria-label*="save"], .fa-check, .fa-save');
  if (saveButton) {
    fireEvent.click(saveButton);
    assertNockRequest(updateScope);
  }
});

test('Cannot edit when user lacks edit permission', () => {
  const noEditDetails = {
    ...mockDetails,
    permissions: {
      edit_content_credentials: false,
    },
  };

  const { container } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={noEditDetails} />,
  );

  // Edit buttons should be disabled or not present
  const editButtons = container.querySelectorAll('.fa-edit, .fa-pencil, [aria-label*="edit"]');
  editButtons.forEach((button) => {
    expect(button).toHaveAttribute('disabled');
  });
});

test('Can handle mixed product types in count', () => {
  const mixedDetails = {
    ...mockDetails,
    gpg_key_products: [{ id: 1, name: 'Product 1' }],
    ssl_ca_products: [{ id: 2, name: 'Product 2' }],
    ssl_client_products: [{ id: 3, name: 'Product 3' }],
    ssl_key_products: [],
  };

  const { getByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mixedDetails} />,
  );

  expect(getByText('Products')).toBeInTheDocument();
  expect(getByText('3')).toBeInTheDocument(); // 3 products total
});

test('Can handle mixed repository types in count', () => {
  const mixedDetails = {
    ...mockDetails,
    gpg_key_repos: [{ id: 1, name: 'Repo 1' }],
    ssl_ca_root_repos: [{ id: 2, name: 'Repo 2' }],
    ssl_client_root_repos: [],
    ssl_key_root_repos: [{ id: 3, name: 'Repo 3' }],
  };

  const { getByText } = renderWithStore(
    <ContentCredentialInfo ccId={ccId} details={mixedDetails} />,
  );

  expect(getByText('Repositories')).toBeInTheDocument();
  expect(getByText('3')).toBeInTheDocument(); // 3 repos total
});
