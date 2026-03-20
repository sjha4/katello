import React from 'react';
import { renderWithRedux, patientlyWaitFor, fireEvent } from 'react-testing-lib-wrapper';
import { Route } from 'react-router-dom';
import { nockInstance, assertNockRequest } from '../../../../test-utils/nockWrapper';
import api from '../../../../services/api';
import ContentCredentialDetails from '../ContentCredentialDetails';
import { contentCredentialDetailsKey } from '../../ContentCredentialConstants';

const ccId = 1;
const ccDetailsKey = contentCredentialDetailsKey(ccId);
const ccDetailsUrl = api.getApiUrl(`/content_credentials/${ccId}`);

const mockContentCredential = {
  id: ccId,
  name: 'Test GPG Key',
  content_type: 'gpg_key',
  content: '-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest key content\n-----END PGP PUBLIC KEY BLOCK-----',
  permissions: {
    view_content_credentials: true,
    edit_content_credentials: true,
    destroy_content_credentials: true,
  },
  gpg_key_products: [],
  ssl_ca_products: [],
  ssl_client_products: [],
  ssl_key_products: [],
  gpg_key_repos: [],
  ssl_ca_root_repos: [],
  ssl_client_root_repos: [],
  ssl_key_root_repos: [],
  ssl_ca_alternate_content_sources: [],
  ssl_client_alternate_content_sources: [],
  ssl_key_alternate_content_sources: [],
};

const renderOptions = (status = 'RESOLVED') => ({
  apiNamespace: ccDetailsKey,
  routerParams: {
    initialEntries: [`/labs/content_credentials/${ccId}`],
    initialIndex: 0,
  },
  initialState: {
    API: {
      [ccDetailsKey]: {
        response: mockContentCredential,
        status,
      },
    },
  },
});

test('Can render content credential details page and load data', async () => {
  const scope = nockInstance
    .get(ccDetailsUrl)
    .query(true)
    .reply(200, mockContentCredential);

  const { getByText } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions('PENDING'),
  );

  await patientlyWaitFor(() => expect(getByText('Test GPG Key')).toBeInTheDocument());
  expect(getByText('Content Credentials')).toBeInTheDocument();
  assertNockRequest(scope);
});

test('Can display all tabs', async () => {
  const { getAllByRole } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions(),
  );

  await patientlyWaitFor(() => {
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent('Details');
    expect(tabs[1]).toHaveTextContent('Products');
    expect(tabs[2]).toHaveTextContent('Repositories');
    expect(tabs[3]).toHaveTextContent('Alternate Content Sources');
  });
});

test('Can show remove button when user has delete permission', async () => {
  const { getByText } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions(),
  );

  await patientlyWaitFor(() => {
    expect(getByText('Remove Content Credential')).toBeInTheDocument();
  });
});

test('Can hide remove button when user lacks delete permission', async () => {
  const ccWithoutDeletePerm = {
    ...mockContentCredential,
    permissions: {
      ...mockContentCredential.permissions,
      destroy_content_credentials: false,
    },
  };

  const { queryByText } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    {
      ...renderOptions(),
      initialState: {
        API: {
          [ccDetailsKey]: {
            response: ccWithoutDeletePerm,
            status: 'RESOLVED',
          },
        },
      },
    },
  );

  await patientlyWaitFor(() => {
    expect(queryByText('Remove Content Credential')).not.toBeInTheDocument();
  });
});

test('Can open delete confirmation modal', async () => {
  const { getByText, queryByText } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions(),
  );

  await patientlyWaitFor(() => {
    expect(getByText('Remove Content Credential')).toBeInTheDocument();
  });

  // Modal should not be visible initially
  expect(queryByText(/Are you sure you want to remove/)).not.toBeInTheDocument();

  // Click remove button
  fireEvent.click(getByText('Remove Content Credential'));

  // Modal should appear
  await patientlyWaitFor(() => {
    expect(getByText(/Are you sure you want to remove Content Credential Test GPG Key/)).toBeInTheDocument();
  });
});

test('Can cancel delete operation', async () => {
  const { getByText, queryByText, getByRole } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions(),
  );

  await patientlyWaitFor(() => {
    expect(getByText('Remove Content Credential')).toBeInTheDocument();
  });

  // Open modal
  fireEvent.click(getByText('Remove Content Credential'));

  await patientlyWaitFor(() => {
    expect(getByText(/Are you sure you want to remove/)).toBeInTheDocument();
  });

  // Click cancel
  const cancelButton = getByRole('button', { name: /Cancel/i });
  fireEvent.click(cancelButton);

  // Modal should close
  await patientlyWaitFor(() => {
    expect(queryByText(/Are you sure you want to remove/)).not.toBeInTheDocument();
  });
});

test('Can delete content credential', async () => {
  const deleteScope = nockInstance
    .delete(ccDetailsUrl)
    .reply(200);

  const { getByText, getByRole } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions(),
  );

  await patientlyWaitFor(() => {
    expect(getByText('Remove Content Credential')).toBeInTheDocument();
  });

  // Open modal
  fireEvent.click(getByText('Remove Content Credential'));

  await patientlyWaitFor(() => {
    expect(getByText(/Are you sure you want to remove/)).toBeInTheDocument();
  });

  // Confirm deletion
  const confirmButton = getByRole('button', { name: /^Remove$/i });
  fireEvent.click(confirmButton);

  assertNockRequest(deleteScope);
});

test('Can display breadcrumbs correctly', async () => {
  const { getByText } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions(),
  );

  await patientlyWaitFor(() => {
    expect(getByText('Content Credentials')).toBeInTheDocument();
    expect(getByText('Test GPG Key')).toBeInTheDocument();
  });
});

test('Can handle error state', async () => {
  const errorMessage = 'Failed to load content credential';
  const { getByText } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    {
      apiNamespace: ccDetailsKey,
      routerParams: {
        initialEntries: [`/labs/content_credentials/${ccId}`],
        initialIndex: 0,
      },
      initialState: {
        API: {
          [ccDetailsKey]: {
            response: {},
            status: 'ERROR',
            error: { message: errorMessage },
          },
        },
      },
    },
  );

  await patientlyWaitFor(() => {
    expect(getByText(errorMessage)).toBeInTheDocument();
  });
});

test('Can display loading state', async () => {
  const { container } = renderWithRedux(
    <Route path="/labs/content_credentials/:id">
      <ContentCredentialDetails />
    </Route>,
    renderOptions('PENDING'),
  );

  // Loading component should be present
  await patientlyWaitFor(() => {
    const loadingElement = container.querySelector('.loading');
    expect(loadingElement).toBeInTheDocument();
  });
});
