import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'; // Import xlsx library
import {
  PlusIcon,
  SaveIcon,
  TrashIcon,
  ChevronDownIcon,
  EditIcon,
  CopyIcon,
  BookMarkedIcon,
  SearchIcon,
  UploadIcon,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ReactSelect } from '../components/Select'
import { TemplateBuilder } from '../components/TemplateBuilder'
import { useTemplates } from '../hooks/useTemplates'
import { useClients } from '../hooks/useClients'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAllLegendFieldItems } from '../hooks/useLegendFields'
import { LegendItemFormModal } from '../components/LegendItemFormModal'
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal'
import { UploadLegendConfirmModal } from '../components/UploadLegendConfirmModal'; // Import the new modal
import { apiClient } from '../lib/api';

export const Templates = () => {
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedClientFilter, setSelectedClientFilter] = useState('')
  const [templateTypeFilter, setTemplateTypeFilter] = useState('')
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [showLegendItemModal, setShowLegendItemModal] = useState(false);
  const [editingLegendItem, setEditingLegendItem] = useState(null);
  const [deletingLegendItem, setDeletingLegendItem] = useState(null);
  const [isSubmittingLegend, setIsSubmittingLegend] = useState(false);

  const [legendSearchTerm, setLegendSearchTerm] = useState('');
  const [legendCategoryFilter, setLegendCategoryFilter] = useState('');

  // ---- NEW STATE FOR UPLOAD ----
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedUploadData, setParsedUploadData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  // ---- END NEW STATE ----


  const { clients = [] } = useClients()
  const { templates = [], loading: templatesLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates(selectedClientFilter, templateTypeFilter)

  const { 
    allItems: legendItems, 
    loadingAllItems, 
    errorAllItems, 
    createLegendItem, 
    updateLegendItem, 
    deleteLegendItem,
    refetchAllItems,
  } = useAllLegendFieldItems();

  const filteredTemplates = useMemo(() => (templates || []).filter(template => {
    if (!template) return false;
    const matchesType = !templateTypeFilter || template.type === templateTypeFilter;
    const matchesClient = !selectedClientFilter || template.client === selectedClientFilter || (template.is_global && !selectedClientFilter);
    return matchesType && matchesClient;
  }), [templates, templateTypeFilter, selectedClientFilter]);

  const legendCategoriesForFilter = useMemo(() => {
    if (!legendItems) return [];
    const categories = [...new Set(legendItems.map(item => item.category))];
    return categories.sort().map(cat => ({ value: cat, label: cat }));
  }, [legendItems]);

  const filteredLegendItems = useMemo(() => {
    return (legendItems || []).filter(item => {
      const lowerSearch = legendSearchTerm.toLowerCase();
      const matchesSearch = lowerSearch === '' ||
        item.category?.toLowerCase().includes(lowerSearch) ||
        item.actual_value?.toLowerCase().includes(lowerSearch) ||
        item.abbreviation?.toLowerCase().includes(lowerSearch);
      
      const matchesCategory = legendCategoryFilter === '' || item.category === legendCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [legendItems, legendSearchTerm, legendCategoryFilter]);


  const displayFeedback = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setShowNewTemplate(true)
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setShowNewTemplate(true)
  }

  const handleSaveTemplate = useCallback(async (formDataFromForm) => {
    try {
      const payload = {
        name: formDataFromForm.display_name,
        type: formDataFromForm.type,
        client_id: formDataFromForm.is_global ? null : (formDataFromForm.client || null), 
        template_structure: formDataFromForm.fields, 
        description: formDataFromForm.description || null,
        is_global: formDataFromForm.is_global || false,
      };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, payload);
        displayFeedback('Template updated successfully!');
      } else {
        await createTemplate(payload);
        displayFeedback('Template created successfully!');
      }
      setShowNewTemplate(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error in handleSaveTemplate:', error);
      throw error;
    }
  }, [editingTemplate, createTemplate, updateTemplate]);

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(templateId)
        displayFeedback('Template deleted successfully!');
      } catch (error) {
        alert('Error deleting template: ' + error.message)
      }
    }
  }

  const handleDuplicateTemplate = async (template) => { 
    try {
      const duplicatedPayload = {
        name: `${template.name} (Copy)`, 
        type: template.type,
        client_id: template.is_global ? null : template.client,
        template_structure: template.template_structure, 
        description: template.description,
        is_global: template.is_global,
      };
      await createTemplate(duplicatedPayload); 
      displayFeedback('Template duplicated successfully!');
    } catch (error) {
      alert('Error duplicating template: ' + error.message);
    }
  };

  const handleAddLegendItemClick = () => {
      setEditingLegendItem(null);
      setShowLegendItemModal(true);
  }
  
  const handleEditLegendItemClick = (item) => {
      setEditingLegendItem(item);
      setShowLegendItemModal(true);
  }

  const handleDeleteLegendItemClick = (item) => {
      setDeletingLegendItem(item);
  }

  const handleSaveLegendItem = async (formData) => {
      setIsSubmittingLegend(true);
      try {
          if (editingLegendItem) {
              await updateLegendItem(editingLegendItem.id, formData);
              displayFeedback('Legend item updated!');
          } else {
              await createLegendItem(formData);
              displayFeedback('Legend item created!');
          }
          setShowLegendItemModal(false);
          setEditingLegendItem(null);
      } catch (error) {
          console.error("Failed to save legend item", error);
          alert("Error: " + error.message);
      } finally {
          setIsSubmittingLegend(false);
      }
  }
  
  const handleConfirmDeleteLegendItem = async () => {
    if (!deletingLegendItem) return;
    setIsSubmittingLegend(true);
    try {
      await deleteLegendItem(deletingLegendItem.id);
      setDeletingLegendItem(null);
      displayFeedback('Legend item deleted!');
    } catch (error) {
      alert("Error deleting: " + error.message);
    } finally {
      setIsSubmittingLegend(false);
    }
  }

  // ---- NEW UPLOAD HANDLER FUNCTIONS ----
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // header: 1 gives us an array of arrays
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headerRow = json[0];
        const dataRows = json.slice(1);
        
        const legendItemsToUpload = [];
        
        // Find category pairs (e.g., "Site" and "Site (Abreveated)")
        const categoryPairs = {};
        headerRow.forEach((header, index) => {
          if (header && !header.toLowerCase().includes('(abreveated)')) {
            const abbrHeader = `${header} (Abreveated)`;
            const abbrIndex = headerRow.findIndex(h => h && h.toLowerCase() === abbrHeader.toLowerCase());
            if (abbrIndex !== -1) {
              categoryPairs[header] = { valueIndex: index, abbrIndex };
            }
          }
        });

        dataRows.forEach(row => {
          for (const category in categoryPairs) {
            const { valueIndex, abbrIndex } = categoryPairs[category];
            const value = row[valueIndex];
            if (value) { // Only add if there's a value
              legendItemsToUpload.push({
                category: category.trim(),
                value: String(value).trim(),
                abbreviation: row[abbrIndex] ? String(row[abbrIndex]).trim() : '',
              });
            }
          }
        });

        if (legendItemsToUpload.length === 0) {
            alert("No valid legend items found in the file. Please check the file format.");
            return;
        }

        setParsedUploadData(legendItemsToUpload);
        setShowUploadModal(true);

      } catch (error) {
        console.error("Error parsing file:", error);
        alert("Failed to parse file. Please ensure it's a valid XLSX or CSV file with the correct format.");
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input so the same file can be uploaded again
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleConfirmUpload = async (uploadPayload) => {
    setIsUploading(true);
    try {
      await apiClient.bulkUploadLegendFields(uploadPayload);
      displayFeedback('Legend items uploaded successfully!');
      setShowUploadModal(false);
      setParsedUploadData([]);
      refetchAllItems(); // Refresh the list of legend items
    } catch (error) {
      alert("Error during upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  // ---- END NEW UPLOAD HANDLER FUNCTIONS ----


  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.id,
    label: client.name
  })), [clients]);

  const typeOptions = useMemo(() => [
    { value: '', label: 'All Types' },
    { value: 'campaign', label: 'Campaign Templates' },
    { value: 'placement', label: 'Placement Templates' },
    { value: 'utm', label: 'UTM Templates' }
  ], []);

  const clientFilterOptions = useMemo(() => [
    { value: '', label: 'All Clients / Global' },
    ...clientOptions
  ], [clientOptions]);

  const legendCategoryFilterOptions = useMemo(() => [
    {value: '', label: 'All Categories'}, 
    ...legendCategoriesForFilter
  ], [legendCategoriesForFilter]);


  if (templatesLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">
          Template Library
        </h1>
        <p className="text-gray-700">
          Create and manage reusable templates for campaigns, placements, and UTMs.
        </p>
      </div>

      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
          <span className="mr-2">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-black/10 shadow-sm">
        <div className="p-6 border-b border-black/10">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <ReactSelect
                options={typeOptions}
                value={typeOptions.find(opt => opt.value === templateTypeFilter)}
                onChange={option => {
                  const value = option ? option.value : '';
                  setTemplateTypeFilter(value);
                }}
                className="w-full sm:w-48"
              />
              <ReactSelect
                options={clientFilterOptions}
                value={clientFilterOptions.find(opt => opt.value === selectedClientFilter)}
                onChange={option => {
                  const value = option ? option.value : '';
                  setSelectedClientFilter(value);
                }}
                className="w-full sm:w-48"
              />
            </div>
            <Button
              variant="secondary"
              icon={<PlusIcon size={16} />}
              onClick={handleCreateTemplate}
            >
              New Template
            </Button>
          </div>
        </div>

        {showNewTemplate && (
          <div className="p-6 border-b border-black/10 bg-gray-50">
            <TemplateForm
              template={editingTemplate}
              clients={clients}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setShowNewTemplate(false)
                setEditingTemplate(null)
              }}
            />
          </div>
        )}

        <div className="p-6">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  clients={clients}
                  onEdit={() => handleEditTemplate(template)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {templateTypeFilter || selectedClientFilter 
                  ? 'No templates found matching your filters.' 
                  : 'No templates created yet.'
                }
              </div>
              <Button
                variant="secondary"
                icon={<PlusIcon size={16} />}
                onClick={handleCreateTemplate}
              >
                Create Your First Template
              </Button>
            </div>
          )}
        </div>
      </div>

       {/* Legend Fields Library Section */}
       <div className="mt-12">
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-black mb-2">
                Legend Field Library
            </h1>
            <p className="text-gray-700">
                Manage reusable values for template dropdowns (e.g., Sites, Channels, Tactics).
            </p>
        </div>
        <div className="bg-white rounded-lg border border-black/10 shadow-sm">
            <div className="p-6 border-b border-black/10">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookMarkedIcon className="text-gray-600"/>
                        All Legend Items ({filteredLegendItems.length})
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="outline" icon={<UploadIcon size={16} />} onClick={() => fileInputRef.current.click()}>
                            Bulk Upload
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .csv" className="hidden"/>

                        <Button variant="secondary" icon={<PlusIcon size={16} />} onClick={handleAddLegendItemClick}>
                            Add Legend Item
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchIcon size={18} className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400" />
                        <Input 
                            placeholder="Search by category, value, or abbreviation..."
                            value={legendSearchTerm}
                            onChange={e => setLegendSearchTerm(e.target.value)}
                            className="pl-10 !mb-0"
                            fullWidth
                        />
                    </div>
                    <ReactSelect 
                        options={legendCategoryFilterOptions}
                        value={legendCategoryFilterOptions.find(opt => opt.value === legendCategoryFilter)}
                        onChange={option => {
                          const value = option ? option.value : '';
                          setLegendCategoryFilter(value);
                        }}
                        className="w-full sm:w-56"
                    />
                </div>
            </div>
            <div className="p-6">
                {loadingAllItems ? <LoadingSpinner /> : errorAllItems ? <p className="text-red-500 text-center">Error loading items: {errorAllItems.message}</p> : (
                    filteredLegendItems.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abbreviation</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredLegendItems.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.actual_value}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.abbreviation || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleEditLegendItemClick(item)} icon={<EditIcon size={14}/>}>Edit</Button>
                                                <Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteLegendItemClick(item)} icon={<TrashIcon size={14}/>}>Delete</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                             {legendSearchTerm || legendCategoryFilter
                                ? 'No legend items match your filters.'
                                : 'No legend items found. Click "Add Legend Item" to create one.'
                            }
                        </div>
                    )
                )}
            </div>
        </div>
    </div>
    
    <LegendItemFormModal 
        isOpen={showLegendItemModal} 
        onClose={() => {setShowLegendItemModal(false); setEditingLegendItem(null);}}
        onSave={handleSaveLegendItem}
        item={editingLegendItem}
        isSubmitting={isSubmittingLegend}
    />
    <ConfirmDeleteModal 
        isOpen={!!deletingLegendItem}
        onClose={() => setDeletingLegendItem(null)}
        onConfirm={handleConfirmDeleteLegendItem}
        isDeleting={isSubmittingLegend}
        title="Delete Legend Item"
        message={`Are you sure you want to delete this legend item? This action cannot be undone.`}
        itemName={`${deletingLegendItem?.category}: ${deletingLegendItem?.actual_value}`}
    />
    {showUploadModal && (
        <UploadLegendConfirmModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onConfirm={handleConfirmUpload}
            parsedData={parsedUploadData}
            isUploading={isUploading}
        />
    )}
    </div>
  )
}

const TemplateForm = ({ template, clients, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    display_name: '', 
    type: 'placement',
    client: '',
    fields: [],
    description: '',
    is_global: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const isUtm = template?.type === 'utm';
    const structure = template?.template_structure || (isUtm ? { components: [], urlFormat: 'kebab-case' } : []);

    setFormData({
      display_name: template?.name || '',
      type: template?.type || 'placement',
      client: template?.client || '',
      fields: structure,
      description: template?.description || '',
      is_global: template ? template.is_global : isUtm,
    });
  }, [template]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const structureToValidate = formData.type === 'utm' ? formData.fields.components : formData.fields;
    if (!formData.display_name.trim() || !structureToValidate || structureToValidate.length === 0) {
      alert('Template name and a defined template structure (fields) are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData); 
    } catch (error) {
      console.error('Error saving template (from TemplateForm):', error);
      alert('Error saving template: ' + error.message);
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

  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.id,
    label: client.name
  })), [clients]);

  const clientAssociationOptions = useMemo(() => [
      { value: '', label: 'No Specific Client (Consider Global)' },
      ...clientOptions
  ], [clientOptions]);

  const typeOptions = useMemo(() => [
    { value: 'campaign', label: 'Campaign Template' },
    { value: 'placement', label: 'Placement Template' },
    { value: 'utm', label: 'UTM Template' }
  ], []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {template ? 'Edit Template' : 'Create New Template'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Template Name"
          value={formData.display_name}
          onChange={(e) => handleChange('display_name', e.target.value)}
          placeholder="Enter template name"
          required
          fullWidth
        />
        <ReactSelect
          label="Template Type"
          options={typeOptions}
          value={typeOptions.find(opt => opt.value === formData.type)}
          onChange={(option) => {
            const value = option ? option.value : '';
            const newType = value;
            const newFields = newType === 'utm' ? { components: [], urlFormat: 'kebab-case' } : [];
            setFormData(prev => ({ ...prev, type: newType, fields: newFields }));
          }}
          required
          fullWidth
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReactSelect
          label="Client Association"
          options={clientAssociationOptions}
          value={clientAssociationOptions.find(opt => opt.value === formData.client)}
          onChange={option => {
            const value = option ? option.value : '';
            handleChange('client', value);
          }}
          fullWidth
          disabled={formData.is_global}
          helperText={formData.is_global ? "Global template: client association is ignored." : (formData.client ? "" : "Select a client or mark as global.")}
        />
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Global Template
          </label>
          <div className="flex items-center">
            <input
              id="is_global"
              type="checkbox"
              checked={formData.is_global}
              onChange={(e) => {
                const isChecked = e.target.checked;
                handleChange('is_global', isChecked);
                if (isChecked) handleChange('client', ''); // Clear client if global
              }}
              className="h-4 w-4 text-[#fbb832] focus:ring-[#fbb832] border-gray-300 rounded"
            />
            <label htmlFor="is_global" className="ml-2 block text-sm text-gray-700">
              Make this template available globally
            </label>
          </div>
           <p className="mt-1 text-xs text-gray-500">If checked, 'Client Association' will be ignored.</p>
        </div>
      </div>
       <Input
          label="Description (Optional)"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Brief description of the template"
          fullWidth
        />
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Template Fields (Structure)
        </label>
        <TemplateBuilder
          value={formData.fields} 
          onChange={(fieldsData) => handleChange('fields', fieldsData)}
          templateType={formData.type}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
          {isSubmitting ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};

const TemplateCard = ({ template, clients, onEdit, onDelete, onDuplicate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeColor = (type) => {
    switch (type) {
      case 'campaign': return 'bg-blue-100 text-blue-800';
      case 'placement': return 'bg-green-100 text-green-800';
      case 'utm': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generatePreviewForCard = useCallback((fieldsArray, templateType) => {
    const components = (templateType === 'utm' && fieldsArray?.components) ? fieldsArray.components : (Array.isArray(fieldsArray) ? fieldsArray : []);
    if (!components || components.length === 0) return 'No fields defined';

    if (templateType === 'utm') {
        let previewString = '';
        const landingPageComp = components.find(c => c.type === 'field' && c.field === 'landing_page');
        if (landingPageComp) {
          previewString += `https://{${landingPageComp.field}}`;
        } else {
            const staticBaseComp = components.find(c => c.type === 'text' && (c.text.startsWith('http://') || c.text.startsWith('https://')));
            if (staticBaseComp) {
                previewString += staticBaseComp.text;
            } else {
                 const anyTextComp = components.find(c => c.type === 'text');
                 if (anyTextComp) {
                     previewString += anyTextComp.text;
                 } else {
                    previewString += 'https://{landing_page_placeholder}';
                 }
            }
        }
        const utmParams = components
          .filter(c => c.type === 'field' && ['source', 'medium', 'campaign', 'term', 'content'].includes(c.field))
          .map(c => `utm_${c.field}={${c.field}${c.required ? '' : ' (opt)'}}`);
        if (utmParams.length > 0) {
          previewString += `?${utmParams.join('&')}`;
        }
        return previewString;
    } else {
        return components.map((component, index) => {
          let part = '';
          if (component.type === 'field') {
            part = `{${component.field}}`;
          } else {
            part = component.text || '';
          }
          if (index < components.length - 1 && component.separator !== undefined && component.separator !== null) {
            part += component.separator;
          }
          return part;
        }).join('');
    }
  }, []);
  
  const clientName = useMemo(() => {
    if (template.is_global) return 'Global (All Clients)';
    if (template.client) {
      const foundClient = clients.find(c => c.id === template.client);
      return foundClient ? foundClient.name : 'Unknown Client';
    }
    return 'Not Associated / Global by default';
  }, [template, clients]);

  return (
    <div className="border border-black/10 rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-black">{template.name}</h3> 
              <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(template.type)}`}>
                {template.type}
              </span>
              {template.is_global && ( 
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                  Global
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Client: {clientName}
            </p>
            {template.description && <p className="text-xs text-gray-500 italic mb-2">Desc: {template.description}</p>}
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-[#fbb832]" title="Edit template"><EditIcon size={14} /></button>
            <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-blue-600" title="Duplicate template"><CopyIcon size={14} /></button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500" title="Delete template"><TrashIcon size={14} /></button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Template Preview</span>
            <ChevronDownIcon size={16} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isExpanded && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <div className="font-mono text-xs break-all">
                {generatePreviewForCard(template.template_structure, template.type)}
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
          Created: {new Date(template.dt_created).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};