import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SaveIcon, PlusIcon, InfoIcon, Loader2Icon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ReactSelect } from './Select';
import { Modal } from './Modal';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { useTemplates } from '../hooks/useTemplates';
import { useCampaigns } from '../hooks/useCampaigns';
import { apiClient } from '../lib/api';
import { TEMPLATE_FIELDS } from './TemplateBuilder';

const generateCampaignNameForRow = (rowData, templateStructure, client) => {
  if (!Array.isArray(templateStructure) || templateStructure.length === 0 || !rowData) {
    return 'Cannot generate name: No template selected.';
  }
  const currentClientName = client?.name || '';

  return templateStructure
    .map((component, index) => {
      let partValue = '';
      if (component.type === 'field') {
        partValue = rowData[component.field] || (component.field === 'client' ? currentClientName : `{${component.field}}`);
      } else {
        partValue = component.text || '';
      }

      const separator = index < templateStructure.length - 1 ? (component.separator === undefined ? '_' : component.separator) : '';
      return partValue + separator;
    })
    .join('');
};

export const AddCampaignModal = ({ isOpen, onClose, onSave, clients = [], preselectedClientId }) => {
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [campaignData, setCampaignData] = useState([{}]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { templates: availableTemplates, loading: templatesLoading } = useTemplates(selectedClientId, 'campaign');

  const activeTemplate = useMemo(() => {
    return availableTemplates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, availableTemplates]);

  const activeTemplateStructure = useMemo(() => activeTemplate?.template_structure || [], [activeTemplate]);

  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(preselectedClientId || '');
      setCampaignData([{}]);
      setSelectedTemplateId('');
    }
  }, [isOpen, preselectedClientId]);

  useEffect(() => {
    if (selectedClientId && availableTemplates.length > 0) {
      // Auto-select the client-specific template if one exists
      const clientTemplate = availableTemplates.find(t => t.client === selectedClientId);
      if (clientTemplate) {
        setSelectedTemplateId(clientTemplate.id);
      } else {
        // Fallback to the first global one if no client-specific one found
        const globalTemplate = availableTemplates.find(t => t.is_global);
        setSelectedTemplateId(globalTemplate?.id || '');
      }
    } else {
      setSelectedTemplateId('');
    }
  }, [selectedClientId, availableTemplates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId || !selectedTemplateId) {
      alert('Client and Campaign Template must be selected.');
      return;
    }

    const validCampaigns = campaignData
      .filter(row => Object.values(row).some(val => val)) // Filter out completely empty rows
      .map(row => ({
        client_id: selectedClientId,
        name: generateCampaignNameForRow(row, activeTemplateStructure, clients.find(c => c.id === selectedClientId)),
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        status: 'active', // FIX: Changed from 'draft' to 'active' to match DB enum
      }));

    if (validCampaigns.length === 0) {
      alert('No valid campaign data to save.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Directly call the onSave (createCampaign) for each valid campaign.
      for (const campaign of validCampaigns) {
        await onSave(campaign);
      }
      onClose(); // Close modal on success
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }    
  };
  
  const campaignBuilderColumns = useMemo(() => {
    if (!selectedTemplateId) return [{ id: 'info', header: 'Please select a campaign template.' }];
    if (templatesLoading) return [{ id: 'loading', header: 'Loading template...' }];
    
    // Add default fields if they are not in the template, like start/end date
    let columns = activeTemplateStructure
      .filter(c => c.type === 'field')
      .map(c => {
        const fieldConfig = TEMPLATE_FIELDS[c.field] || {};
        return {
          id: c.field,
          header: (c.header || fieldConfig.label) + (c.required ? ' *' : ''),
          accessor: c.field,
          type: c.dataType || 'text',
          required: c.required,
          placeholder: c.placeholder || `Enter ${c.header || fieldConfig.label}`
        };
      });

    if (!columns.some(c => c.accessor === 'start_date')) {
      columns.push({ id: 'start_date', header: 'Start Date', accessor: 'start_date', type: 'date' });
    }
    if (!columns.some(c => c.accessor === 'end_date')) {
      columns.push({ id: 'end_date', header: 'End Date', accessor: 'end_date', type: 'date' });
    }

    return columns;
  }, [selectedTemplateId, templatesLoading, activeTemplateStructure]);

  const clientOptions = useMemo(() => [{ value: '', label: 'Select a Client...' }, ...clients.map(c => ({ value: c.id, label: c.name }))], [clients]);
  const templateOptions = useMemo(() => [{ value: '', label: 'Select a Template...' }, ...availableTemplates.map(t => ({ value: t.id, label: `${t.name} ${t.is_global ? '(Global)' : ''}` }))], [availableTemplates]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Builder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <ReactSelect
            label="Client"
            options={clientOptions}
            value={clientOptions.find(opt => opt.value === selectedClientId) || null}
            onChange={opt => setSelectedClientId(opt ? opt.value : '')}
            required
            fullWidth
          />
          <ReactSelect
            label="Campaign Template"
            options={templateOptions}
            value={templateOptions.find(opt => opt.value === selectedTemplateId) || null}
            onChange={opt => setSelectedTemplateId(opt ? opt.value : '')}
            required
            fullWidth
            disabled={!selectedClientId || templatesLoading}
          />
        </div>

        {templatesLoading && <div className="text-sm text-gray-500 flex items-center"><Loader2Icon className="animate-spin mr-2"/>Loading templates...</div>}

        {activeTemplate && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              <InfoIcon size={18} className="inline mr-2" />
              Using template: <strong>{activeTemplate.name}</strong>
          </div>
        )}
        
        <div>
          <SpreadsheetGrid
            columns={campaignBuilderColumns}
            data={campaignData}
            onChange={setCampaignData}
            minRows={1}
            addRowText="Add Campaign"
          />
        </div>

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
            disabled={isSubmitting || !selectedClientId || !selectedTemplateId}
          >
            {isSubmitting ? 'Creating...' : 'Create Campaigns'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};