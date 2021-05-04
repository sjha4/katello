import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Switch, Flex, FlexItem, TextContent, Text, TextVariants, Form, FormGroup, TextArea } from '@patternfly/react-core';
import { EnterpriseIcon, RegistryIcon } from '@patternfly/react-icons';
import EnvironmentPaths from '../components/EnvironmentPaths/EnvironmentPaths';

const CVPublishForm = ({
  description,
  setDescription,
  details,
  checkedItems,
  setCheckedItems,
  promote,
  setPromote,
}) => {
  const {
    id: cvId, name, composite, next_version: nextVersion,
  } = details;
  return (
    <>
      <>
        <TextContent>
          <Text style={{ marginBottom: '1em' }} component={TextVariants.h1}>{__('Publish')}</Text>
        </TextContent>
        <Flex flex={{ default: 'inlineFlex' }}>
          <FlexItem>{__('A new version of ')}<b>{composite ? <RegistryIcon /> : <EnterpriseIcon />} {name}</b>
            {__(' will be created and automatically promoted to the ' +
          'Library environment. You can promote to other environments as well. ')}
          </FlexItem>
        </Flex>
        <TextContent>
          <Text style={{ marginTop: '1em', marginBottom: '1em' }} component={TextVariants.h3}>{__('Publish new version - ')}{nextVersion}</Text>
        </TextContent>
        <Form>
          <FormGroup label="Description" fieldId="description">
            <TextArea
              isRequired
              type="text"
              id="description"
              aria-label="input_description"
              name="description"
              value={description}
              onChange={value => setDescription(value)}
            />
          </FormGroup>
          <FormGroup label="Promote" fieldId="promote" style={{ marginBottom: '2em' }}>
            <Switch
              id="promote-switch"
              isChecked={promote}
              onChange={checked => setPromote(checked)}
            />
          </FormGroup>
        </Form>
      </>
      <>
        {promote && <EnvironmentPaths cvId={cvId} checkedItems={checkedItems} setCheckedItems={setCheckedItems} />}
      </>
    </>
  );
};

CVPublishForm.propTypes = {
  description: PropTypes.string,
  setDescription: PropTypes.func,
};

export default CVPublishForm;
