// src/components/TemplateBuilder.jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PlusIcon, XIcon, GripVerticalIcon, InfoIcon } from 'lucide-react';
import { Button } from './Button';
import { ReactSelect } from './Select';
import { Input } from './Input';
import { useLegendCategories } from '../hooks/useLegendFields'; 

export const TEMPLATE_FIELDS = {
  client: { label: 'Client', type: 'fixed', description: 'Client name' },
  campaign: { label: 'Campaign', type: 'text', description: 'Campaign name for placements or UTMs' },
  site: { label: 'Site/Partner', type: 'text' }, 
  channel: { label: 'Channel', type: 'text' },
  targeting: { label: 'Targeting', type: 'text' },
  tactic: { label: 'Tactic', type: 'text' },
  geo_target: { label: 'Geography Targeting', type: 'text' },
  demo: { label: 'Demo', type: 'text' },
  device: { label: 'Device', type: 'text' },
  buy_location: { label: 'Buy Location', type: 'text' },
  serving: { label: 'Serving', type: 'text' },
  creative_type: { label: 'Creative Type', type: 'text' },
  creative_sizes: { label: 'Creative Sizes', type: 'text' },
  rate_type: { label: 'Rate Type', type: 'text' },
  start_date: { label: 'Start Date', type: 'date', description: 'Campaign start date' },
  end_date: { label: 'End Date', type: 'date', description: 'Campaign end date' },
  custom: { label: 'Custom Field', type: 'text', description: 'Custom naming element' },
  // UTM Specific Fields
  landing_page: { label: 'Landing Page URL', type: 'text', description: 'Base URL for UTM link (e.g., example.com/page)' },
  source: { label: 'UTM Source', type: 'text', description: 'utm_source parameter' },
  medium: { label: 'UTM Medium', type: 'text', description: 'utm_medium parameter' },
  term: { label: 'UTM Term', type: 'text', description: 'utm_term parameter (often for keywords)' },
  content: { label: 'UTM Content', type: 'text', description: 'utm_content parameter (for A/B testing, ad versions)' },
};

const DATA_TYPES = [
  { value: 'text', label: 'Free Text', description: 'User can type any value', icon: '📝' },
  { value: 'select', label: 'Dropdown (Custom Options)', description: 'User selects from predefined options you define here', icon: '🔽' },
  { value: 'date', label: 'Date Picker', description: 'Date selection widget for the user', icon: '📅' },
  { value: 'database_lookup', label: 'Dropdown (Legend Category)', description: 'Values from a chosen legend category', icon: '🗃️' }
];

const SEPARATORS = [
  { value: '_', label: 'Underscore (_)', example: 'client_campaign' },
  { value: '-', label: 'Hyphen (-)', example: 'client-campaign' },
  { value: '|', label: 'Pipe (|)', example: 'client|campaign' },
  { value: '.', label: 'Dot (.)', example: 'client.campaign' },
  { value: '', label: 'No separator', example: 'clientcampaign' },
];

const URL_FORMAT_OPTIONS = [
    { value: 'camelCase', label: 'Remove Spaces & CamelCase (MyValue)' },
    { value: 'kebab-case', label: 'Replace Spaces with Dashes (My-Value)' },
    { value: 'lowercase', label: 'Remove Spaces & Lowercase (myvalue)' },
    { value: 'lowercase-kebab', label: 'Dashes & Lowercase (my-value)' },
];

export const TemplateBuilder = ({ value = [], onChange, className = '', templateType }) => {
  const parseTemplateValue = (templateValue) => {
    if (templateType === 'utm') {
        return templateValue?.components || [];
    }
    return Array.isArray(templateValue) ? templateValue : [];
  };

  const parseUrlFormat = (templateValue) => {
    if (templateType === 'utm' && templateValue?.urlFormat) {
        return templateValue.urlFormat;
    }
    return 'kebab-case'; // Default format
  };

  const [components, setComponents] = useState(() => 
    parseTemplateValue(value).map(item => ({
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        separator: item.separator === undefined ? (templateType === 'utm' ? '&' : '_') : item.separator,
        required: item.required === undefined ? true : item.required,
    }))
  );
  
  const [urlFormat, setUrlFormat] = useState(() => parseUrlFormat(value));

  useEffect(() => {
    const newValue = templateType === 'utm' 
      ? { components, urlFormat }
      : components;

    if (JSON.stringify(newValue) !== JSON.stringify(value)) {
        onChange(newValue);
    }
  }, [components, urlFormat, onChange, value, templateType]);

  const generatePreview = useCallback((comps, type) => {
    if (!comps || comps.length === 0) return 'No components added';

    if (type === 'utm') {
      let previewString = '';
      const landingPageComp = comps.find(c => c.type === 'field' && c.field === 'landing_page');
      
      if (landingPageComp) {
        previewString += `https://{${landingPageComp.field}}`;
      } else {
        const staticBaseComp = comps.find(c => c.type === 'text' && (c.text.startsWith('http://') || c.text.startsWith('https://')));
        if (staticBaseComp) {
          previewString += staticBaseComp.text;
        } else {
           const anyTextComp = comps.find(c => c.type === 'text');
           if (anyTextComp) {
               previewString += anyTextComp.text;
           } else {
               previewString += 'https://{landing_page_placeholder}';
           }
        }
      }

      const utmParams = comps
        .filter(c => c.type === 'field' && ['source', 'medium', 'campaign', 'term', 'content'].includes(c.field))
        .map(c => `utm_${c.field}={${c.field}${c.required ? '' : ' (opt)'}}`);
      
      if (utmParams.length > 0) {
        previewString += `?${utmParams.join('&')}`;
      }
      return previewString;

    } else {
      return comps.map((comp, index) => {
        let part = '';
        if (comp.type === 'field') {
          part = `{${comp.field}}`;
        } else {
          part = comp.text || '';
        }
        if (index < comps.length - 1 && comp.separator !== undefined && comp.separator !== null) {
          part += comp.separator;
        }
        return part;
      }).join('');
    }
  }, []);
  
  const previewText = useMemo(() => {
    return generatePreview(components, templateType);
  }, [components, templateType, generatePreview]);

  const addField = (fieldName) => {
    const newComponent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'field',
      field: fieldName,
      dataType: TEMPLATE_FIELDS[fieldName]?.type || 'text',
      customOptions: '',
      legendCategory: '',
      required: fieldName === 'source' || fieldName === 'medium' || fieldName === 'landing_page' ? true : false,
      placeholder: '',
      separator: templateType === 'utm' ? (fieldName === 'landing_page' ? '?' : '&') : '_'
    };
    setComponents(prev => [...prev, newComponent]);
  };

  const addText = () => {
    const newComponent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      text: templateType === 'utm' ? 'https://yourdomain.com' : 'custom_text',
      separator: templateType === 'utm' ? '?' : '_'
    };
    setComponents(prev => [...prev, newComponent]);
  };

  const removeComponent = (id) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const updateComponent = (id, updates) => {
    setComponents(prev => prev.map(comp =>
      comp.id === id ? { ...comp, ...updates } : comp
    ));
  };

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => { setDraggedItem(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDragLeave = () => { setDragOverIndex(null); };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null); setDragOverIndex(null); return;
    }
    setComponents(prev => {
      const newComponents = [...prev];
      const [removed] = newComponents.splice(draggedItem, 1);
      newComponents.splice(dropIndex, 0, removed);
      return newComponents;
    });
    setDraggedItem(null); setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDraggedItem(null); setDragOverIndex(null); };

  const { categories: legendCategories, loadingCategories, errorCategories } = useLegendCategories();
  const usedFields = useMemo(() => components.filter(c => c.type === 'field').map(c => c.field), [components]);
  
  const availableFieldsForSelect = useMemo(() => {
    let fields = Object.keys(TEMPLATE_FIELDS);
    if (templateType === 'utm') {
        fields = ['landing_page', 'source', 'medium', 'campaign', 'term', 'content', 'custom'];
    }
    return fields
        .filter(key => !usedFields.includes(key) || TEMPLATE_FIELDS[key].allowMultiple) 
        .map(key => ({ value: key, label: TEMPLATE_FIELDS[key].label }));
  }, [usedFields, templateType]);

  const legendCategoryOptions = useMemo(() => [
      { value: '', label: 'Select a legend category...' },
      ...(legendCategories || [])
    ], [legendCategories]);


  return (
    <div className={`space-y-4 ${className}`}>
        {templateType === 'utm' && (
            <div className="mb-4">
            <ReactSelect
                label="UTM Value Formatting"
                options={URL_FORMAT_OPTIONS}
                value={URL_FORMAT_OPTIONS.find(option => option.value === urlFormat) || null}
                onChange={option => {
                  const value = option ? option.value : '';
                  setUrlFormat(value);
                }}
                fullWidth
                helperText="This rule will be applied to all UTM parameter values (source, medium, etc.)."
            />
            </div>
        )}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Template Structure
        </label>
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-sm font-medium mb-1">Template Preview:</div>
          <div className="font-mono text-sm bg-white px-2 py-1 rounded border break-all">
            {previewText || 'No components added'}
          </div>
        </div>
        <div className="space-y-3 mb-4">
          {components.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-gray-300 rounded-md text-center text-gray-500">
              <GripVerticalIcon size={24} className="mx-auto mb-2 opacity-50" />
              <p>No components added yet. Use the buttons below to add fields or custom text.</p>
              {templateType === 'utm' && <p className="text-xs mt-1">For UTMs, start by adding a 'Landing Page URL' field or static text for the base URL.</p>}
            </div>
          ) : (
            components.map((component, index) => {
                const fieldKeyOptions = [
                  { value: component.field, label: TEMPLATE_FIELDS[component.field]?.label || component.field },
                  ...availableFieldsForSelect.filter(opt => opt.value !== component.field)
                ];

                return (
                  <React.Fragment key={component.id}>
                    {draggedItem !== null && draggedItem !== index && index === 0 && <div className="h-2 bg-blue-200 rounded opacity-50 transition-all duration-200"></div>}
                    <div
                      className={`border rounded-md transition-all duration-200 ${draggedItem === index ? 'bg-blue-50 border-blue-300 opacity-50 transform scale-105' : dragOverIndex === index ? 'bg-green-50 border-green-300 border-2 transform scale-102' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                      draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
                        <button className="text-gray-400 hover:text-gray-600 cursor-move p-1 hover:bg-gray-100 rounded transition-colors" onMouseDown={(e) => e.stopPropagation()} title="Drag to reorder">
                          <GripVerticalIcon size={16} />
                        </button>
                        <div className="flex-1">
                          {component.type === 'field' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Field Key:</span>
                              <ReactSelect
                                options={fieldKeyOptions}
                                value={fieldKeyOptions.find(opt => opt.value === component.field)}
                                onChange={(option) => {
                                  const newFieldKey = option ? option.value : '';
                                  if (!newFieldKey) return;
                                  updateComponent(component.id, {
                                    field: newFieldKey,
                                    dataType: TEMPLATE_FIELDS[newFieldKey]?.type || 'text',
                                    customOptions: '', 
                                    legendCategory: '',
                                    required: (templateType === 'utm' && (newFieldKey === 'source' || newFieldKey === 'medium' || newFieldKey === 'landing_page')) ? true : component.required,
                                  });
                                }}
                                className="w-48"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Static Text:</span>
                              <Input
                                value={component.text || ''}
                                onChange={(e) => updateComponent(component.id, { text: e.target.value })}
                                placeholder={templateType === 'utm' ? 'e.g. https://domain.com or utm_custom=value' : "Enter static text"}
                                className="w-full !mb-0" 
                              />
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeComponent(component.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors" title="Remove component">
                          <XIcon size={16} />
                        </button>
                      </div>
                      {component.type === 'field' && (
                        <div className="p-4 space-y-4">
                           <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Field Display Name (Header)</label>
                            <Input
                              value={component.header || TEMPLATE_FIELDS[component.field]?.label || ''}
                              onChange={(e) => updateComponent(component.id, { header: e.target.value })}
                              placeholder="Header for this field in tables"
                              className="w-full !mb-0"
                            />
                             <p className="mt-1 text-xs text-gray-500">Optional. If blank, derived from Field Key.</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Input Method for User</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              {DATA_TYPES.map((dataTypeOption) => (
                                <button
                                  key={dataTypeOption.value}
                                  type="button"
                                  onClick={() => updateComponent(component.id, { dataType: dataTypeOption.value })}
                                  className={`p-3 text-left border rounded-md transition-colors h-full flex flex-col justify-between ${component.dataType === dataTypeOption.value ? 'border-[#fbb832] bg-[#fff8ee] text-[#ff501c]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">{dataTypeOption.icon}</span>
                                      <span className="text-sm font-medium">{dataTypeOption.label}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">{dataTypeOption.description}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                          {component.dataType === 'database_lookup' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Legend Category <span className="text-red-500">*</span>
                              </label>
                              {errorCategories && <p className="text-sm text-red-500">Error: {errorCategories.message || 'Could not load categories'}</p>}
                              <ReactSelect
                                options={legendCategoryOptions}
                                value={legendCategoryOptions.find(opt => opt.value === (component.legendCategory || ''))}
                                onChange={option => {
                                  const value = option ? option.value : '';
                                  updateComponent(component.id, { legendCategory: value });
                                }}
                                disabled={loadingCategories || (legendCategories && legendCategories.length === 0)}
                                fullWidth
                                required={component.dataType === 'database_lookup'}
                              />
                               <p className="mt-1 text-xs text-gray-500">
                                The Builder will use this category to populate dropdown choices.
                              </p>
                            </div>
                          )}
                          {component.dataType === 'select' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Custom Dropdown Options
                              </label>
                              <textarea
                                value={component.customOptions || ''}
                                onChange={(e) => updateComponent(component.id, { customOptions: e.target.value })}
                                placeholder="Enter options separated by commas (e.g., option1, option2, option3)"
                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                rows={2}
                              />
                              <p className="mt-1 text-xs text-gray-600">
                                Separate multiple options with commas.
                              </p>
                            </div>
                          )}
                           <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder Text (Optional)</label>
                            <Input
                              value={component.placeholder || ''}
                              onChange={(e) => updateComponent(component.id, { placeholder: e.target.value })}
                              placeholder={`e.g., ${TEMPLATE_FIELDS[component.field]?.description || 'Enter value'}`}
                              className="w-full !mb-0"
                            />
                          </div>
                           <div className="flex items-center">
                            <input
                              id={`required-${component.id}`}
                              type="checkbox"
                              checked={component.required === undefined ? true : component.required}
                              onChange={(e) => updateComponent(component.id, { required: e.target.checked })}
                              className="h-4 w-4 text-[#fbb832] focus:ring-[#fbb832] border-gray-300 rounded"
                            />
                            <label htmlFor={`required-${component.id}`} className="ml-2 block text-sm text-gray-700">
                              This field is required when using the template
                            </label>
                          </div>
                        </div>
                      )}
                      {templateType !== 'utm' && index < components.length - 1 && (
                         <div className="p-4 border-t border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Separator After This Component
                            </label>
                            <ReactSelect
                              options={SEPARATORS}
                              value={SEPARATORS.find(opt => opt.value === (component.separator === undefined ? '_' : component.separator))}
                              onChange={option => {
                                const value = option ? option.value : '';
                                updateComponent(component.id, { separator: value });
                              }}
                              fullWidth
                              getOptionLabel={opt => opt.example}
                            />
                          </div>
                       )}
                    </div>
                    {draggedItem !== null && draggedItem !== index && draggedItem !== index + 1 && <div className="h-2 bg-blue-200 rounded opacity-50 transition-all duration-200"></div>}
                  </React.Fragment>
                );
              })
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          <div className="relative">
            <ReactSelect
              placeholder="Add Field Key..."
              options={availableFieldsForSelect}
              value={null}
              onChange={option => {
                if (option && option.value){
                  addField(option.value);
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<PlusIcon size={16} />}
            onClick={addText}
          >
            Add Custom Static Text
          </Button>
        </div>
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <InfoIcon size={20} className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 mb-1">Template Building Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                <li>Drag components to reorder. 'Field Key' is the placeholder (e.g., `{'{site}'}`).</li>
                <li>'Input Method' determines how users provide data in the Builder for this field.</li>
                {templateType === 'utm' ? (
                  <>
                    <li>For UTMs, field keys like `{'{landing_page}'}`, `{'{source}'}`, etc., are used.</li>
                    <li>The structure `https://...` is automatically handled for preview.</li>
                    <li>Optional UTM fields (like term, content) should have "This field is required" unchecked.</li>
                    <li>URL Value Formatting applies to all UTM parameters.</li>
                  </>
                ) : (
                  <>
                    <li>'Dropdown (Legend Category)' uses values from a central legend (e.g., all 'Sites').</li>
                    <li>'Dropdown (Custom Options)' lets you define choices specific to this template field.</li>
                    <li>'Separator' is placed *after* each component. Last component's separator is ignored.</li>
                  </>
                )}
                <li>'Custom Static Text' adds fixed text.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};