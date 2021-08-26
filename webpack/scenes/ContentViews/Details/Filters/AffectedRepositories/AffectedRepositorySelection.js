import React, { useState } from 'react';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Modal, ModalVariant, Form, FormGroup, TextInput, ActionGroup, Button, Radio, TextArea,
  Split, SplitItem, Select, SelectOption } from '@patternfly/react-core';
import { translate as __ } from 'foremanReact/common/I18n';
import {selectCVFilterDetails, selectCVFilterDetailStatus} from "../../ContentViewDetailSelectors";
import {editCVFilter, getCVFilterDetails} from "../../ContentViewDetailActions";
import getContentViewDetails from "../../ContentViewDetailActions";

const AffectedRepositorySelection = ({cvId, filterId, setShowAffectedRepos}) => {
  const dispatch = useDispatch();
  const response = useSelector(state => selectCVFilterDetails(state, cvId, filterId), shallowEqual);
  const {repositories = []} = response;
  const [type, setType] = useState(repositories.length? "affect_repos": "all_repos");
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);

  const onSelect = (event, selection) => {
    if(selection === "all_repos") {
      console.log("Set to all repos");
      setShowAffectedRepos(false);
      dispatch(editCVFilter(
        filterId,
        { id: filterId, repository_ids: [] },
        () => {
          dispatch(getCVFilterDetails(cvId, filterId));
        },
      ));
    }
    if(selection === "affect_repos") {
      setShowAffectedRepos(true);
    }
    setType(selection);
    setTypeSelectOpen(false);
  };

  return (
    <Select
      selections={type}
      onSelect={onSelect}
      isOpen={typeSelectOpen}
      onToggle={isExpanded => setTypeSelectOpen(isExpanded)}
      id="affect_repos"
      name="affect_repos"
      aria-label="affect_repos"
    >
      <SelectOption key={"all_repos"} value={"all_repos"}>{__("Apply to all repositories in the CV")}</SelectOption>
      <SelectOption key={"affect_repos"} value={"affect_repos"}>{__("Apply to subset of repositories")}</SelectOption>
    </Select>
  )
};

export default AffectedRepositorySelection;