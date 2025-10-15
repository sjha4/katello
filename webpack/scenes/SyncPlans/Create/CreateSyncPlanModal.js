import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { translate as __ } from 'foremanReact/common/I18n';
import {
  Modal,
  ModalVariant,
  Button,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  DatePicker,
  TimePicker,
  Checkbox,
} from '@patternfly/react-core';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core/deprecated';
import { createSyncPlan } from '../SyncPlansActions';
import { SYNC_PLAN_INTERVALS } from '../SyncPlansConstants';
import { urlBuilder } from 'foremanReact/common/urlHelpers';

const CreateSyncPlanModal = ({ show, setIsOpen, onSuccess }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [interval, setTInterval] = useState('hourly');
  const [cronExpression, setCronExpression] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('00:00');
  const [enabled, setEnabled] = useState(true);
  const [isIntervalSelectOpen, setIsIntervalSelectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleClose = () => {
    setIsOpen(false);
    // Reset form
    setName('');
    setDescription('');
    setTInterval('hourly');
    setCronExpression('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setStartTime('00:00');
    setEnabled(true);
    setErrors({});
  };

  const handleSubmit = () => {
    // Validate
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = __('Name is required');
    }
    if (!interval) {
      newErrors.interval = __('Interval is required');
    }
    if (interval === 'custom cron' && !cronExpression.trim()) {
      newErrors.cronExpression = __('Cron expression is required for custom cron interval');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Combine date and time
    const [hours, minutes] = startTime.split(':');
    const syncDateTime = new Date(startDate);
    syncDateTime.setHours(parseInt(hours, 10));
    syncDateTime.setMinutes(parseInt(minutes, 10));
    syncDateTime.setSeconds(0);

    const params = {
      name,
      description,
      interval,
      sync_date: syncDateTime.toString(),
      enabled,
    };

    if (interval === 'custom cron') {
      params.cron_expression = cronExpression;
    }

    setIsSubmitting(true);

    dispatch(createSyncPlan(
      params,
      (response) => {
        setIsSubmitting(false);
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
        // Navigate to the details page
        const syncPlanId = response.data.id;
        history.push(urlBuilder('sync_plans', '') + syncPlanId);
      },
      (error) => {
        setIsSubmitting(false);
        // Handle validation errors from the server
        if (error?.response?.data?.errors) {
          const serverErrors = {};
          Object.keys(error.response.data.errors).forEach((field) => {
            serverErrors[field] = error.response.data.errors[field].join(', ');
          });
          setErrors(serverErrors);
        }
      },
    ));
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      title={__('Create sync plan')}
      isOpen={show}
      onClose={handleClose}
      actions={[
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {__('Create')}
        </Button>,
        <Button
          key="cancel"
          variant="link"
          onClick={handleClose}
          isDisabled={isSubmitting}
        >
          {__('Cancel')}
        </Button>,
      ]}
    >
      <Form>
        <FormGroup
          label={__('Name')}
          isRequired
          fieldId="sync-plan-name"
          validated={errors.name ? 'error' : 'default'}
          helperTextInvalid={errors.name}
        >
          <TextInput
            isRequired
            type="text"
            id="sync-plan-name"
            name="name"
            value={name}
            onChange={(event, value) => {
              setName(value);
              if (errors.name) {
                setErrors({ ...errors, name: undefined });
              }
            }}
            validated={errors.name ? 'error' : 'default'}
          />
        </FormGroup>

        <FormGroup
          label={__('Description')}
          fieldId="sync-plan-description"
        >
          <TextArea
            type="text"
            id="sync-plan-description"
            name="description"
            value={description}
            onChange={(event, value) => setDescription(value)}
          />
        </FormGroup>

        <FormGroup
          label={__('Interval')}
          isRequired
          fieldId="sync-plan-interval"
          validated={errors.interval ? 'error' : 'default'}
          helperTextInvalid={errors.interval}
        >
          <Select
            variant={SelectVariant.single}
            onToggle={(_event, isOpen) => setIsIntervalSelectOpen(isOpen)}
            onSelect={(event, selection) => {
              setTInterval(selection);
              setIsIntervalSelectOpen(false);
              if (errors.interval) {
                setErrors({ ...errors, interval: undefined });
              }
            }}
            selections={interval}
            isOpen={isIntervalSelectOpen}
            aria-label={__('Select interval')}
            validated={errors.interval ? 'error' : 'default'}
          >
            {SYNC_PLAN_INTERVALS.map(option => (
              <SelectOption key={option.id} value={option.id}>
                {option.label}
              </SelectOption>
            ))}
          </Select>
        </FormGroup>

        {interval === 'custom cron' && (
          <FormGroup
            label={__('Cron expression')}
            isRequired
            fieldId="sync-plan-cron"
            validated={errors.cronExpression ? 'error' : 'default'}
            helperTextInvalid={errors.cronExpression}
          >
            <TextInput
              type="text"
              id="sync-plan-cron"
              name="cronExpression"
              value={cronExpression}
              onChange={(event, value) => {
                setCronExpression(value);
                if (errors.cronExpression) {
                  setErrors({ ...errors, cronExpression: undefined });
                }
              }}
              validated={errors.cronExpression ? 'error' : 'default'}
            />
          </FormGroup>
        )}

        <FormGroup
          label={__('Start date')}
          isRequired
          fieldId="sync-plan-start-date"
        >
          <DatePicker
            value={startDate}
            onChange={(event, str) => setStartDate(str)}
            aria-label={__('Start date')}
          />
        </FormGroup>

        <FormGroup
          label={__('Start time')}
          isRequired
          fieldId="sync-plan-start-time"
          helperText={__('The time the sync should happen in your current time zone.')}
        >
          <TimePicker
            time={startTime}
            onChange={(event, time) => setStartTime(time)}
            is24Hour
            aria-label={__('Start time')}
          />
        </FormGroup>

        <FormGroup fieldId="sync-plan-enabled">
          <Checkbox
            id="sync-plan-enabled"
            label={__('Sync enabled')}
            isChecked={enabled}
            onChange={(event, checked) => setEnabled(checked)}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

CreateSyncPlanModal.propTypes = {
  show: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

CreateSyncPlanModal.defaultProps = {
  onSuccess: undefined,
};

export default CreateSyncPlanModal;