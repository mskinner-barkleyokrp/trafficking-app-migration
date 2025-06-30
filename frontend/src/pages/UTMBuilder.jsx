// src/pages/UTMBuilder.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { SaveIcon, LinkIcon, CopyIcon, Loader2Icon, InfoIcon, Edit2Icon, Trash2Icon, RefreshCwIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ReactSelect } from '../components/Select';
import { SpreadsheetGrid } from '../components/SpreadsheetGrid';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EditUtmModal } from '../components/EditUtmModal';
import { useClients } from '../hooks/useClients';
import { useCampaigns } from '../hooks/useCampaigns';
import { useTemplates } from '../hooks/useTemplates';
import { useUtms } from '../hooks/useUtms';
import { apiClient } from '../lib/api';
import { TEMPLATE_FIELDS } from '../components/TemplateBuilder';

const defaultSources = [ { value: '', label: 'Select Source...' }, { value: 'google', label: 'Google' }, { value: 'facebook', label: 'Facebook' }, { value: 'instagram', label: 'Instagram' }, { value: 'twitter', label: 'Twitter' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'email', label: 'Email Newsletter' }, { value: 'direct', label: 'Direct' }, { value: 'other', label: 'Other' }];
const defaultMediums = [ { value: '', label: 'Select Medium...' }, { value: 'cpc', label: 'CPC (Paid Search)' }, { value: 'social', label: 'Social Media' }, { value: 'email', label: 'Email' }, { value: 'display', label: 'Display Ads' }, { value: 'affiliate', label: 'Affiliate' }, { value: 'referral', label: 'Referral' }, { value: 'organic', label: 'Organic Search' }];

const applyUrlFormat = (value, format) => {
  if (!value) return '';
  const str = String(value);

  switch (format) {
    case 'camelCase':
      return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      ).replace(/\s+/g, '');
    case 'kebab-case':
      return str.replace(/\s+/g, '-');
    case 'lowercase':
      return str.toLowerCase().replace(/\s+/g, '');
    case 'lowercase-kebab':
      return str.toLowerCase().replace(/\s+/g, '-');
    default:
      return str.replace(/\s+/g, '-'); // Default to kebab-case
  }
};

export const UTMBuilder = () => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedUtmTemplateId, setSelectedUtmTemplateId] = useState('');
  
  const [utmData, setUtmData] = useState([{}]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSavingNewUtms, setIsSavingNewUtms] = useState(false);
  const [isUpdatingUtm, setIsUpdatingUtm] = useState(false);
  const [isDeletingUtm, setIsDeletingUtm] = useState(false);

  const [previewURL, setPreviewURL] = useState('');
  const [legendOptionsMap, setLegendOptionsMap] = useState({});
  const [isLoadingLegendValues, setIsLoadingLegendValues] = useState(false);

  const [editingUtm, setEditingUtm] = useState(null);
  const [showEditUtmModal, setShowEditUtmModal] = useState(false);
  const [utmToDelete, setUtmToDelete] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);


  const { clients, loading: clientsLoading } = useClients();
  const { campaigns, loading: campaignsLoading } = useCampaigns(selectedClientId);
  const { templates: utmTemplates, loading: utmTemplatesLoading } = useTemplates(selectedClientId, 'utm');
  
  const { 
    utms: existingUtmsData, 
    loadingUtms: existingUtmsLoading, 
    errorUtms: existingUtmsError,
    createMultipleUtms, 
    updateSingleUtm, 
    deleteSingleUtm,
    refetchUtms: refetchExistingUtms
  } = useUtms(selectedClientId || selectedCampaignId ? { client_id: selectedClientId, campaign_id: selectedCampaignId } : {});
  
  const clientDataForDisplay = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
  const campaignDataForDisplay = useMemo(() => campaigns.find(c => c.id === selectedCampaignId), [campaigns, selectedCampaignId]);


  const activeUtmTemplate = useMemo(() => {
    if (!selectedUtmTemplateId) return null;
    return utmTemplates.find(t => t.id === selectedUtmTemplateId);
  }, [selectedUtmTemplateId, utmTemplates]);

  const activeTemplateStructure = useMemo(() => activeUtmTemplate?.template_structure?.components || [], [activeUtmTemplate]);
  const activeUrlFormat = useMemo(() => activeUtmTemplate?.template_structure?.urlFormat || 'kebab-case', [activeUtmTemplate]);

  useEffect(() => {
    const fetchNeededLegendOptions = async () => {
      if (!activeTemplateStructure || activeTemplateStructure.length === 0) {
        setLegendOptionsMap({}); setIsLoadingLegendValues(false); return;
      }
      const categoriesToFetch = new Set();
      activeTemplateStructure.forEach(c => {
        if (c.type === 'field' && c.dataType === 'database_lookup' && c.legendCategory) {
          categoriesToFetch.add(c.legendCategory);
        }
      });

      if (categoriesToFetch.size === 0) {
        setLegendOptionsMap({}); setIsLoadingLegendValues(false); return;
      }
      setIsLoadingLegendValues(true);
      const newMap = { ...legendOptionsMap };
      let newFetches = false;
      try {
        for (const cat of categoriesToFetch) {
          if (!newMap[cat] || newMap[cat].length === 0) {
            newMap[cat] = await apiClient.getLegendFields(cat) || [];
            newFetches = true;
          }
        }
        if (newFetches || Object.keys(newMap).length !== Object.keys(legendOptionsMap).length) {
          setLegendOptionsMap(newMap);
        }
      } catch (err) { console.error("Error fetching legend options for UTM builder:", err); }
      finally { setIsLoadingLegendValues(false); }
    };
    fetchNeededLegendOptions();
  }, [activeTemplateStructure]);


  const generateFullUtmUrl = useCallback((rowData, template, campaignNameFromSelection) => {
    if (!rowData ) { return ''; }
    
    const urlFormat = template?.template_structure?.urlFormat || 'kebab-case';
  
    let baseUrl = '';
    const lpFieldKey = template?.template_structure?.components?.find(c => c.field === 'landing_page')?.field || 'landingPageUrl';
    let lpValue = rowData[lpFieldKey];

    if (lpValue) {
        baseUrl = String(lpValue).startsWith('http') ? lpValue : `https://${lpValue}`;
    } else {
        return 'Error: Landing Page URL is required.';
    }
  
    try { new URL(baseUrl); }
    catch (e) { return `Error: Invalid base URL (${baseUrl}).`; }
  
    const queryParams = [];
    const paramFields = ['source', 'medium', 'campaign', 'term', 'content'];

    paramFields.forEach(utmKey => {
        let value = rowData[utmKey];
        if (utmKey === 'campaign' && campaignNameFromSelection) {
            value = campaignNameFromSelection;
        }
        if (value && String(value).trim() !== '') {
            const transformedValue = applyUrlFormat(value, urlFormat);
            queryParams.push(`utm_${utmKey}=${encodeURIComponent(transformedValue)}`);
        }
    });
  
    if (!baseUrl) return '';
    return queryParams.length > 0 ? `${baseUrl}?${queryParams.join('&')}` : baseUrl;
  }, []);


  const utmSpreadsheetColumns = useMemo(() => {
    let columns = [];
    if (activeTemplateStructure.length > 0) {
        columns = activeTemplateStructure
            .filter(comp => comp.type === 'field' && TEMPLATE_FIELDS[comp.field])
            .map(comp => {
                const fieldKey = comp.field;
                const baseConfig = TEMPLATE_FIELDS[fieldKey] || {};
                let colType = comp.dataType || baseConfig.type || 'text';
                let colOptions = [];

                // --- CORRECTED LOGIC: Prioritize template settings over defaults ---
                if (comp.dataType === 'database_lookup' && comp.legendCategory) {
                    colType = 'select';
                    colOptions = [{ label: `Select ${comp.header || baseConfig.label}...`, value: '' }, ...(legendOptionsMap[comp.legendCategory] || [])];
                    if (isLoadingLegendValues && colOptions.length === 1) colOptions.push({label:"Loading...",value:""});
                } else if (comp.dataType === 'select' && comp.customOptions) {
                    colType = 'select';
                    colOptions = [{ label: `Select ${comp.header || baseConfig.label}...`, value: '' }, ...comp.customOptions.split(',').map(opt => ({ label: opt.trim(), value: opt.trim() }))];
                } else {
                    // Fallback to defaults only if no specific select type is defined in the template
                    if (fieldKey === 'source') {
                        colType = 'select';
                        colOptions = defaultSources;
                    } else if (fieldKey === 'medium') {
                        colType = 'select';
                        colOptions = defaultMediums;
                    }
                }

                return {
                    id: fieldKey,
                    header: (comp.header || baseConfig.label || fieldKey) + (comp.required ? ' *' : ''),
                    accessor: fieldKey,
                    type: colType,
                    options: colOptions.length > 0 ? colOptions : undefined,
                    required: comp.required === true,
                    placeholder: comp.placeholder || baseConfig.description || `Enter ${fieldKey}`,
                    width: comp.width || (fieldKey === 'landing_page' ? '250px' : '180px'),
                };
            });
    } else {
        columns = [
            { id: 'landingPageUrl', header: 'Landing Page URL *', accessor: 'landingPageUrl', required: true, width: '250px', placeholder: 'https://example.com/page' },
            { id: 'source', header: 'Source *', accessor: 'source', type: 'select', options: defaultSources, required: true, width: '160px' },
            { id: 'medium', header: 'Medium *', accessor: 'medium', type: 'select', options: defaultMediums, required: true, width: '160px' },
            { id: 'campaign', header: 'Campaign', accessor: 'campaign', placeholder: 'e.g., summer_promo', required: false },
            { id: 'term', header: 'Term', accessor: 'term', placeholder: 'e.g., blue_widgets', required: false },
            { id: 'content', header: 'Content', accessor: 'content', placeholder: 'e.g., banner_ad_v1', required: false },
        ];
    }

    columns.push({
        id: 'generatedUrl',
        header: 'Generated UTM URL',
        accessor: 'generatedUrl',
        isReadOnly: true,
        width: '350px',
        CellComponent: ({ rowData }) => {
            const campaignNameFromSelection = selectedCampaignId ? (campaigns.find(c => c.id === selectedCampaignId)?.name || '') : '';
            const url = generateFullUtmUrl(rowData, activeUtmTemplate, campaignNameFromSelection);
            return (
              <div className="flex items-center">
                <span className="text-xs truncate py-1 flex-grow" title={url}>{url || '-'}</span>
                {url && !url.startsWith('Error:') && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(url)}
                    className="ml-2 p-1 text-gray-400 hover:text-[#fbb832] focus:outline-none"
                    title="Copy URL"
                  >
                    <CopyIcon size={14} />
                  </button>
                )}
              </div>
            );
        }
    });
    return columns;
  }, [activeTemplateStructure, legendOptionsMap, isLoadingLegendValues, selectedCampaignId, campaigns, generateFullUtmUrl, activeUtmTemplate]);
  const modalSelectOptions = useMemo(() => {
    // Find the column definitions for source and medium from the dynamic grid columns
    const sourceCol = utmSpreadsheetColumns.find(col => col.accessor === 'source');
    const mediumCol = utmSpreadsheetColumns.find(col => col.accessor === 'medium');

    // Return the options from those columns, or fallback to the defaults if they aren't select columns
    return {
      source: sourceCol?.type === 'select' ? sourceCol.options : defaultSources,
      medium: mediumCol?.type === 'select' ? mediumCol.options : defaultMediums,
    };
  }, [utmSpreadsheetColumns]);


  useEffect(() => {
    if (utmData.length > 0 ) {
        const campaignName = selectedCampaignId ? (campaigns.find(c => c.id === selectedCampaignId)?.name || '') : '';
        const generated = generateFullUtmUrl(utmData[0], activeUtmTemplate, campaignName);
        setPreviewURL(generated);
    } else {
        setPreviewURL('');
    }
  }, [selectedCampaignId, campaigns, utmData, activeUtmTemplate, generateFullUtmUrl]);


  const handleSubmitNewUtms = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const evaluatedRows = utmData.map((row, index) => {
      const isRowEmpty = Object.values(row).every(val => val === '' || val === undefined || val === null);
      if (isRowEmpty && utmData.length > 1) {
          return { ...row, rowIndex: index, isInvalid: false, isEmptyAndSkippable: true, validationReasons: ["Row is empty and skippable."] };
      }
      if (isRowEmpty && utmData.length === 1) {
          return { ...row, rowIndex: index, isInvalid: true, validationReasons: ["The only row is empty."] };
      }

      let isInvalid = false;
      const reasons = [];
      const lpAccessor = activeTemplateStructure.find(c => c.field === 'landing_page')?.field || 'landingPageUrl';
      
      if (!row.source || String(row.source).trim() === '') { isInvalid = true; reasons.push("Source is missing."); }
      if (!row.medium || String(row.medium).trim() === '') { isInvalid = true; reasons.push("Medium is missing."); }
      
      const lpIsRequired = activeTemplateStructure.find(col => col.accessor === lpAccessor)?.required ?? true;
      if (lpIsRequired && (!row[lpAccessor] || String(row[lpAccessor]).trim() === '')) {
        isInvalid = true;
        reasons.push(`Landing Page is required.`);
      }
      
      return { ...row, rowIndex: index, isInvalid, validationReasons: reasons, isEmptyAndSkippable: false };
    });

    const actualInvalidRows = evaluatedRows.filter(row => row.isInvalid && !row.isEmptyAndSkippable);
                                      
    if (actualInvalidRows.length > 0) {
      const firstInvalidRow = actualInvalidRows[0];
      const reasonsString = firstInvalidRow.validationReasons.join(' ');
      setErrorMessage(`Error in Row ${firstInvalidRow.rowIndex + 1}: ${reasonsString}.`);
      return;
    }
    
    const utmsToSave = evaluatedRows
      .filter(row => !row.isInvalid && !row.isEmptyAndSkippable)
      .map(row => {
        const campaignNameForUrl = selectedCampaignId ? (campaigns.find(c => c.id === selectedCampaignId)?.name || '') : (row.campaign || '');
        return {
            client_id: selectedClientId || null,
            campaign_id: selectedCampaignId || null,
            source: row.source,
            medium: row.medium,
            term: row.term || null,
            content: row.content || null,
            full_url: generateFullUtmUrl(row, activeUtmTemplate, campaignNameForUrl),
        };
    });

    if (utmsToSave.length === 0) {
      setErrorMessage('No valid UTMs to save.');
      return;
    }

    setIsSavingNewUtms(true);
    try {
      const createdUtms = await createMultipleUtms(utmsToSave);
      setSuccessMessage(`${createdUtms.length} UTM(s) saved successfully!`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setUtmData([{}]);
      refetchExistingUtms();
    } catch (error) {
      setErrorMessage(`Failed to save UTMs: ${error.message}`);
    } finally {
      setIsSavingNewUtms(false);
    }
  };

  const copyPreviewToClipboard = () => {
    if (previewURL && !previewURL.startsWith('Error:')) {
      navigator.clipboard.writeText(previewURL);
    }
  };

  const handleEditUtmClick = (utm) => {
    setEditingUtm(utm);
    setShowEditUtmModal(true);
  };

  const handleSaveEditedUtm = async (utmId, formData) => {
    setIsUpdatingUtm(true);
    setErrorMessage(''); setSuccessMessage('');
    try {
      await updateSingleUtm(utmId, formData);
      setSuccessMessage('UTM updated successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowEditUtmModal(false);
      setEditingUtm(null);
      refetchExistingUtms();
    } catch (error) {
      setErrorMessage(`Failed to update UTM: ${error.message}`);
    } finally {
      setIsUpdatingUtm(false);
    }
  };

  const handleDeleteUtmClick = (utm) => {
    setUtmToDelete(utm);
    setShowConfirmDeleteModal(true);
  };

  const handleConfirmDeleteUtm = async () => {
    if (!utmToDelete) return;
    setIsDeletingUtm(true);
    setErrorMessage(''); setSuccessMessage('');
    try {
      await deleteSingleUtm(utmToDelete.id);
      setSuccessMessage('UTM deleted successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowConfirmDeleteModal(false);
      setUtmToDelete(null);
      refetchExistingUtms();
    } catch (error) {
      setErrorMessage(`Failed to delete UTM: ${error.message}`);
    } finally {
      setIsDeletingUtm(false);
    }
  };
  
  const handleCopyUtmToBuilder = (utmToCopy) => {
    const newRow = {};
    const landingPageFromFull = (fullUrl) => {
        if (!fullUrl) return '';
        try { const urlObj = new URL(fullUrl); return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`; }
        catch (e) { const parts = fullUrl.split('?'); return parts[0] || '';}
    };

    const lpAccessor = activeTemplateStructure.find(c => c.field === 'landing_page')?.field || 'landingPageUrl';
    newRow[lpAccessor] = landingPageFromFull(utmToCopy.full_url);

    ['source', 'medium', 'term', 'content'].forEach(key => {
        const templateFieldKey = activeTemplateStructure.find(c => c.field === key)?.field || key;
        newRow[templateFieldKey] = utmToCopy[key] || '';
    });
    
    const campaignFieldKey = activeTemplateStructure.find(c => c.field === 'campaign')?.field || 'campaign';
    let utmCampaignValue = '';
    if (utmToCopy.full_url) {
        try {
            const urlParams = new URLSearchParams(new URL(utmToCopy.full_url).search);
            utmCampaignValue = urlParams.get('utm_campaign') || '';
        } catch (e) { /* failed to parse */ }
    }
    newRow[campaignFieldKey] = utmCampaignValue || utmToCopy.campaign_name || '';

    setUtmData(prev => [...prev.filter(p => Object.values(p).some(val => val !== '')), newRow]);
    setSuccessMessage("UTM copied to builder. Scroll up to edit.");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clientOptions = useMemo(() => [{ value: '', label: 'Select Client...' }, ...clients.map(c => ({ value: c.id, label: c.name }))], [clients]);
  const campaignOptionsForSelect = useMemo(() => [{ value: '', label: 'Select Campaign...' }, ...campaigns.map(c => ({ value: c.id, label: c.name }))], [campaigns]);
  const utmTemplateOptions = useMemo(() => [{ value: '', label: 'Select UTM Template' }, ...utmTemplates.map(t => ({ value: t.id, label: `${t.name}${t.is_global ? " (Global)" : (t.client_name ? ` (${t.client_name})`:"")}` }))], [utmTemplates]);

  const existingUtmsGridColumns = useMemo(() => [
    { id: 'client_name', header: 'Client', accessor: 'client_name', width: '150px', isReadOnly: true, CellComponent: ({rowData}) => <span className="truncate block w-full" title={rowData.client_name}>{rowData.client_name || '-'}</span> },
    { id: 'campaign_name', header: 'Campaign', accessor: 'campaign_name', width: '180px', isReadOnly: true, CellComponent: ({rowData}) => <span className="truncate block w-full" title={rowData.campaign_name}>{rowData.campaign_name || '-'}</span> },
    { id: 'source', header: 'Source', accessor: 'source', width: '120px', isReadOnly: true },
    { id: 'medium', header: 'Medium', accessor: 'medium', width: '120px', isReadOnly: true },
    { id: 'term', header: 'Term', accessor: 'term', width: '120px', isReadOnly: true, CellComponent: ({rowData}) => <span className="truncate block w-full" title={rowData.term}>{rowData.term || '-'}</span> },
    { id: 'content', header: 'Content', accessor: 'content', width: '150px', isReadOnly: true, CellComponent: ({rowData}) => <span className="truncate block w-full" title={rowData.content}>{rowData.content || '-'}</span> },
    { id: 'full_url', header: 'Full URL', accessor: 'full_url', width: '300px', isReadOnly: true, CellComponent: ({rowData}) => <span className="truncate block w-full" title={rowData.full_url}>{rowData.full_url}</span> },
    { id: 'dt_created', header: 'Created', accessor: 'dt_created', width: '120px', isReadOnly: true, CellComponent: ({rowData}) => <span className="w-full">{new Date(rowData.dt_created).toLocaleDateString()}</span> },
  ], []);
  
  useEffect(() => {
    if (selectedClientId || selectedCampaignId) {
        refetchExistingUtms();
    }
  }, [selectedClientId, selectedCampaignId, refetchExistingUtms]);


  return (
    <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">UTM Builder</h1>
        <p className="text-gray-700">
          Create and manage UTM parameters for campaign tracking, optionally using templates.
        </p>
      </div>
      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
          <span className="mr-2">✓</span>
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
          <span className="mr-2">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}
      <form
        onSubmit={handleSubmitNewUtms}
        className="bg-white p-6 rounded-lg border border-black/10 shadow-sm mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ReactSelect 
            label="Client (Optional)" 
            options={clientOptions} 
            value={clientOptions.find(option => option.value === selectedClientId) || null}
            onChange={option => {
              const value = option ? option.value : '';
              setSelectedClientId(value);
              setSelectedCampaignId('');
              setUtmData([{}]);
            }}
            fullWidth 
            disabled={clientsLoading} 
          />
          <ReactSelect 
            label="Campaign (Optional)" 
            options={campaignOptionsForSelect} 
            value={campaignOptionsForSelect.find(option => option.value === selectedCampaignId) || null}
            onChange={option => {
              const value = option ? option.value : '';
              setSelectedCampaignId(value);
              setUtmData([{}]);
            }} 
            fullWidth 
            disabled={campaignsLoading || !selectedClientId} 
          />
          <ReactSelect 
            label="UTM Template" 
            options={utmTemplateOptions} 
            value={utmTemplateOptions.find(option => option.value === selectedUtmTemplateId) || null}
            onChange={option => {
              const value = option ? option.value : '';
              setSelectedUtmTemplateId(value);
              setUtmData([{}]);
            }}
            fullWidth 
            disabled={utmTemplatesLoading || !selectedClientId} 
          />
        </div>

        { (utmTemplatesLoading && selectedUtmTemplateId) &&
            <div className="my-4 p-4 flex items-center justify-center text-sm text-gray-600">
                <Loader2Icon className="animate-spin h-5 w-5 mr-2" /> Loading template resources...
            </div>
        }

        {activeUtmTemplate && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                <InfoIcon size={18} className="inline mr-2" />
                Using template: <strong>{activeUtmTemplate.name}</strong> (Format: {activeUrlFormat}).
            </div>
        )}

        {previewURL && (
          <div className="mb-6 p-3 bg-[#fff8ee] border border-[#fbb832]/30 rounded-md">
            <div className="flex items-center mb-2">
              <LinkIcon size={16} className="text-[#fbb832] mr-2" />
              <p className="text-sm font-medium">UTM Preview (First Row)</p>
            </div>
            <div className="flex items-center">
              <div className={`flex-1 font-mono text-sm bg-white px-3 py-2 rounded border border-black/10 overflow-x-auto ${previewURL.startsWith('Error:') ? 'text-red-600' : ''}`}>
                {previewURL}
              </div>
              {!previewURL.startsWith('Error:') && (
                <button type="button" onClick={copyPreviewToClipboard} className="ml-2 p-2 text-gray-500 hover:text-[#fbb832] focus:outline-none" title="Copy to clipboard">
                  <CopyIcon size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">UTM Parameters Grid (Create New)</h2>
            { utmSpreadsheetColumns.length > 1 && !utmSpreadsheetColumns[0]?.id?.startsWith('loading') && utmSpreadsheetColumns[0]?.id !== 'info' && <span className="text-xs bg-blue-50 text-blue-700 p-1 rounded">Scroll for more →</span>}
          </div>
          <SpreadsheetGrid
            columns={utmSpreadsheetColumns}
            data={utmData}
            onChange={setUtmData}
            minRows={1}
            addRowText="Add UTM Row"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" icon={isSavingNewUtms ? <Loader2Icon size={18} className="animate-spin"/> : <SaveIcon size={18} />} disabled={isSavingNewUtms} >
            {isSavingNewUtms ? 'Saving...' : 'Save New UTMs'}
          </Button>
        </div>
      </form>
      
      <div className="mt-10 bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Existing UTMs</h2>
            {(selectedClientId || selectedCampaignId) && (
                <p className="text-sm text-gray-600">
                    {selectedClientId && `Client: ${clientDataForDisplay?.name || 'Selected Client'}`}
                    {selectedClientId && selectedCampaignId && " | "}
                    {selectedCampaignId && `Campaign: ${campaignDataForDisplay?.name || 'Selected Campaign'}`}
                </p>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetchExistingUtms} 
            disabled={existingUtmsLoading} 
            icon={<RefreshCwIcon size={14}/>}
          >
            {existingUtmsLoading ? "Refreshing..." : "Refresh List"}
          </Button>
        </div>
        <div className="p-6">
          {existingUtmsLoading && <div className="flex justify-center p-4"><Loader2Icon className="animate-spin h-8 w-8 text-[#fbb832]"/></div>}
          {existingUtmsError && <div className="text-red-500 p-4 text-center">Error loading UTMs: {existingUtmsError.message}</div>}
          {!existingUtmsLoading && !existingUtmsError && (
            existingUtmsData.length > 0 ? (
              <SpreadsheetGrid
                columns={existingUtmsGridColumns}
                data={existingUtmsData}
                onChange={() => {}}
                isReadOnly={true}
                hideAddRowButton={true}
                actionColumn={{
                  header: 'Actions',
                  width: '180px',
                  cellClassName: 'px-1 py-1',
                  CellComponent: ({ rowData }) => (
                    <div className="flex items-center justify-center space-x-1 w-full">
                      <Button variant="outline" size="sm" icon={<CopyIcon size={12}/>} onClick={() => handleCopyUtmToBuilder(rowData)} title="Copy to Builder" className="!text-xs !px-1.5 !py-0.5">Copy</Button>
                      <Button variant="outline" size="sm" icon={<Edit2Icon size={12}/>} onClick={() => handleEditUtmClick(rowData)} title="Edit UTM" className="!text-xs !px-1.5 !py-0.5">Edit</Button>
                      <Button variant="outline" size="sm" icon={<Trash2Icon size={12}/>} onClick={() => handleDeleteUtmClick(rowData)} title="Delete UTM" className="!text-xs !px-1.5 !py-0.5 hover:bg-red-50 hover:text-red-600">Del</Button>
                    </div>
                  )
                }}
              />
            ) : (
              <p className="text-sm text-center py-4 text-gray-500">
                {selectedClientId || selectedCampaignId ? 'No UTMs found for the selected client/campaign.' : 'Select a client/campaign to view existing UTMs.'}
              </p>
            )
          )}
        </div>
      </div>
      
      {showEditUtmModal && editingUtm && (
        <EditUtmModal
          isOpen={showEditUtmModal}
          onClose={() => { setShowEditUtmModal(false); setEditingUtm(null); }}
          onSave={handleSaveEditedUtm}
          utm={editingUtm}
          generateFullUtmUrlCallback={(data) => generateFullUtmUrl(data, activeUtmTemplate, null)}
          isSubmitting={isUpdatingUtm}
          clientName={editingUtm.client_name}
          campaignName={editingUtm.campaign_name}
          sourceOptions={modalSelectOptions.source}
          mediumOptions={modalSelectOptions.medium}
        />
      )}
      <ConfirmDeleteModal
        isOpen={showConfirmDeleteModal}
        onClose={() => { setShowConfirmDeleteModal(false); setUtmToDelete(null); }}
        onConfirm={handleConfirmDeleteUtm}
        title="Delete UTM"
        message={`Are you sure you want to delete this UTM? This action cannot be undone.`}
        itemName={`Source: ${utmToDelete?.source}, Medium: ${utmToDelete?.medium}`}
        isDeleting={isDeletingUtm}
      />
    </div>
  )
}