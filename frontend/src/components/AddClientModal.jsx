import React, { useState } from 'react'
import { SaveIcon } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { ReactSelect } from './Select'
import { Modal } from './Modal'
import { useTemplates } from '../hooks/useTemplates'

export const AddClientModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    placement_template_id: '',
    utm_template_id: '',
    campaign_template_id: '',
    cm360_instance_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all global templates
  const { templates: allGlobalTemplates } = useTemplates(null, null); // Fetch all types

  const placementTemplates = allGlobalTemplates.filter(t => t.type === 'placement' && t.is_global);
  const utmTemplates = allGlobalTemplates.filter(t => t.type === 'utm' && t.is_global);
  const campaignTemplates = allGlobalTemplates.filter(t => t.type === 'campaign' && t.is_global);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Client name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve template IDs to their full structures before saving
      const payload = {
        name: formData.name,
        placement_name_template: placementTemplates.find(t => t.id === formData.placement_template_id)?.template_structure || null,
        utm_structure: utmTemplates.find(t => t.id === formData.utm_template_id)?.template_structure || null,
        campaign_name_template: campaignTemplates.find(t => t.id === formData.campaign_template_id)?.template_structure || null,
        cm360_instance_id: formData.cm360_instance_id,
      };

      await onSave(payload);
      // Reset form
      setFormData({
        name: '',
        placement_template_id: '',
        campaign_template_id: '',
        utm_template_id: '',
        cm360_instance_id: ''
      });
      onClose();
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error creating client: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const placementTemplateOptions = placementTemplates.map(template => ({
    value: template.id,
    label: template.display_name,
  }));

  const utmTemplateOptions = utmTemplates.map(template => ({
    value: template.id,
    label: template.display_name,
  }));

  const campaignTemplateOptions = campaignTemplates.map(template => ({
    value: template.id,
    label: template.display_name,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Client Name"
          name="name" // Add name for form handling if needed
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter client name"
          required
          fullWidth
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-black border-b border-gray-200 pb-2">
            Template Selection
          </h3>

          <div>
            <ReactSelect
              label="Placement Template"
              options={[
                { value: '', label: 'No template (use default)' },
                ...placementTemplateOptions
              ]}
              value={placementTemplateOptions.find(opt => opt.value === formData.placement_template_id) || null}
              onChange={option => {
                const value = option ? option.value : '';
                handleChange('placement_template_id', value);
              }}
              fullWidth
            />
            {formData.placement_template_id && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {placementTemplateOptions.find(t => t.value === formData.placement_template_id)?.label}
              </p>
            )}
          </div>

          <div>
            <ReactSelect
              label="UTM Template"
              options={[
                { value: '', label: 'No template (use default)' },
                ...utmTemplateOptions
              ]}
              value={utmTemplateOptions.find(opt => opt.value === formData.utm_template_id) || null}
              onChange={option => {
                const value = option ? option.value : '';
                handleChange('utm_template_id', value);
              }}
              fullWidth
            />
            {formData.utm_template_id && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {utmTemplateOptions.find(t => t.value === formData.utm_template_id)?.label}
              </p>
            )}
          </div>

          <div>
            <ReactSelect
              label="Campaign Template"
              options={[
                { value: '', label: 'No template (use default)' },
                ...campaignTemplateOptions
              ]}
              value={campaignTemplateOptions.find(opt => opt.value === formData.campaign_template_id) || null}
              onChange={option => {
                const value = option ? option.value : '';
                handleChange('campaign_template_id', value);
              }}
              fullWidth
            />
            {formData.campaign_template_id && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {campaignTemplateOptions.find(t => t.value === formData.campaign_template_id)?.label}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Templates can be created and managed in the Templates section. 
              Only global templates are available when creating clients.
            </p>
          </div>
        </div>

        <Input
          label="CM360 Instance ID"
          name="cm360_instance_id"
          value={formData.cm360_instance_id}
          onChange={(e) => handleChange('cm360_instance_id', e.target.value)}
          placeholder="Enter CM360 instance ID (optional)"
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
            {isSubmitting ? 'Creating...' : 'Create Client'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}