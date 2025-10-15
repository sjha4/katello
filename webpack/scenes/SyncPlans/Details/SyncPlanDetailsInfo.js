import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { translate as __ } from 'foremanReact/common/I18n';
import LongDateTime from 'foremanReact/components/common/dates/LongDateTime';
import { STATUS } from 'foremanReact/constants';
import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Button,
  Flex,
  FlexItem,
  Spinner,
  Select,
  SelectOption,
  SelectVariant,
  TextInput,
  TextArea,
  DatePicker,
  TimePicker,
  Checkbox,
  ActionList,
  ActionListItem,
} from '@patternfly/react-core';
import { PencilAltIcon, CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { updateSyncPlan } from '../SyncPlansActions';
import { SYNC_PLAN_INTERVALS } from '../SyncPlansConstants';

const SyncPlanDetailsInfo = ({
  syncPlan, status, onUpdate, onDelete, onRunSync,
}) => {
  const dispatch = useDispatch();
  const [editMode, setEditMode] = useState({});
  const [formData, setFormData] = useState({});
  const [isIntervalSelectOpen, setIsIntervalSelectOpen] = useState(false);

  useEffect(() => {
    if (syncPlan) {
      const syncDateTime = syncPlan.sync_date ? new Date(syncPlan.sync_date) : new Date();
      setFormData({
        name: syncPlan.name || '',
        description: syncPlan.description || '',
        interval: syncPlan.interval || 'hourly',
        cronExpression: syncPlan.cron_expression || '',
        syncDate: syncDateTime.toISOString().split('T')[0],
        syncTime: `${String(syncDateTime.getHours()).padStart(2, '0')}:${String(syncDateTime.getMinutes()).padStart(2, '0')}`,
        enabled: syncPlan.enabled !== undefined ? syncPlan.enabled : true,
      });
    }
  }, [syncPlan]);

  const isLoading = status === STATUS.PENDING;

  const handleEdit = (field) => {
    setEditMode({ ...editMode, [field]: true });
  };

  const handleCancel = (field) => {
    // Reset to original value
    if (syncPlan) {
      const syncDateTime = syncPlan.sync_date ? new Date(syncPlan.sync_date) : new Date();
      setFormData({
        ...formData,
        [field]: field === 'syncDate' ? syncDateTime.toISOString().split('T')[0] :
          field === 'syncTime' ? `${String(syncDateTime.getHours()).padStart(2, '0')}:${String(syncDateTime.getMinutes()).padStart(2, '0')}` :
            syncPlan[field] || '',
      });
    }
    setEditMode({ ...editMode, [field]: false });
  };

  const handleSave = (field) => {
    const params = {};

    if (field === 'syncDate' || field === 'syncTime') {
      // Combine date and time
      const [hours, minutes] = formData.syncTime.split(':');
      const syncDateTime = new Date(formData.syncDate);
      syncDateTime.setHours(parseInt(hours, 10));
      syncDateTime.setMinutes(parseInt(minutes, 10));
      syncDateTime.setSeconds(0);
      params.sync_date = syncDateTime.toString();
    } else if (field === 'cronExpression') {
      params.cron_expression = formData.cronExpression;
    } else {
      params[field] = formData[field];
    }

    dispatch(updateSyncPlan(syncPlan.id, params, () => {
      setEditMode({ ...editMode, [field]: false });
      if (onUpdate) onUpdate();
    }));
  };

  const renderEditableField = (field, label, value, type = 'text') => {
    const isEditing = editMode[field];

    return (
      <DescriptionListGroup>
        <DescriptionListTerm>{label}</DescriptionListTerm>
        <DescriptionListDescription>
          {isEditing ? (
            <Flex>
              <FlexItem flex={{ default: 'flex_1' }}>
                {type === 'textarea' ? (
                  <TextArea
                    value={formData[field]}
                    onChange={(event, val) => setFormData({ ...formData, [field]: val })}
                  />
                ) : type === 'select' ? (
                  <Select
                    variant={SelectVariant.single}
                    onToggle={(_event, isOpen) => setIsIntervalSelectOpen(isOpen)}
                    onSelect={(event, selection) => {
                      setFormData({ ...formData, [field]: selection });
                      setIsIntervalSelectOpen(false);
                    }}
                    selections={formData[field]}
                    isOpen={isIntervalSelectOpen}
                  >
                    {SYNC_PLAN_INTERVALS.map(option => (
                      <SelectOption key={option.id} value={option.id}>
                        {option.label}
                      </SelectOption>
                    ))}
                  </Select>
                ) : type === 'date' ? (
                  <DatePicker
                    value={formData[field]}
                    onChange={(event, str) => setFormData({ ...formData, [field]: str })}
                  />
                ) : type === 'time' ? (
                  <TimePicker
                    time={formData[field]}
                    onChange={(event, time) => setFormData({ ...formData, [field]: time })}
                    is24Hour
                  />
                ) : type === 'checkbox' ? (
                  <Checkbox
                    id={`edit-${field}`}
                    isChecked={formData[field]}
                    onChange={(event, checked) => setFormData({ ...formData, [field]: checked })}
                  />
                ) : (
                  <TextInput
                    value={formData[field]}
                    onChange={(event, val) => setFormData({ ...formData, [field]: val })}
                  />
                )}
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  aria-label="Save"
                  onClick={() => handleSave(field)}
                  icon={<CheckIcon />}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  aria-label="Cancel"
                  onClick={() => handleCancel(field)}
                  icon={<TimesIcon />}
                />
              </FlexItem>
            </Flex>
          ) : (
            <Flex>
              <FlexItem flex={{ default: 'flex_1' }}>
                {type === 'checkbox' ? (
                  value ? __('Yes') : __('No')
                ) : type === 'date' || type === 'datetime' ? (
                  value ? <LongDateTime date={value} /> : ''
                ) : (
                  value || __('Not set')
                )}
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  aria-label="Edit"
                  onClick={() => handleEdit(field)}
                  icon={<PencilAltIcon />}
                />
              </FlexItem>
            </Flex>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>
        <Flex>
          <FlexItem flex={{ default: 'flex_1' }}>
            {__('Sync plan details')}
          </FlexItem>
          <FlexItem>
            <ActionList>
              <ActionListItem>
                <Button variant="secondary" onClick={onRunSync}>
                  {__('Run sync')}
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button variant="danger" onClick={onDelete}>
                  {__('Delete')}
                </Button>
              </ActionListItem>
            </ActionList>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <DescriptionList isHorizontal>
          {renderEditableField('name', __('Name'), syncPlan.name)}
          {renderEditableField('description', __('Description'), syncPlan.description, 'textarea')}
          {renderEditableField('syncDate', __('Start date'), syncPlan.sync_date, 'date')}
          {renderEditableField('syncTime', __('Start time'), syncPlan.sync_date, 'time')}
          <DescriptionListGroup>
            <DescriptionListTerm>{__('Next sync')}</DescriptionListTerm>
            <DescriptionListDescription>
              {syncPlan.next_sync ? (
                <LongDateTime date={syncPlan.next_sync} showRelativeTimeTooltip />
              ) : (
                __('Not scheduled')
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {syncPlan.foreman_tasks_recurring_logic_id && (
            <DescriptionListGroup>
              <DescriptionListTerm>{__('Recurring logic')}</DescriptionListTerm>
              <DescriptionListDescription>
                <a href={`/foreman_tasks/recurring_logics/${syncPlan.foreman_tasks_recurring_logic_id}`}>
                  {syncPlan.foreman_tasks_recurring_logic_id}
                </a>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {renderEditableField('enabled', __('Sync enabled'), syncPlan.enabled, 'checkbox')}
          {renderEditableField('interval', __('Interval'), syncPlan.interval, 'select')}
          {formData.interval === 'custom cron' &&
            renderEditableField('cronExpression', __('Cron expression'), syncPlan.cron_expression)}
          <DescriptionListGroup>
            <DescriptionListTerm>{__('Products')}</DescriptionListTerm>
            <DescriptionListDescription>
              {syncPlan.products?.length || 0}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

SyncPlanDetailsInfo.propTypes = {
  syncPlan: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    description: PropTypes.string,
    sync_date: PropTypes.string,
    next_sync: PropTypes.string,
    enabled: PropTypes.bool,
    interval: PropTypes.string,
    cron_expression: PropTypes.string,
    foreman_tasks_recurring_logic_id: PropTypes.number,
    products: PropTypes.arrayOf(PropTypes.shape({})),
  }),
  status: PropTypes.string,
  onUpdate: PropTypes.func,
  onDelete: PropTypes.func,
  onRunSync: PropTypes.func,
};

SyncPlanDetailsInfo.defaultProps = {
  syncPlan: {},
  status: undefined,
  onUpdate: undefined,
  onDelete: undefined,
  onRunSync: undefined,
};

export default SyncPlanDetailsInfo;