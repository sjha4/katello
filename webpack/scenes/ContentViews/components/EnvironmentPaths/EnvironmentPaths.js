import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { STATUS } from 'foremanReact/constants';
import PropTypes from 'prop-types';
import { translate as __ } from 'foremanReact/common/I18n';
import { Wizard, Form, FormGroup, Checkbox } from '@patternfly/react-core';
import { selectEnvironmentPaths, selectEnvironmentPathsStatus, selectEnvironmentPathsError } from './EnvironmentPathSelectors';
import EnvironmentLabels from '../EnvironmentLabels';
import './EnvironmentPaths.scss';

const EnvironmentPaths = ({ cvId, ...props }) => {
  const environmentPathResponse = useSelector(selectEnvironmentPaths);
  const environmentPathStatus = useSelector(selectEnvironmentPathsStatus);
  const environmentPathError = useSelector(selectEnvironmentPathsError);
  const environmentPathLoading = environmentPathStatus === STATUS.PENDING;
  const { checkedItems, setCheckedItems } = props;

  const buildformGroups = (results) => {
    console.log('in buildFormGroups');
    let pathFormGroups = [];
    let count = 1;
    results.forEach((path) => {
      const {
        environments,
      } = path || {};
      const pathEnvFormGroup =
        (
          <FormGroup key={count} isInline fieldId="environment-checkbox-group">
            {environments.map(env =>
              (<Checkbox
                isChecked={env.library || checkedItems.includes(env.id)}
                isDisabled={env.library}
                style={{ marginRight: '3px' }}
                className="env-labels-with-pointer"
                key={`${env.id}${count}`}
                id={`${env.id}${count}`}
                label={<EnvironmentLabels environments={env} />}
                aria-label={env.label}
                onChange={checked => setCheckedItems(checked ? [...checkedItems, env.id] : checkedItems.filter(item => item !== env.id))}
              />))}
          </FormGroup>
        );
      pathFormGroups = pathFormGroups.concat(pathEnvFormGroup);
      pathFormGroups = pathFormGroups.concat(<hr key={`hr${count}`} style={{ margin: '0em' }} />);
      count += 1;
    });
    return pathFormGroups;
  };

  if (environmentPathLoading) {
    console.log('environmentPathLoading');
    return <p>loading..</p>;
  }

  if (!environmentPathLoading) {
    console.log('environmentPath Loaded');
    const { results } = environmentPathResponse || {};
    return (
      <>
        <>{__(' will be created and automatically promoted to the ' +
          'Library environment. You can promote to other environments as well. ')}
        </>
        <Form>{buildformGroups(results)}</Form>
      </>
    );
  }
};

export default EnvironmentPaths;
