// src/pages/PlacementBuilder.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { InfoIcon, SaveIcon, PlusIcon, Loader2Icon, Edit2Icon, Trash2Icon, CopyIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { ReactSelect } from '../components/Select';
import { SpreadsheetGrid } from '../components/SpreadsheetGrid';
import { AddClientModal } from '../components/AddClientModal';
import { AddCampaignModal } from '../components/AddCampaignModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EditPlacementModal } from '../components/EditPlacementModal';
import { useClients } from '../hooks/useClients';
import { useCampaigns } from '../hooks/useCampaigns';
import { usePlacements } from '../hooks/usePlacements';
import { useTemplates } from '../hooks/useTemplates';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TEMPLATE_FIELDS } from '../components/TemplateBuilder';

// --- Helper Functions ---
const parseMMDDYYToDateInput = (dateStr) => {
  if (!dateStr || !/^\d{2}\.\d{2}\.\d{2}$/.test(dateStr)) return '';
  const parts = dateStr.split('.');
  const year = parseInt(parts[2], 10);
  const fullYear = year + (year < 70 ? 2000 : 1900);
  return `${fullYear}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
};

const formatDateToMMDDYY = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return dateString;
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}.${day}.${year}`;
  } catch (e) { return dateString; }
};

const generatePlacementNameForRow = (rowData, templateStructure, client, legendOptionsMap) => {
  if (!Array.isArray(templateStructure) || templateStructure.length === 0 || !rowData) {
    return 'Cannot generate name: No template selected.';
  }
  const campaignFromGrid = rowData?.campaign || '';
  const currentClientName = client?.name || '';
  let finalNameStr = '';
  for (let i = 0; i < templateStructure.length; i++) {
    const component = templateStructure[i];
    let partValue = '';
    const fieldValueFromGrid = rowData[component.field] || (component.field === 'client' ? currentClientName : '');

    if (component.type === 'field') {
      if (component.field === 'client') {
        partValue = currentClientName;
      } else if (component.dataType === 'database_lookup' && component.legendCategory) {
        const legendEntries = legendOptionsMap[component.legendCategory] || [];
        const selectedEntry = legendEntries.find(opt => opt.value === fieldValueFromGrid);
        partValue = selectedEntry?.abbreviation || selectedEntry?.value || fieldValueFromGrid;
      } else if (component.dataType === 'date') {
        partValue = formatDateToMMDDYY(fieldValueFromGrid);
      } else {
        partValue = fieldValueFromGrid.toString();
      }
      if ((component.dataType === 'text' || !component.dataType || component.field === 'client' || component.field === 'campaign') &&
          !(component.dataType === 'database_lookup' && legendOptionsMap[component.legendCategory]?.some(opt => opt.abbreviation === partValue && opt.value === fieldValueFromGrid))) {
         partValue = partValue.replace(/\s+/g, '-');
      }
      if (!partValue && component.field && component.field !== 'custom') {
          partValue = `{${component.field}}`;
      }
    } else {
      partValue = (component.text || '').replace(/\s+/g, '-');
    }
    if (component.field === 'custom' && (partValue === '' || partValue === '{custom}')) {
        if (finalNameStr.length > 0 && i > 0) {
            const prevSeparator = templateStructure[i-1].separator;
            if (prevSeparator && finalNameStr.endsWith(prevSeparator)) {
                finalNameStr = finalNameStr.slice(0, -prevSeparator.length);
            }
        }
        continue;
    }
    finalNameStr += partValue;
    if (i < templateStructure.length - 1) {
      const nextComponent = templateStructure[i+1];
      if (!(nextComponent.field === 'custom' && (!rowData[nextComponent.field] || rowData[nextComponent.field] === '{custom}'))) {
          finalNameStr += component.separator === undefined ? '_' : component.separator;
      }
    }
  }
  const lastMeaningfulComponent = [...templateStructure].reverse().find(c => !(c.field === 'custom' && (!rowData[c.field] || rowData[c.field] === '{custom}')));
  if(lastMeaningfulComponent && (lastMeaningfulComponent.separator !== undefined)){
      const sepToClean = lastMeaningfulComponent.separator === undefined ? '_' : lastMeaningfulComponent.separator;
      if(finalNameStr.endsWith(sepToClean)){
          finalNameStr = finalNameStr.slice(0, -sepToClean.length);
      }
  }
  return finalNameStr.replace(/[_.\-|]+$/, "").replace(/^[_\.\-|]+/, "");
};

const parsePlacementName = (nameToParse, templateStructure, legendOptionsMap) => {
  const parsed = {};
  let remainingName = nameToParse;
  if (!Array.isArray(templateStructure) || templateStructure.length === 0) {
    const parts = nameToParse.split('_');
    if(parts.length >= 4) {
        parsed.client_name_from_parse = parts[0];
        parsed.campaign = parts[1];
        parsed.site = parts[2];
        parsed.targeting = parts[3];
    } else {
        parsed.unknown_structure = nameToParse;
    }
    return parsed;
  }

  for (let i = 0; i < templateStructure.length; i++) {
    const component = templateStructure[i];
    if (component.type !== 'field') continue;

    const fieldKey = component.field;
    const separator = (i < templateStructure.length - 1 && templateStructure[i].separator !== undefined)
                      ? templateStructure[i].separator
                      : null;
    let value = '';

    if (component.field === 'client') {
        parsed[fieldKey] = "";
        continue;
    }

    if (separator === null || separator === '') {
      value = remainingName;
      remainingName = '';
    } else {
      const separatorRegex = new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const match = remainingName.match(separatorRegex);
      if (match) {
        value = remainingName.substring(0, match.index);
        remainingName = remainingName.substring(match.index + separator.length);
      } else {
         const isLastActualField = templateStructure.slice(i + 1).every(c => c.type !== 'field' || c.field === 'custom');
        if (isLastActualField) {
            value = remainingName;
            remainingName = '';
        } else {
            value = '';
        }
      }
    }

    if (component.dataType === 'date') {
      value = parseMMDDYYToDateInput(value);
    } else if (component.dataType === 'database_lookup' && component.legendCategory) {
      const legendEntries = legendOptionsMap[component.legendCategory] || [];
      const entryByAbbr = legendEntries.find(opt => opt.abbreviation === value);
      if (entryByAbbr) value = entryByAbbr.value;
      else {
        const entryByValue = legendEntries.find(opt => opt.value === value);
        if(entryByValue) value = entryByValue.value;
      }
    }
    parsed[fieldKey] = value;
    if (remainingName === '') break;
  }
  return parsed;
};

const TooltipCell = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative w-full h-full flex items-center">
      <span className="truncate">{text}</span>
      <div
        className="absolute bottom-full left-0 mb-1 flex items-center w-auto max-w-lg p-2 text-xs font-normal text-white bg-gray-900 rounded-md shadow-lg 
                   opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto 
                   transition-opacity duration-150 z-20"
      >
        <span className="break-all">{text}</span>
        <button
          onClick={handleCopy}
          className="ml-2 p-1 rounded-full text-gray-300 hover:bg-gray-700 focus:outline-none flex-shrink-0"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ) : (
            <CopyIcon size={14} />
          )}
        </button>
      </div>
    </div>
  );
};

export const PlacementBuilder = () => {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [newPlacementData, setNewPlacementData] = useState(() => [{}]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [legendOptionsMap, setLegendOptionsMap] = useState({});
  const [isLoadingLegendValues, setIsLoadingLegendValues] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState(null);
  const [showEditPlacementModal, setShowEditPlacementModal] = useState(false);
  const [placementToDelete, setPlacementToDelete] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isDeletingOperation, setIsDeletingOperation] = useState(false);

  const { clients = [], loading: clientsLoading, error: clientsError, createClient, refetch: refetchClients } = useClients();
  const { campaigns = [], loading: campaignsLoading, createCampaign, refetch: refetchCampaigns } = useCampaigns(selectedClient);
  const { templates: availableTemplates, loading: templatesLoading } = useTemplates(selectedClient, 'placement');

  const { 
    placements: existingPlacementsRaw, 
    loading: existingPlacementsLoading, 
    error: existingPlacementsError,
    createPlacements, 
    deletePlacement, 
    updatePlacement,
    refetch: refetchExistingPlacements 
  } = usePlacements(selectedClient && selectedCampaign ? { client_id: selectedClient, campaign_id: selectedCampaign } : {});

  const clientData = useMemo(() => clients.find(c => c.id === selectedClient), [clients, selectedClient]);
  const campaignData = useMemo(() => campaigns.find(c => c.id === selectedCampaign), [campaigns, selectedCampaign]);

  useEffect(() => {
    if (selectedClient && !templatesLoading) {
      const clientSpecificTemplate = availableTemplates.find(t => t.client === selectedClient && !t.is_global);
      if (clientSpecificTemplate) {
        setSelectedTemplateId(clientSpecificTemplate.id);
      } else {
        const globalTemplate = availableTemplates.find(t => t.is_global);
        if (globalTemplate) {
          setSelectedTemplateId(globalTemplate.id);
        } else {
          setSelectedTemplateId('');
        }
      }
    } else if (!selectedClient) {
      setSelectedTemplateId('');
    }
  }, [selectedClient, availableTemplates, templatesLoading]);


  const activeTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return availableTemplates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, availableTemplates]);

  const activeTemplateStructure = useMemo(() => activeTemplate?.template_structure || [], [activeTemplate]);
  const activeTemplateDisplayName = useMemo(() => activeTemplate?.display_name || 'No Template Selected', [activeTemplate]);

  useEffect(() => {
    const fetchNeededLegendOptions = async () => {
      if (!selectedClient || !Array.isArray(activeTemplateStructure) || activeTemplateStructure.length === 0) {
        setLegendOptionsMap({}); setIsLoadingLegendValues(false); return;
      }
      const categoriesToFetch = new Set();
      activeTemplateStructure.forEach(c => { if (c.type === 'field' && c.dataType === 'database_lookup' && c.legendCategory) categoriesToFetch.add(c.legendCategory); });
      if (categoriesToFetch.size === 0) { setLegendOptionsMap({}); setIsLoadingLegendValues(false); return; }
      setIsLoadingLegendValues(true);
      const newMap = { ...legendOptionsMap }; let newFetches = false;
      try {
        for (const cat of categoriesToFetch) { if (!newMap[cat] || newMap[cat].length === 0) { newMap[cat] = await apiClient.getLegendFields(cat) || []; newFetches = true; } }
        if (newFetches || Object.keys(newMap).length !== Object.keys(legendOptionsMap).length) setLegendOptionsMap(newMap);
      } catch (err) { console.error("Error fetching legend options:", err); } 
      finally { setIsLoadingLegendValues(false); }
    };
    fetchNeededLegendOptions();
  }, [activeTemplateStructure, selectedClient]);

  const newPlacementColumns = useMemo(() => {
    if (!selectedClient) {
      return [{ id: 'info', header: 'Info', CellComponent: () => <>Please select a client to begin.</> }];
    }
    if (templatesLoading) {
      return [{ id: 'loading-template', header: 'Loading Templates...', CellComponent: () => <Loader2Icon className="animate-spin mx-auto" /> }];
    }
    if (!activeTemplate) {
      return [{ id: 'info', header: 'Info', CellComponent: () => <>Please select a template to build placements.</> }];
    }
    return activeTemplateStructure.filter(c => c.type === 'field').map(c => {
        const fk = c.field;
        const bc = TEMPLATE_FIELDS[fk] || {};
        let ct = c.dataType || 'text';
        let co = [];

        if (c.dataType === 'database_lookup' && c.legendCategory) {
          ct = 'select';
          co = legendOptionsMap[c.legendCategory] || [];
          if (isLoadingLegendValues && co.length === 0) {
            co = [{ label: "Loading...", value: "" }];
          } else if (!isLoadingLegendValues && co.length === 0 && c.legendCategory) {
            co = [{ label: `No opt for ${c.legendCategory}`, value: "" }];
          }
        } else if (c.dataType === 'select' && c.customOptions) {
          ct = 'select';
          co = c.customOptions.split(',').map(o => ({ label: o.trim(), value: o.trim() }));
        }

        return {
          id: fk,
          header: (c.header || bc.label || fk) + (c.required ? ' *' : ''),
          accessor: fk,
          required: c.required !== undefined ? c.required : true,
          width: c.width || '180px',
          type: ct,
          options: ct === 'select' ? [{ label: `Select...`, value: '' }, ...co] : undefined,
          placeholder: c.placeholder || bc.placeholder || ''
        };
    });
  }, [selectedClient, activeTemplateStructure, legendOptionsMap, isLoadingLegendValues, templatesLoading, activeTemplate]);

  // --- RESTORED: These definitions are now back in place ---
  const existingPlacementGridColumns = useMemo(() => {
    const nameCol = { id: 'name', header: 'Placement Name', accessor: 'name', width: '300px', type: 'text', isReadOnly: true, CellComponent: ({ rowData }) => <TooltipCell text={rowData.name} /> };
    const parsedCols = newPlacementColumns.filter(c => c.id !== 'info' && !c.id?.startsWith('loading') && (TEMPLATE_FIELDS[c.accessor] || ['rate_type', 'start_date', 'end_date'].includes(c.accessor))).map(c => ({ ...c, isReadOnly: true, header: c.header.replace(' *', '') }));
    return [nameCol, ...parsedCols];
  }, [newPlacementColumns]);

  const existingPlacementsFormattedData = useMemo(() => {
    if (!existingPlacementsRaw || existingPlacementsRaw.length === 0) return [];
    return existingPlacementsRaw.map(p => ({ ...p, ...parsePlacementName(p.name, activeTemplateStructure, legendOptionsMap) }));
  }, [existingPlacementsRaw, activeTemplateStructure, legendOptionsMap]);
  // --- END OF RESTORED SECTION ---

  const previewName = useMemo(() => {
    if (!selectedClient || activeTemplateStructure.length === 0 || !newPlacementData[0] || Object.keys(newPlacementData[0]).length === 0) return 'Fill fields in the first row for preview.';
    return generatePlacementNameForRow(newPlacementData[0], activeTemplateStructure, clientData, legendOptionsMap);
  }, [activeTemplateStructure, newPlacementData, clientData, legendOptionsMap, selectedClient]);

  const clientOptions = useMemo(() => [{value: '', label: 'Select Client...'}, ...clients.map(c => ({ value: c.id, label: c.name }))], [clients]);
  const campaignOptions = useMemo(() => [{value: '', label: 'Select Campaign...'}, ...campaigns.map(c => ({ value: c.id, label: c.name }))], [campaigns]);
  
  const templateOptions = useMemo(() => {
    const options = availableTemplates.map(t => ({
      value: t.id,
      label: `${t.name} ${t.is_global ? '(Global)' : ''}`.trim()
    }));
    return [{ value: '', label: 'Select a Template...' }, ...options];
  }, [availableTemplates]);

  useEffect(() => { setNewPlacementData([{}]); if (selectedClient && selectedCampaign) refetchExistingPlacements(); }, [selectedClient, selectedCampaign, refetchExistingPlacements]);

  const handleSubmitNewPlacements = async (e) => {
    e.preventDefault();
    if (!selectedClient || !selectedCampaign || !selectedTemplateId) {
      alert('Client, Campaign, and a Template are required.');
      return;
    }
    const toSubmit = newPlacementData.filter(r => newPlacementColumns.filter(c => c.required && c.id !== 'info').every(c => r[c.accessor]?.toString().trim() !== '')).map(r => ({ ...r, name: generatePlacementNameForRow(r, activeTemplateStructure, clientData, legendOptionsMap) }));
    if (toSubmit.length === 0) { alert('No valid placements.'); return; }
    setIsSubmittingForm(true);
    try { await createPlacements({ placements:toSubmit, client_id:selectedClient, campaign_id:selectedCampaign }); setSuccessMessage('New placements saved!'); setShowSuccess(true); setTimeout(()=>setShowSuccess(false),3000); setNewPlacementData([{}]); refetchExistingPlacements(); }
    catch (err) { alert('Error creating: ' + err.message); }
    finally { setIsSubmittingForm(false); }
  };

  const handleCreateClientCB = async (data) => { await createClient(data); refetchClients(); setSuccessMessage('Client created!'); setShowSuccess(true); setTimeout(()=>setShowSuccess(false),3000); setShowAddClient(false); };
  const handleCreateCampaignCB = async (data) => { const p = {...data, client_id: data.client_id||selectedClient}; await createCampaign(p); refetchCampaigns(); setSuccessMessage('Campaign created!'); setShowSuccess(true); setTimeout(()=>setShowSuccess(false),3000); setShowAddCampaign(false); };

  const handleCopyPlacementToBuilder = (rowData) => {
    const copy = {...rowData}; delete copy.id; delete copy.name; delete copy.status; delete copy.dt_created; delete copy.dt_updated; delete copy.owner;
    const relevant = {}; newPlacementColumns.forEach(c => { if(copy.hasOwnProperty(c.accessor)) relevant[c.accessor] = copy[c.accessor]; });
    setNewPlacementData(prev => [...prev.filter(p => Object.keys(p).length > 0), relevant]);
    setSuccessMessage("Placement copied to builder."); setShowSuccess(true); setTimeout(()=>setShowSuccess(false),3000); window.scrollTo({top:0,behavior:'smooth'});
  };

  const handleEditExistingPlacement = (placement) => { setEditingPlacement(placement); setShowEditPlacementModal(true); };
  
  const handleSaveEditedPlacement = async (placementId, formDataFromModal) => {
    setIsSubmittingForm(true);
    try {
      const generatedName = generatePlacementNameForRow(formDataFromModal, activeTemplateStructure, clientData, legendOptionsMap);
      const payload = { 
        ...formDataFromModal, 
        name: generatedName, 
        client_id: selectedClient,
        campaign_id: selectedCampaign
      };
      await updatePlacement(placementId, payload);
      setSuccessMessage("Placement updated!"); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000);
      setShowEditPlacementModal(false); setEditingPlacement(null);
      refetchExistingPlacements();
    } catch (error) { alert("Error updating placement: " + error.message); }
    finally { setIsSubmittingForm(false); }
  };

  const handleDeleteExistingPlacementClick = (p) => { setPlacementToDelete(p); setShowConfirmDeleteModal(true); };
  const confirmDeleteExistingPlacement = async () => {
    if (!placementToDelete) return; setIsDeletingOperation(true);
    try { await deletePlacement(placementToDelete.id); setSuccessMessage("Placement deleted!"); setShowSuccess(true); setTimeout(()=>setShowSuccess(false),3000); setShowConfirmDeleteModal(false); setPlacementToDelete(null); refetchExistingPlacements(); }
    catch (err) { alert("Error deleting: " + err.message); }
    finally { setIsDeletingOperation(false); }
  };

  if (clientsLoading) return <LoadingSpinner />;
  if (clientsError) return <div className="text-red-500 p-4">Error clients: {clientsError.message}</div>;
  const isLoadingCritical = templatesLoading || isLoadingLegendValues;

  return (
    <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6"><h1 className="text-3xl font-bold">Placement Builder</h1><p>Create & manage placements.</p></div>
      {showSuccess && <div className="bg-green-100 border-green-400 text-green-700 p-3 rounded mb-6">{successMessage}</div>}

      <form onSubmit={handleSubmitNewPlacements} className="bg-white rounded-lg border shadow-sm mb-8">
        <div className="p-6 border-b">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1"><label className="text-sm font-medium">Client *</label><Button type="button" variant="outline" size="sm" icon={<PlusIcon size={14}/>} onClick={()=>setShowAddClient(true)} className="text-xs">Add</Button></div>
              <ReactSelect
                options={clientOptions}
                value={clientOptions.find(option => option.value === selectedClient) || null}
                onChange={option => {
                  const value = option ? option.value : '';
                  setSelectedClient(value);
                  setSelectedCampaign('');
                  setNewPlacementData([{}]);
                  setSelectedTemplateId('');
                }}
                fullWidth
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1"><label className="text-sm font-medium">Campaign *</label><Button type="button" variant="outline" size="sm" icon={<PlusIcon size={14}/>} onClick={()=>setShowAddCampaign(true)} disabled={!selectedClient||campaignsLoading} className="text-xs">Add</Button></div>
              <ReactSelect
                options={campaignOptions}
                value={campaignOptions.find(option => option.value === selectedCampaign) || null}
                onChange={option => {
                  const value = option ? option.value : '';
                  setSelectedCampaign(value);
                  setNewPlacementData([{}]);
                }}
                fullWidth
                required
                disabled={!selectedClient||campaignsLoading}
              />
              {campaignsLoading && selectedClient && <p className="text-xs mt-1">Loading campaigns...</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Template *</label>
              <ReactSelect
                options={templateOptions}
                value={templateOptions.find(option => option.value === selectedTemplateId) || null}
                onChange={option => {
                  const value = option ? option.value : '';
                  setSelectedTemplateId(value);
                }}
                fullWidth
                required 
                disabled={!selectedClient || templatesLoading}
              />
            </div>
          </div>
          {selectedClient && isLoadingCritical && <div className="mt-4 p-2 flex items-center justify-center"><Loader2Icon className="animate-spin h-5 w-5"/> <span className="ml-2 text-sm">Loading templates...</span></div>}
          {selectedClient && !isLoadingCritical && activeTemplate && (
            <div className="mt-6 p-4 bg-[#fff8ee] border border-[#fbb832]/30 rounded-md">
              <InfoIcon size={20} className="text-[#fbb832] mr-2 float-left"/>
              <div className="ml-8">
                <p className="text-sm font-medium mb-1">Using: {activeTemplateDisplayName}</p>
                {activeTemplateStructure.length > 0 && <div className="text-xs mb-2">Struct: {activeTemplateStructure.map(c=>c.type==='field'?`{${c.field}}`:c.text).join(activeTemplateStructure[0]?.separator||'_')}</div>}
                {newPlacementData.length > 0 && Object.keys(newPlacementData[0]).length > 0 && activeTemplateStructure.length > 0 && (
                  <div><p className="text-sm mb-1">Preview (1st row):</p><div className="bg-white p-2 border font-mono text-sm break-all">{previewName}</div></div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">Add New Placements</h2>{newPlacementColumns.length > 1 && !newPlacementColumns[0]?.id?.startsWith('loading') && newPlacementColumns[0]?.id !== 'info' && <span className="text-xs bg-blue-50 text-blue-700 p-1 rounded">Scroll for more →</span>}</div>
          <SpreadsheetGrid columns={newPlacementColumns} data={newPlacementData} onChange={setNewPlacementData} minRows={1} addRowText="Add New Row"/>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-sm">{newPlacementData.filter(r => newPlacementColumns.filter(c=>c.required&&c.id!=='info').every(c=>r[c.accessor]?.toString().trim()!=='')).length} valid new.</div>
          <Button type="submit" variant="secondary" icon={<SaveIcon size={18}/>} disabled={!selectedClient||!selectedCampaign||!selectedTemplateId||isSubmittingForm||isLoadingCritical}> {isSubmittingForm?'Saving...':'Save New Placements'} </Button>
        </div>
      </form>

      {selectedClient && selectedCampaign && (
        <div className="mt-10 bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b flex justify-between items-center">
            <div><h2 className="text-xl font-semibold">Existing Placements for "{campaignData?.name||'Campaign'}"</h2><p className="text-sm">Client: {clientData?.name}</p></div>
            <Button variant="outline" size="sm" onClick={refetchExistingPlacements} disabled={existingPlacementsLoading} icon={<RefreshCwIcon size={14}/>}>{existingPlacementsLoading?"Refreshing...":"Refresh"}</Button>
          </div>
          <div className="p-6">
            {existingPlacementsLoading && <div className="flex justify-center p-4"><Loader2Icon className="animate-spin h-8 w-8"/></div>}
            {existingPlacementsError && <div className="text-red-500 p-4">Error: {existingPlacementsError.message}</div>}
            {!existingPlacementsLoading && !existingPlacementsError && (
              existingPlacementsFormattedData.length > 0 ? (
                <SpreadsheetGrid columns={existingPlacementGridColumns} data={existingPlacementsFormattedData} onChange={()=>{}} minRows={0} isReadOnly={true} hideAddRowButton={true}
                  actionColumn={{ header:'Actions', width:'200px', CellComponent:({rowData})=>(
                    <div className="flex items-center justify-center space-x-1 py-1">
                      <Button variant="outline" size="sm" icon={<CopyIcon size={12}/>} onClick={()=>handleCopyPlacementToBuilder(rowData)} title="Copy to Table">Copy</Button>
                      <Button variant="outline" size="sm" icon={<Edit2Icon size={12}/>} onClick={()=>handleEditExistingPlacement(rowData)} title="Edit">Edit</Button>
                      <Button variant="outline" size="sm" icon={<Trash2Icon size={12}/>} onClick={()=>handleDeleteExistingPlacementClick(rowData)} title="Delete" className="hover:bg-red-50 hover:text-red-600">Del</Button>
                    </div>
                  )}}/>
              ) : <p className="text-sm text-center py-4">No placements found.</p>
            )}
          </div>
        </div>
      )}

      <AddClientModal isOpen={showAddClient} onClose={()=>setShowAddClient(false)} onSave={handleCreateClientCB}/>
      <AddCampaignModal isOpen={showAddCampaign} onClose={()=>setShowAddCampaign(false)} onSave={handleCreateCampaignCB} clients={clients}/>
      <ConfirmDeleteModal isOpen={showConfirmDeleteModal} onClose={()=>{setShowConfirmDeleteModal(false);setPlacementToDelete(null);}} onConfirm={confirmDeleteExistingPlacement} title="Delete Placement" message={`Delete placement "${placementToDelete?.name||''}"?`} itemName={placementToDelete?.name} isDeleting={isDeletingOperation}/>
      {showEditPlacementModal && editingPlacement && (
        <EditPlacementModal 
          isOpen={showEditPlacementModal}
          onClose={() => {setShowEditPlacementModal(false); setEditingPlacement(null);}}
          onSave={handleSaveEditedPlacement}
          placement={editingPlacement}
          templateStructure={activeTemplateStructure}
          legendOptionsMap={legendOptionsMap}
          clientData={clientData}
          campaignData={campaignData}
          isSubmitting={isSubmittingForm}
        />
      )}
    </div>
  );
};