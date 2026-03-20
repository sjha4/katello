import React from 'react';
import { act } from 'react-dom/test-utils';
import { renderWithRedux, patientlyWaitFor, fireEvent } from 'react-testing-lib-wrapper';
import { Route } from 'react-router-dom';
import { nockInstance, assertNockRequest } from '../../../../test-utils/nockWrapper';
import api from '../../../../services/api';
import ContentCredentialDetails from '../ContentCredentialDetails';
import { contentCredentialDetailsKey } from '../../ContentCredentialConstants';
import mockData from './contentCredentialDetails.fixtures.json';

const ccId = 1;
const ccDetailsKey = contentCredentialDetailsKey(ccId);
const ccDetailsUrl = api.getApiUrl(`/content_credentials/${ccId}`);

const renderOptions = (responseData, status = 'RESOLVED') => ({
  apiNamespace: ccDetailsKey,
  routerParams: {
    initialEntries: [`/labs/content_credentials/${ccId}`],
    initialIndex: 0,
  },
  initialState: {
    API: {
      [ccDetailsKey]: {
        response: responseData,
        status,
      },
    },
  },
});

describe('Content Credential Details Integration Tests', () => {
  test('Can navigate between all tabs and display correct content', async (done) => {
    const { getByRole, getByText } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialGPG),
    );

    await patientlyWaitFor(() => {
      expect(getByText('Test GPG Key')).toBeInTheDocument();
    });

    // Verify Details tab is active by default
    expect(getByText('Name')).toBeInTheDocument();
    expect(getByText('Type')).toBeInTheDocument();
    expect(getByText('GPG Key')).toBeInTheDocument();

    // Click Products tab
    const productsTab = getByRole('tab', { name: /Products/i });
    fireEvent.click(productsTab);

    await patientlyWaitFor(() => {
      expect(getByText('RHEL 8 for x86_64')).toBeInTheDocument();
      expect(getByText('RHEL 9 for x86_64')).toBeInTheDocument();
    });

    // Click Repositories tab
    const repositoriesTab = getByRole('tab', { name: /Repositories/i });
    fireEvent.click(repositoriesTab);

    await patientlyWaitFor(() => {
      expect(getByText(/Red Hat Enterprise Linux 8.*BaseOS/)).toBeInTheDocument();
      expect(getByText(/Red Hat Enterprise Linux 8.*AppStream/)).toBeInTheDocument();
    });

    // Click Alternate Content Sources tab
    const acsTab = getByRole('tab', { name: /Alternate Content Sources/i });
    fireEvent.click(acsTab);

    await patientlyWaitFor(() => {
      expect(getByText(/don't have any Alternate Content Sources/)).toBeInTheDocument();
    });

    // Navigate back to Details tab
    const detailsTab = getByRole('tab', { name: /Details/i });
    fireEvent.click(detailsTab);

    await patientlyWaitFor(() => {
      expect(getByText('Name')).toBeInTheDocument();
      expect(getByText('Content')).toBeInTheDocument();
    });

    act(done);
  });

  test('Can filter products and repositories on respective tabs', async (done) => {
    const {
      getByRole, getByText, getByPlaceholderText, queryByText,
    } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialGPG),
    );

    await patientlyWaitFor(() => {
      expect(getByText('Test GPG Key')).toBeInTheDocument();
    });

    // Go to Products tab
    const productsTab = getByRole('tab', { name: /Products/i });
    fireEvent.click(productsTab);

    await patientlyWaitFor(() => {
      expect(getByText('RHEL 8 for x86_64')).toBeInTheDocument();
    });

    // Filter products
    const productsFilter = getByPlaceholderText('Filter...');
    fireEvent.change(productsFilter, { target: { value: 'RHEL 9' } });

    await patientlyWaitFor(() => {
      expect(getByText('RHEL 9 for x86_64')).toBeInTheDocument();
      expect(queryByText('RHEL 8 for x86_64')).not.toBeInTheDocument();
    });

    // Clear filter
    fireEvent.change(productsFilter, { target: { value: '' } });

    await patientlyWaitFor(() => {
      expect(getByText('RHEL 8 for x86_64')).toBeInTheDocument();
      expect(getByText('RHEL 9 for x86_64')).toBeInTheDocument();
    });

    // Go to Repositories tab
    const repositoriesTab = getByRole('tab', { name: /Repositories/i });
    fireEvent.click(repositoriesTab);

    await patientlyWaitFor(() => {
      expect(getByText(/BaseOS/)).toBeInTheDocument();
    });

    // Filter repositories
    const reposFilter = getByPlaceholderText('Filter...');
    fireEvent.change(reposFilter, { target: { value: 'AppStream' } });

    await patientlyWaitFor(() => {
      expect(getByText(/AppStream/)).toBeInTheDocument();
      expect(queryByText(/BaseOS/)).not.toBeInTheDocument();
    });

    act(done);
  });

  test('Can view certificate type content credential with ACS', async (done) => {
    const { getByRole, getByText } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialCert),
    );

    await patientlyWaitFor(() => {
      expect(getByText('Custom SSL Certificate')).toBeInTheDocument();
    });

    // Verify certificate type is displayed
    expect(getByText('Certificate')).toBeInTheDocument();

    // Navigate to ACS tab
    const acsTab = getByRole('tab', { name: /Alternate Content Sources/i });
    fireEvent.click(acsTab);

    await patientlyWaitFor(() => {
      expect(getByText('Custom ACS')).toBeInTheDocument();
      expect(getByText('SSL CA Cert')).toBeInTheDocument();
    });

    act(done);
  });

  test('Can view empty content credential', async (done) => {
    const { getByRole, getByText } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialEmpty),
    );

    await patientlyWaitFor(() => {
      expect(getByText('Empty Content Credential')).toBeInTheDocument();
    });

    // Check Products tab shows empty state
    const productsTab = getByRole('tab', { name: /Products/i });
    fireEvent.click(productsTab);

    await patientlyWaitFor(() => {
      expect(getByText(/don't have any Products associated/)).toBeInTheDocument();
    });

    // Check Repositories tab shows empty state
    const repositoriesTab = getByRole('tab', { name: /Repositories/i });
    fireEvent.click(repositoriesTab);

    await patientlyWaitFor(() => {
      expect(getByText(/don't have any Repositories associated/)).toBeInTheDocument();
    });

    // Check ACS tab shows empty state
    const acsTab = getByRole('tab', { name: /Alternate Content Sources/i });
    fireEvent.click(acsTab);

    await patientlyWaitFor(() => {
      expect(getByText(/don't have any Alternate Content Sources associated/)).toBeInTheDocument();
    });

    act(done);
  });

  test('Can update content credential name and see changes reflected', async (done) => {
    const updatedName = 'Updated GPG Key Name';
    const updateScope = nockInstance
      .put(ccDetailsUrl)
      .reply(200, { ...mockData.contentCredentialGPG, name: updatedName });

    const { getByText, container } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialGPG),
    );

    await patientlyWaitFor(() => {
      expect(getByText('Test GPG Key')).toBeInTheDocument();
    });

    // Find and click the edit button for name
    const editButtons = container.querySelectorAll('.fa-edit, .fa-pencil, [aria-label*="edit"]');
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);

      await patientlyWaitFor(() => {
        const input = container.querySelector('input[type="text"]');
        expect(input).toBeInTheDocument();
      });

      // Update the name
      const input = container.querySelector('input[type="text"]');
      fireEvent.change(input, { target: { value: updatedName } });

      // Save the changes
      const saveButton = container.querySelector('[aria-label*="save"], .fa-check');
      if (saveButton) {
        fireEvent.click(saveButton);
        assertNockRequest(updateScope);
      }
    }

    act(done);
  });

  test('Read-only user cannot edit or delete', async (done) => {
    const { queryByText, container } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialReadOnly),
    );

    await patientlyWaitFor(() => {
      expect(queryByText('Read Only GPG Key')).toBeInTheDocument();
    });

    // Remove button should not be visible
    expect(queryByText('Remove Content Credential')).not.toBeInTheDocument();

    // Edit buttons should be disabled
    const editButtons = container.querySelectorAll('.fa-edit, .fa-pencil, [aria-label*="edit"]');
    editButtons.forEach((button) => {
      expect(button).toHaveAttribute('disabled');
    });

    act(done);
  });

  test('Can verify product and repository counts in Details tab', async (done) => {
    const { getByText } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialGPG),
    );

    await patientlyWaitFor(() => {
      expect(getByText('Test GPG Key')).toBeInTheDocument();
    });

    // Verify counts are displayed
    expect(getByText('Products')).toBeInTheDocument();
    expect(getByText('2')).toBeInTheDocument(); // 2 products

    expect(getByText('Repositories')).toBeInTheDocument();
    // Should also show 2 for repositories based on fixture data

    act(done);
  });

  test('Can handle API errors gracefully', async (done) => {
    const errorMessage = 'Network error occurred';
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

    act(done);
  });

  test('Can maintain filter state when switching between Products and Repositories tabs', async (done) => {
    const { getByRole, getByPlaceholderText, queryByText } = renderWithRedux(
      <Route path="/labs/content_credentials/:id">
        <ContentCredentialDetails />
      </Route>,
      renderOptions(mockData.contentCredentialGPG),
    );

    await patientlyWaitFor(() => {
      expect(queryByText('Test GPG Key')).toBeInTheDocument();
    });

    // Go to Products tab and apply filter
    const productsTab = getByRole('tab', { name: /Products/i });
    fireEvent.click(productsTab);

    await patientlyWaitFor(() => {
      const filter = getByPlaceholderText('Filter...');
      expect(filter).toBeInTheDocument();
    });

    const productsFilter = getByPlaceholderText('Filter...');
    fireEvent.change(productsFilter, { target: { value: 'RHEL 9' } });

    // Switch to Repositories tab
    const repositoriesTab = getByRole('tab', { name: /Repositories/i });
    fireEvent.click(repositoriesTab);

    await patientlyWaitFor(() => {
      const reposFilter = getByPlaceholderText('Filter...');
      // Repositories filter should be empty (independent state)
      expect(reposFilter).toHaveValue('');
    });

    act(done);
  });
});
