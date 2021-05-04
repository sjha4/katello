import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { STATUS } from 'foremanReact/constants';
import PropTypes from 'prop-types';
import { Wizard } from '@patternfly/react-core';
import { translate as __ } from 'foremanReact/common/I18n';
import CVPublishForm from './CVPublishForm';
import CVPublishFinish from './CVPublishFinish';
import getEnvironmentPaths from '../components/EnvironmentPaths/EnvironmentPathActions';

const PublishContentViewWizard = ({ details, show, setIsOpen }) => {
  const { name, id: cvId } = details;
  const [description, setDescription] = useState('');
  const [checkedItems, setCheckedItems] = useState([]);
  const [promote, setPromote] = useState(false);
  const dispatch = useDispatch();

  const steps = [
    {
      name: 'Publish',
      component: <CVPublishForm
        description={description}
        setDescription={setDescription}
        details={details}
        checkedItems={checkedItems}
        setCheckedItems={setCheckedItems}
        promote={promote}
        setPromote={setPromote}
      />,
    },
    { name: 'Review', component: <p />, nextButtonText: 'Finish' },
    { name: 'Finish', component: <CVPublishFinish description={description} checkedItems={checkedItems} cvId={cvId} show={show} setIsOpen={setIsOpen} />, isFinishedStep: true },
  ];

  useEffect(
    () => {
      console.log('Dispatched getEnvironmentPaths');
      dispatch(getEnvironmentPaths());
    },
    [],
  );

  return (
    <Wizard
      title={__('Publish')}
      description={__(`Determining settings for ${name}`)}
      height="400"
      width="100"
      steps={steps}
      startAtStep={0}
      onClose={() => {
        setIsOpen(false);
      }}
      onSave={() => {
        console.log('On Save Called');
        setIsOpen(false);
      }}
      isOpen={show}
      appendTo={document.body}
    />
  );
};

PublishContentViewWizard.propTypes = {
  cvId: PropTypes.number,
  cvName: PropTypes.string,
  show: PropTypes.bool,
  setIsOpen: PropTypes.func,
};

PublishContentViewWizard.defaultProps = {
  show: false,
  setIsOpen: null,
};

export default PublishContentViewWizard;
