import React, { useState, useEffect } from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import {
  Grid,
  GridItem,
  TextContent,
  Text,
  TextVariants,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { STATUS } from 'foremanReact/constants';
import { translate as __ } from 'foremanReact/common/I18n';

import {
  selectContentCredentialDetails,
  selectContentCredentialDetailsStatus,
  selectContentCredentialDetailsError,
} from '../ContentCredentialSelectors';
import {
  getContentCredentialDetails,
  deleteContentCredential,
} from '../ContentCredentialActions';
import Loading from '../../../components/Loading';
import EmptyStateMessage from '../../../components/Table/EmptyStateMessage';
import RoutedTabs from '../../../components/RoutedTabs';
import ContentCredentialInfo from './ContentCredentialInfo';
import ContentCredentialProducts from './ContentCredentialProducts';
import ContentCredentialRepositories from './ContentCredentialRepositories';
import ContentCredentialACS from './ContentCredentialACS';

const ContentCredentialDetails = () => {
  const { id } = useParams();
  const ccId = Number(id);
  const dispatch = useDispatch();
  const history = useHistory();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const details = useSelector(
    state => selectContentCredentialDetails(state, ccId),
    shallowEqual,
  );
  const status = useSelector(
    state => selectContentCredentialDetailsStatus(state, ccId),
    shallowEqual,
  );
  const error = useSelector(
    state => selectContentCredentialDetailsError(state, ccId),
    shallowEqual,
  );

  useEffect(() => {
    dispatch(getContentCredentialDetails(ccId));
  }, [ccId, dispatch]);

  if (status === STATUS.PENDING) return <Loading />;
  if (status === STATUS.ERROR) return <EmptyStateMessage error={error} />;

  const { name, permissions } = details;
  const canDelete = permissions?.destroy_content_credentials !== false;

  const handleDelete = () => {
    dispatch(deleteContentCredential(ccId, () => {
      history.push('/labs/content_credentials');
    }));
  };

  const tabs = [
    {
      key: 'details',
      title: __('Details'),
      content: <ContentCredentialInfo ccId={ccId} details={details} />,
    },
    {
      key: 'products',
      title: __('Products'),
      content: <ContentCredentialProducts ccId={ccId} details={details} />,
    },
    {
      key: 'repositories',
      title: __('Repositories'),
      content: <ContentCredentialRepositories ccId={ccId} details={details} />,
    },
    {
      key: 'alternate_content_sources',
      title: __('Alternate Content Sources'),
      content: <ContentCredentialACS ccId={ccId} details={details} />,
    },
  ];

  return (
    <Grid className="margin-16-24">
      <GridItem span={12}>
        <Breadcrumb ouiaId="cc-breadcrumb">
          <BreadcrumbItem to="/labs/content_credentials">
            {__('Content Credentials')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{name}</BreadcrumbItem>
        </Breadcrumb>
      </GridItem>
      <GridItem span={12}>
        <Flex>
          <FlexItem>
            <TextContent>
              <Text ouiaId="cc-details-header" component={TextVariants.h1}>
                {name}
              </Text>
            </TextContent>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            {canDelete && (
              <Button
                ouiaId="cc-remove-button"
                variant="danger"
                onClick={() => setDeleteModalOpen(true)}
              >
                {__('Remove Content Credential')}
              </Button>
            )}
          </FlexItem>
        </Flex>
      </GridItem>
      <GridItem span={12}>
        <RoutedTabs tabs={tabs} defaultTabIndex={0} />
      </GridItem>
      <Modal
        ouiaId="cc-delete-modal"
        variant={ModalVariant.small}
        title={__('Remove Content Credential')}
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        actions={[
          <Button
            key="confirm"
            ouiaId="cc-delete-confirm"
            variant="danger"
            onClick={handleDelete}
          >
            {__('Remove')}
          </Button>,
          <Button
            key="cancel"
            ouiaId="cc-delete-cancel"
            variant="link"
            onClick={() => setDeleteModalOpen(false)}
          >
            {__('Cancel')}
          </Button>,
        ]}
      >
        {__('Are you sure you want to remove Content Credential %s?').replace('%s', name)}
      </Modal>
    </Grid>
  );
};

export default ContentCredentialDetails;
