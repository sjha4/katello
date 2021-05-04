import { STATUS } from 'foremanReact/constants';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import {
  selectPublishContentViewError, selectPublishContentViews,
  selectPublishContentViewStatus,
} from './ContentViewPublishSelectors';
import getContentViews, { publishContentView } from '../ContentViewsActions';
import Loading from '../../../components/Loading';
import EmptyStateMessage from '../../../components/Table/EmptyStateMessage';
import getContentViewDetails from '../Details/ContentViewDetailActions';


const CVPublishFinish = ({
  cvId, checkedItems, description, show, setIsOpen,
}) => {
  const dispatch = useDispatch();
  const [redirect, setRedirect] = useState(false);
  const [saving, setSaving] = useState(true);
  const response = useSelector(selectPublishContentViews);
  const status = useSelector(selectPublishContentViewStatus);
  const error = useSelector(selectPublishContentViewError);

  useEffect(() => {
    console.log('Called on finish click!');
    setSaving(true);
    dispatch(publishContentView({
      id: cvId,
      description,
      environment_ids: checkedItems,
    }));
  }, []);

  useEffect(() => {
    console.log('Called response handler');
    setSaving(true);
    const { id } = response;
    if (id && status === STATUS.RESOLVED) {
      setSaving(false);
      dispatch(getContentViewDetails(cvId));
      dispatch(getContentViews);
      setRedirect(true);
      setIsOpen(false);
      console.log('STATUS.RESOLVED');
    } else if (status === STATUS.ERROR) {
      setSaving(false);
      console.log('STATUS.ERROR');
    }
  }, [JSON.stringify(response), status]);

  if (saving) {
    return <Loading />;
  }
  if (redirect) {
    return (<Redirect to={`/labs/content_views/${cvId}`} />);
  }
  if (status === STATUS.PENDING) return (<Loading />);
  if (status === STATUS.ERROR) return (<EmptyStateMessage error={error} />);
};

CVPublishFinish.propTypes = {
  cvId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  description: PropTypes.string,
};

CVPublishFinish.defaultProps = {
  cvId: null,
  description: null,
};


export default CVPublishFinish;
