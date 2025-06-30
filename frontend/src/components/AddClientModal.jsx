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
    campaign_template_id: '',
    utm_template_id: '',
    cm360_instance_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get global templates (available to all clients)
  const { templates: placementTemplates = [] } = useTemplates('', 'placement')
  const { templates: campaignTemplates = [] } = useTemplates('', 'campaign')
  const { templates: utmTemplates = [] } = useTemplates('', 'utm')

  // Filter for global templates only (where client field is null/empty)
  const globalPlacementTemplates = placementTemplates.filter(t => !t.client)
  const globalCampaignTemplates = campaignTemplates.filter(t => !t.client)
  const globalUtmTemplates = utmTemplates.filter(t => !t.client)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Client name is required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      // Reset form
      setFormData({
        name: '',
        placement_template_id: '',
        campaign_template_id: '',
        utm_template_id: '',
        cm360_instance_id: ''
      })
      onClose()
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Error creating client: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const placementTemplateOptions = globalPlacementTemplates.map(template => ({
    value: template.id,
    label: template.display_name
  }))

  const campaignTemplateOptions = globalCampaignTemplates.map(template => ({
    value: template.id,
    label: template.display_name
  }))

  const utmTemplateOptions = globalUtmTemplates.map(template => ({
    value: template.id,
    label: template.display_name
  }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Client Name"
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
              value={formData.placement_template_id}
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
              label="Campaign Template"
              options={[
                { value: '', label: 'No template (use default)' },
                ...campaignTemplateOptions
              ]}
              value={formData.campaign_template_id}
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

          <div>
            <ReactSelect
              label="UTM Template"
              options={[
                { value: '', label: 'No template (use default)' },
                ...utmTemplateOptions
              ]}
              value={formData.utm_template_id}
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

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Templates can be created and managed in the Templates section. 
              Only global templates are available when creating clients.
            </p>
          </div>
        </div>

        <Input
          label="CM360 Instance ID"
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