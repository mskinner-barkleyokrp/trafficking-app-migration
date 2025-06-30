// src/components/EditClientModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SaveIcon, Loader2Icon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ReactSelect } from './Select'; // Corrected Import
import { Modal } from './Modal';
import { useTemplates } from '../hooks/useTemplates';

export const EditClientModal = ({ isOpen, onClose, onSave, client }) => {
  const [formData, setFormData] = useState({
    name: '',
    placement_template_id: '',
    utm_template_id: '',
    cm360_instance_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPlacementTemplateStructure, setSelectedPlacementTemplateStructure] = useState([]);
  const [selectedUtmTemplateStructure, setSelectedUtmTemplateStructure] = useState([]);

  // Hooks and helper functions are unchanged and correct.
  const clientIdForTemplateFetch = client?.id || null;
  const { templates: allPlacementTemplates, loading: loadingPlacementTemplates } = useTemplates(clientIdForTemplateFetch, 'placement');
  const { templates: allUtmTemplates, loading: loadingUtmTemplates } = useTemplates(clientIdForTemplateFetch, 'utm');

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        placement_template_id: client.placement_template_id || '',
        utm_template_id: client.utm_template_id || '',
        cm360_instance_id: client.cm360_instance_id || ''
      });
    }
  }, [client]);

  useEffect(() => {
    if (formData.placement_template_id && allPlacementTemplates.length > 0) {
      const foundTemplate = allPlacementTemplates.find(t => t.id === formData.placement_template_id);
      setSelectedPlacementTemplateStructure(foundTemplate?.template_structure || []);
    } else {
      setSelectedPlacementTemplateStructure([]);
    }
  }, [formData.placement_template_id, allPlacementTemplates]);

  useEffect(() => {
    if (formData.utm_template_id && allUtmTemplates.length > 0) {
      const foundTemplate = allUtmTemplates.find(t => t.id === formData.utm_template_id);
      // For UTM, the structure is nested inside 'components'
      setSelectedUtmTemplateStructure(foundTemplate?.template_structure?.components || []);
    } else {
      setSelectedUtmTemplateStructure([]);
    }
  }, [formData.utm_template_id, allUtmTemplates]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Client name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const payloadToSend = {
        name: formData.name,
        // The form now needs to reference the full template objects to get the structure
        placement_name_template: allPlacementTemplates.find(t => t.id === formData.placement_template_id)?.template_structure || null,
        utm_structure: allUtmTemplates.find(t => t.id === formData.utm_template_id)?.template_structure || null,
        cm360_instance_id: formData.cm360_instance_id || null,
      };
      await onSave(client.id, payloadToSend);
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client: ' + error.message);
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

  const generateHumanReadablePreview = useCallback((componentsArray) => {
    if (!Array.isArray(componentsArray) || componentsArray.length === 0) {
      return 'No template selected or structure is empty.';
    }
    return componentsArray.map((comp, index) => {
      let part = '';
      if (comp.type === 'field') {
        part = `{${comp.field}}`;
      } else if (comp.type === 'text') {
        part = comp.text || '';
      } else {
        part = `[unknown_type:${comp.type}]`;
      }
      if (index < componentsArray.length - 1) {
        part += comp.separator !== undefined ? comp.separator : '_';
      }
      return part;
    }).join('');
  }, []);

  const createTemplateOptions = (templates, type) => {
    if (!templates) return [{ value: '', label: `Loading ${type} templates...` }];
    const options = templates.map(template => ({
      value: template.id,
      label: `${template.name} ${template.is_global ? '(Global)' : ''}`
    }));
    return [{ value: '', label: `Select a default ${type} template...` }, ...options];
  };

  const placementTemplateOptions = useMemo(() => createTemplateOptions(allPlacementTemplates, 'placement'), [allPlacementTemplates]);
  const utmTemplateOptions = useMemo(() => createTemplateOptions(allUtmTemplates, 'UTM'), [allUtmTemplates]);
  const isLoadingAnyTemplates = loadingPlacementTemplates || loadingUtmTemplates;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Client: ${client?.name || ''}`}>
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
            Default Naming Convention Templates
          </h3>
          {isLoadingAnyTemplates && (
            <div className="flex items-center justify-center text-sm text-gray-500">
                <Loader2Icon className="animate-spin mr-2" size={16}/> Loading templates...
            </div>
          )}
          
          {/* --- CORRECTED: Placement Template Section --- */}
          <div>
            <ReactSelect
              label="Default Placement Template"
              options={placementTemplateOptions}
              value={placementTemplateOptions.find(opt => opt.value === formData.placement_template_id) || null}
              onChange={option => {
                const value = option ? option.value : '';
                handleChange('placement_template_id', value);
              }}
              fullWidth
              disabled={loadingPlacementTemplates}
              helperText="Sets the default placement naming template for this client."
            />
            <label className="mt-3 block text-sm font-medium text-gray-700">
                Selected Template Preview:
            </label>
            <div className="mt-1 p-2 bg-gray-100 border rounded text-xs font-mono min-h-[40px] flex items-center">
                {generateHumanReadablePreview(selectedPlacementTemplateStructure)}
            </div>
          </div>
          
          {/* --- CORRECTED: UTM Template Section --- */}
          <div>
            <ReactSelect
              label="Default UTM Template"
              options={utmTemplateOptions}
              value={utmTemplateOptions.find(opt => opt.value === formData.utm_template_id) || null}
              onChange={option => {
                const value = option ? option.value : '';
                handleChange('utm_template_id', value);
              }}
              fullWidth
              disabled={loadingUtmTemplates}
              helperText="Sets the default UTM generation template for this client."
            />
            <label className="mt-3 block text-sm font-medium text-gray-700">
                Selected Template Preview:
            </label>
             <div className="mt-1 p-2 bg-gray-100 border rounded text-xs font-mono min-h-[40px] flex items-center">
                {generateHumanReadablePreview(selectedUtmTemplateStructure)}
            </div>
          </div>
        </div>

        <Input
          label="CM360 Instance ID (Optional)"
          value={formData.cm360_instance_id}
          onChange={(e) => handleChange('cm360_instance_id', e.target.value)}
          placeholder="Enter CM360 instance ID"
          fullWidth
        />

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="secondary" icon={<SaveIcon size={16} />} disabled={isSubmitting || isLoadingAnyTemplates}>
            {isSubmitting ? 'Updating...' : 'Update Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};