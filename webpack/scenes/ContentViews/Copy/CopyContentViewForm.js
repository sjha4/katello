import { STATUS } from 'foremanReact/constants';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { Form, FormGroup, TextInput, TextArea, Checkbox, Radio, ActionGroup, Button } from '@patternfly/react-core';
import CreateContentViewForm from "../Create/CreateContentViewForm";

const CopyContentViewForm = ( {setModalOpen} ) => {
  const [name, setName] = useState('');
  return (
    <Form>
      <FormGroup label="Name" isRequired fieldId="name">
        <TextInput
          isRequired
          type="text"
          id="name"
          aria-label="input_name"
          name="name"
          value={name}
          onChange={value => setName(value)}
        />
      </FormGroup>
      <ActionGroup>
        <Button aria-label="copy_content_view" variant="primary" onClick={console.log("saving!!")}>Copy Content View</Button>
        <Button variant="link" onClick={() => setModalOpen(false)}>Cancel</Button>
      </ActionGroup>
    </Form>
  )
};

CopyContentViewForm.propTypes = {
  setModalOpen: PropTypes.func,
};

CopyContentViewForm.defaultProps = {
  setModalOpen: null,
};


export default CopyContentViewForm;