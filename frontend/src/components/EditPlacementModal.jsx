// src/components/EditPlacementModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { SaveIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ReactSelect } from './Select'; // Corrected Import
import { Modal } from './Modal';
import { TEMPLATE_FIELDS } from './TemplateBuilder';

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        if (/^\d{2}\.\d{2}\.\d{2}$/.test(dateString)) {
            const parts = dateString.split('.');
            const month = parts[0];
            const day = parts[1];
            const yearSuffix = parts[2];
            const fullYear = parseInt(yearSuffix, 10) + (parseInt(yearSuffix, 10) < 70 ? 2000 : 1900);
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return '';
    }
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const EditPlacementModal = ({
  isOpen,
  onClose,
  onSave,
  placement,
  templateStructure,
  legendOptionsMap,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen && placement) {
      const initialFormData = {};
      if (Array.isArray(templateStructure) && templateStructure.length > 0) {
        templateStructure.forEach(component => {
          if (component && component.field && component.type === 'field') {
            const fieldKey = component.field;
            const valueFromPlacement = placement[fieldKey];
            initialFormData[fieldKey] = component.dataType === 'date'
              ? formatDateForInput(valueFromPlacement)
              : (valueFromPlacement !== undefined ? valueFromPlacement : '');
          }
        });
      }

      ['rate_type', 'start_date', 'end_date', 'status'].forEach(commonField => {
        if (placement.hasOwnProperty(commonField)) {
           if (!initialFormData.hasOwnProperty(commonField) || !(Array.isArray(templateStructure) && templateStructure.length > 0)) {
             initialFormData[commonField] = commonField.includes('_date')
            ? formatDateForInput(placement[commonField])
            : placement[commonField];
           }
        } else if (commonField === 'status' && !initialFormData.status) {
            initialFormData.status = 'draft';
        }
      });
      setFormData(initialFormData);
    } else if (!isOpen) {
      setFormData({});
    }
  }, [isOpen, placement, templateStructure]);


  const rateTypes = useMemo(() => [
    { value: '', label: 'Select Rate Type...' },
    { value: 'cpm', label: 'CPM' }, { value: 'cpc', label: 'CPC' }, { value: 'cpa', label: 'CPA' },
    { value: 'cpv', label: 'CPV' }, { value: 'cpl', label: 'CPL' }, { value: 'flat', label: 'Flat Fee'}
  ], []);

  const statusOptions = useMemo(() => [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ], []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Array.isArray(templateStructure)) {
        for (const component of templateStructure) {
            if (component && component.field && component.type === 'field' && component.required) {
                if (!formData[component.field] || formData[component.field].toString().trim() === '') {
                    const label = component.header || TEMPLATE_FIELDS[component.field]?.label || component.field;
                    alert(`${label.replace(' *', '')} is required.`);
                    return;
                }
            }
        }
    }
    const finalFormData = { ...formData };
    if (!finalFormData.status) finalFormData.status = 'draft';
    await onSave(placement.id, finalFormData);
  };

  const renderFormField = (componentConfig) => {
    if (!componentConfig || !componentConfig.field) {
        return null;
    }

    const fieldKey = componentConfig.field;
    const labelText = (componentConfig.header || TEMPLATE_FIELDS[fieldKey]?.label || fieldKey).replace(' *', '');
    const placeholder = componentConfig.placeholder || TEMPLATE_FIELDS[fieldKey]?.description || '';
    const isRequired = componentConfig.required !== undefined ? componentConfig.required : false;
    const currentFieldValue = formData[fieldKey] !== undefined ? formData[fieldKey] : '';

    let fieldToRender;
    let options = [];

    // --- CORRECTED: The Select rendering logic is now unified ---
    if (componentConfig.dataType === 'database_lookup' || componentConfig.dataType === 'select') {
      if (componentConfig.dataType === 'database_lookup') {
        if (componentConfig.legendCategory && legendOptionsMap) {
            options = [{label: `Select ${labelText}...`, value: ''}, ...(legendOptionsMap[componentConfig.legendCategory] || [])];
        } else {
            options = [{label: `Error: Config missing for ${labelText}`, value: ''}];
        }
      } else { // 'select'
        if (componentConfig.customOptions) {
            options = [{label: `Select ${labelText}...`, value: ''}, ...componentConfig.customOptions.split(',').map(opt => ({ label: opt.trim(), value: opt.trim() }))];
        } else if (fieldKey === 'rate_type') {
            options = rateTypes;
        } else {
            options = componentConfig.options || [{label: `Select ${labelText}...`, value: ''}];
        }
      }

      fieldToRender = (
        <ReactSelect 
          label={labelText+(isRequired?' *':'')} 
          options={options} 
          value={options.find(opt => opt.value === currentFieldValue) || null} 
          onChange={option => {const value = option ? option.value : ''; handleChange(fieldKey, value);}} 
          fullWidth 
          required={isRequired} 
        />
      );
    
    } else if (componentConfig.dataType === 'date') {
      fieldToRender = <Input label={labelText+(isRequired?' *':'')} type="date" value={currentFieldValue} onChange={e=>handleChange(fieldKey,e.target.value)} fullWidth required={isRequired} />;
    
    } else {
      fieldToRender = <Input label={labelText+(isRequired?' *':'')} value={currentFieldValue} onChange={e=>handleChange(fieldKey,e.target.value)} placeholder={placeholder} fullWidth required={isRequired} />;
    }
    return <div key={fieldKey + "-form-field"}>{fieldToRender}</div>;
  };
  
  const formFieldsFromTemplate = Array.isArray(templateStructure)
    ? templateStructure.filter(c => c && c.type === 'field' && c.field)
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Placement: ${placement?.name || 'Loading...'}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {formFieldsFromTemplate.map(component => renderFormField(component))}
        
        {/* --- CORRECTED: Common fields with react-select --- */}
        {!formFieldsFromTemplate.find(c => c.field === 'status') && (
            <div key="modal-status-common">
                <ReactSelect label="Status" options={statusOptions} value={statusOptions.find(opt => opt.value === (formData.status || 'draft'))} onChange={option => {const value = option ? option.value : ''; handleChange('status', value);}} fullWidth />
            </div>
        )}
        {!formFieldsFromTemplate.find(c => c.field === 'rate_type') && (formData.hasOwnProperty('rate_type') || placement?.hasOwnProperty('rate_type')) && (
            <div key="modal-ratetype-common">
                <ReactSelect label="Rate Type" options={rateTypes} value={rateTypes.find(opt => opt.value === (formData.rate_type || ''))} onChange={option => {const value = option ? option.value : ''; handleChange('rate_type', value);}} fullWidth />
            </div>
        )}
         {!formFieldsFromTemplate.find(c => c.field === 'start_date') && (formData.hasOwnProperty('start_date') || placement?.hasOwnProperty('start_date')) && (
            <div key="modal-startdate-common">
                <Input label="Start Date" type="date" value={formData.start_date || ''} onChange={(e) => handleChange('start_date', e.target.value)} fullWidth />
            </div>
        )}
        {!formFieldsFromTemplate.find(c => c.field === 'end_date') && (formData.hasOwnProperty('end_date') || placement?.hasOwnProperty('end_date')) && (
            <div key="modal-enddate-common">
                <Input label="End Date" type="date" value={formData.end_date || ''} onChange={(e) => handleChange('end_date', e.target.value)} fullWidth />
            </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-3 z-10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="secondary" icon={<SaveIcon size={16} />} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};