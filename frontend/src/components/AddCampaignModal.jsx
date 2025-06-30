// src/components/AddCampaignModal.jsx
import React, { useState, useEffect } from 'react'; // Ensure useEffect is imported if you use it
import { SaveIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ReactSelect } from './Select';
import { Modal } from './Modal';

export const AddCampaignModal = ({ isOpen, onClose, onSave, clients = [] }) => {
  const [formData, setFormData] = useState({
    client_id: '', // Default to empty string, forcing user selection
    name: '',
    start_date: '',
    end_date: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal is opened/closed or when clients prop changes (if necessary)
  useEffect(() => {
    if (isOpen) {
      setFormData({
        client_id: '', // Reset to ensure placeholder is shown
        name: '',
        start_date: '',
        end_date: '',
        status: 'active'
      });
    }
  }, [isOpen]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting formData:', JSON.stringify(formData, null, 2));
    if (!formData.client_id || !formData.name.trim()) {
      alert('Client and campaign name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      // No need to reset form here if useEffect on `isOpen` handles it.
      // If not, reset it:
      // setFormData({ client_id: '', name: '', ... });
      onClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add a placeholder option
  const clientOptions = [
    { value: '', label: 'Select a Client...' },
    ...clients.map(client => ({
      value: client.id,
      label: client.name
    }))
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'draft', label: 'Draft' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Campaign">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ReactSelect
          label="Client"
          options={clientOptions}
          value={formData.client_id}
          onChange={option => {
            const value = option ? option.value : '';
            handleChange('client_id', value);
          }}
          required
          fullWidth
        />

        {/* ... other inputs ... */}

        <Input
          label="Campaign Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter campaign name"
          required
          fullWidth
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            fullWidth
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            fullWidth
          />
        </div>

        <ReactSelect
          label="Status"
          options={statusOptions}
          value={formData.status}
          onChange={option => {
            const value = option ? option.value : '';
            handleChange('status', value);
          }}
          fullWidth
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            icon={<SaveIcon size={16} />}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};