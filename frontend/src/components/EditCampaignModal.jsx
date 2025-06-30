import React, { useState, useEffect } from 'react'
import { SaveIcon } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { ReactSelect } from './Select'
import { Modal } from './Modal'

export const EditCampaignModal = ({ isOpen, onClose, onSave, campaign, clients = [] }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    start_date: '',
    end_date: '',
    status: 'active'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when campaign changes
  useEffect(() => {
    if (campaign) {
      setFormData({
        client_id: campaign.client_id || '',
        name: campaign.name || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        status: campaign.status || 'active'
      })
    }
  }, [campaign])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.client_id || !formData.name.trim()) {
      alert('Client and campaign name are required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(campaign.id, formData)
      onClose()
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Error updating campaign: ' + error.message)
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

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }))

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'draft', label: 'Draft' },
    { value: 'completed', label: 'Completed' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Campaign">
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
            {isSubmitting ? 'Updating...' : 'Update Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}