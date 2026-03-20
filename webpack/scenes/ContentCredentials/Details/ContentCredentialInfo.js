import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  TextContent,
  TextList,
  TextListVariants,
  TextListItem,
  TextListItemVariants,
} from '@patternfly/react-core';
import PropTypes from 'prop-types';
import { translate as __ } from 'foremanReact/common/I18n';

import ActionableDetail from '../../../components/ActionableDetail';
import { updateContentCredential } from '../ContentCredentialActions';
import {
  CONTENT_CREDENTIAL_GPG_TYPE,
  PRODUCT_TYPE_MAP,
  REPO_TYPE_MAP,
} from '../ContentCredentialConstants';

const formatContentType = (contentType) => {
  if (contentType === CONTENT_CREDENTIAL_GPG_TYPE) return __('GPG Key');
  return __('Certificate');
};

const getProductsCount = (details) => {
  let count = 0;
  Object.keys(PRODUCT_TYPE_MAP).forEach((key) => {
    count += details[key]?.length || 0;
  });
  return count;
};

const getRepositoriesCount = (details) => {
  let count = 0;
  Object.keys(REPO_TYPE_MAP).forEach((key) => {
    count += details[key]?.length || 0;
  });
  return count;
};

const ContentCredentialInfo = ({ ccId, details }) => {
  const dispatch = useDispatch();
  const [currentAttribute, setCurrentAttribute] = useState();

  const {
    name,
    content_type: contentType,
    content,
    permissions,
  } = details;

  const canEdit = permissions?.edit_content_credentials !== false;

  const onEdit = (val, attribute) => {
    if (val === details[attribute]) return;
    dispatch(updateContentCredential(ccId, { [attribute]: val }));
  };

  return (
    <TextContent className="margin-0-24">
      <TextList component={TextListVariants.dl}>
        <ActionableDetail
          key={name}
          label={__('Name')}
          attribute="name"
          onEdit={onEdit}
          disabled={!canEdit}
          value={name}
          {...{ currentAttribute, setCurrentAttribute }}
        />
        <TextListItem component={TextListItemVariants.dt}>
          {__('Type')}
        </TextListItem>
        <TextListItem
          component={TextListItemVariants.dd}
          className="foreman-spaced-list"
        >
          {formatContentType(contentType)}
        </TextListItem>
        <ActionableDetail
          key={content}
          label={__('Content')}
          attribute="content"
          textArea
          onEdit={onEdit}
          disabled={!canEdit}
          value={content}
          {...{ currentAttribute, setCurrentAttribute }}
        />
        <TextListItem component={TextListItemVariants.dt}>
          {__('Products')}
        </TextListItem>
        <TextListItem
          component={TextListItemVariants.dd}
          className="foreman-spaced-list"
        >
          {getProductsCount(details)}
        </TextListItem>
        <TextListItem component={TextListItemVariants.dt}>
          {__('Repositories')}
        </TextListItem>
        <TextListItem
          component={TextListItemVariants.dd}
          className="foreman-spaced-list"
        >
          {getRepositoriesCount(details)}
        </TextListItem>
      </TextList>
    </TextContent>
  );
};

ContentCredentialInfo.propTypes = {
  ccId: PropTypes.number.isRequired,
  details: PropTypes.shape({
    name: PropTypes.string,
    content_type: PropTypes.string,
    content: PropTypes.string,
    permissions: PropTypes.shape({
      edit_content_credentials: PropTypes.bool,
    }),
  }).isRequired,
};

export default ContentCredentialInfo;
