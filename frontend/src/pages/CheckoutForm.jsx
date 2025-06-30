// src/pages/CheckoutForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Loader2Icon, PlusIcon, TrashIcon, SaveIcon, AlertCircleIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ReactSelect } from '../components/Select';
import { useAuth } from '../contexts/AuthContext';
import { useClients } from '../hooks/useClients';
import { useCampaigns } from '../hooks/useCampaigns';
import { usePlacements } from '../hooks/usePlacements';
import { useUtms } from '../hooks/useUtms';
import { apiClient } from '../lib/api';

export const CheckoutForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  
  const { clients, loading: clientsLoading } = useClients();
  const { campaigns, loading: campaignsLoading } = useCampaigns(selectedClientId);

  const { placements: availablePlacements, loading: placementsLoading } = usePlacements(
    selectedClientId && selectedCampaignId ? { client_id: selectedClientId, campaign_id: selectedCampaignId } : {}
  );
  
  // --- CORRECTED: Fetch UTMs based only on the client ---
  const { utms: availableUtms, loading: utmsLoading } = useUtms(
    selectedClientId ? { client_id: selectedClientId } : {}
  );

  const [selectedPlacementIds, setSelectedPlacementIds] = useState([]);
  const [placementCreativeData, setPlacementCreativeData] = useState({});
  
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const clientOptions = useMemo(() => [{ value: '', label: 'Select Client...' }, ...clients.map(c => ({ value: c.id, label: c.name }))], [clients]);
  const campaignOptions = useMemo(() => [{ value: '', label: 'Select Campaign...' }, ...campaigns.map(c => ({ value: c.id, label: c.name }))], [campaigns]);
  
  const utmOptionsForSelect = useMemo(() => {
    if (!availableUtms || availableUtms.length === 0) {
      return [{ value: '', label: selectedClientId ? 'No UTMs found for this client' : 'Select a client to see UTMs' }];
    }
    return [
        { value: '', label: 'Select UTM Link...' }, 
        ...availableUtms.map(utm => ({ 
            value: utm.full_url, 
            label: `${utm.source}/${utm.medium} - ${utm.full_url.substring(0,50)}...` 
        }))
    ];
  }, [availableUtms, selectedClientId]);

  useEffect(() => {
    setSelectedCampaignId('');
    setSelectedPlacementIds([]);
    setPlacementCreativeData({});
  }, [selectedClientId]);

  useEffect(() => {
    setSelectedPlacementIds([]);
    setPlacementCreativeData({});
  }, [selectedCampaignId]);

  const handlePlacementSelect = (placementId, placementName) => {
    setSelectedPlacementIds(prev => {
      const newSelectedIds = prev.includes(placementId)
        ? prev.filter(id => id !== placementId)
        : [...prev, placementId];

      setPlacementCreativeData(currentData => {
        const newData = { ...currentData };
        if (newSelectedIds.includes(placementId) && !newData[placementId]) {
          newData[placementId] = { placementName, creatives: [] };
        } else if (!newSelectedIds.includes(placementId)) {
          delete newData[placementId];
        }
        return newData;
      });
      return newSelectedIds;
    });
  };

  const addCreativeToPlacement = (placementId) => {
    setPlacementCreativeData(prev => ({
      ...prev,
      [placementId]: {
        ...prev[placementId],
        creatives: [
          ...prev[placementId].creatives,
          { id: Date.now().toString(), creativeName: '', startDate: '', endDate: '', utmFullUrl: '', noIas: false }
        ]
      }
    }));
  };

  const updateCreativeField = (placementId, creativeId, field, value) => {
    setPlacementCreativeData(prev => ({
      ...prev,
      [placementId]: {
        ...prev[placementId],
        creatives: prev[placementId].creatives.map(c => 
          c.id === creativeId ? { ...c, [field]: value } : c
        )
      }
    }));
  };
  
  const removeCreativeFromPlacement = (placementId, creativeId) => {
    setPlacementCreativeData(prev => ({
      ...prev,
      [placementId]: {
        ...prev[placementId],
        creatives: prev[placementId].creatives.filter(c => c.id !== creativeId)
      }
    }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setShowSuccess(false);

    if (!selectedClientId) {
      setErrorMessage('Please select a client.');
      return;
    }
    if (selectedPlacementIds.length === 0) {
      setErrorMessage('Please select at least one placement.');
      return;
    }

    const traffic = [];
    let formIsValid = true;

    for (const placementId of selectedPlacementIds) {
      const placementData = placementCreativeData[placementId];
      if (!placementData || placementData.creatives.length === 0) {
        setErrorMessage(`Placement "${placementData?.placementName || placementId}" has no creatives assigned.`);
        formIsValid = false;
        break;
      }

      const creativeAssignments = [];
      for (const creative of placementData.creatives) {
        if (!creative.creativeName || !creative.startDate || !creative.endDate || !creative.utmFullUrl) {
          setErrorMessage(`Missing details for a creative under "${placementData.placementName}". All fields (Name, Start/End Dates, UTM) are required.`);
          formIsValid = false;
          break;
        }
        creativeAssignments.push({
          creativeName: creative.creativeName,
          landingPage: creative.utmFullUrl,
          startDate: creative.startDate,
          endDate: creative.endDate,
          noIas: creative.noIas || false,
        });
      }
      if (!formIsValid) break;
      
      traffic.push({
        placementName: placementData.placementName,
        creativeAssignments,
      });
    }

    if (!formIsValid) return;

    setIsLoading(true);
    try {
      const payload = {
        client_id: selectedClientId,
        campaign_id: selectedCampaignId || null,
        notes,
        dueDate: dueDate || null,
        trafficData: traffic,
      };
      await apiClient.createTraffickingRequest(payload);
      setShowSuccess(true);
      setSelectedPlacementIds([]);
      setPlacementCreativeData({});
      setNotes('');
      setDueDate('');
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to submit trafficking request.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const [expandedPlacements, setExpandedPlacements] = useState({});
  const togglePlacementExpansion = (placementId) => {
    setExpandedPlacements(prev => ({ ...prev, [placementId]: !prev[placementId] }));
  };


  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">Trafficking Checkout</h1>
        <p className="text-gray-700">
          Select placements and assign creatives to submit your trafficking request.
        </p>
      </div>

      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
          <span className="mr-2">✓</span>
          <span>Trafficking request submitted successfully!</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
          <AlertCircleIcon size={20} className="mr-2"/>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitRequest}>
        {/* Step 1 & 2: Client, Campaign Selection */}
        <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Select Client & Campaign</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReactSelect 
              label="Client *" 
              options={clientOptions} 
              value={clientOptions.find(option => option.value === selectedClientId) || null}
              onChange={option => {
                const value = option ? option.value : '';
                setSelectedClientId(value);
              }} 
              disabled={clientsLoading} fullWidth 
            />
            <ReactSelect
               label="Campaign (Optional)"
               options={campaignOptions}
               value={campaignOptions.find(option => option.value === selectedCampaignId) || null}
               onChange={option => {
                const value = option ? option.value : '';
                setSelectedCampaignId(value);
              }}
               disabled={campaignsLoading || !selectedClientId} 
               fullWidth 
            />
          </div>
        </div>

        {/* Step 2: Placement Selection */}
        {selectedClientId && (
          <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">2. Select Placements</h2>
            {placementsLoading ? <Loader2Icon className="animate-spin" /> : (
              availablePlacements.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {availablePlacements.map(p => (
                    <label key={p.id} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 text-[#fbb832] focus:ring-[#fbb832] border-gray-300 rounded mr-3"
                        checked={selectedPlacementIds.includes(p.id)}
                        onChange={() => handlePlacementSelect(p.id, p.name)}
                      />
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <p className="text-xs text-gray-500">Status: {p.status}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : <p className="text-gray-500">No placements found for the selected client/campaign.</p>
            )}
          </div>
        )}

        {/* Step 3: Creative Assignment */}
        {selectedPlacementIds.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">3. Assign Creatives & UTMs</h2>
            {utmsLoading && <div className="flex items-center text-sm text-gray-500 my-2"><Loader2Icon className="animate-spin mr-2" /> Loading UTMs...</div>}

            {selectedPlacementIds.map(pid => {
              const placementData = placementCreativeData[pid];
              if (!placementData) return null;
              const isExpanded = expandedPlacements[pid] === undefined ? true : expandedPlacements[pid];

              return (
                <div key={pid} className="mb-6 border border-black/10 rounded-lg">
                  <div 
                    className="bg-gray-50 px-4 py-3 rounded-t-lg border-b border-black/10 flex justify-between items-center cursor-pointer"
                    onClick={() => togglePlacementExpansion(pid)}
                  >
                    <h3 className="font-medium">{placementData.placementName}</h3>
                    <button type="button">
                        {isExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4">
                        {placementData.creatives.map((creative, index) => (
                        <div key={creative.id} className="border border-gray-200 rounded p-4 mb-4 bg-gray-50/50 relative">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-sm">Creative #{index + 1}</h4>
                                <Button type="button" variant="outline" size="sm" icon={<TrashIcon size={14}/>} onClick={() => removeCreativeFromPlacement(pid, creative.id)} className="absolute top-2 right-2 !p-1.5">Remove</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                            <Input label="Creative Name *" value={creative.creativeName} onChange={e => updateCreativeField(pid, creative.id, 'creativeName', e.target.value)} placeholder="Enter creative name" fullWidth className="!mb-2"/>
                            <ReactSelect 
                              label="UTM Link *" 
                              options={utmOptionsForSelect} 
                              value={utmOptionsForSelect.find(option => option.value === creative.utmFullUrl) || null}
                              onChange={option => {
                                const value = option ? option.value : '';
                                updateCreativeField(pid, creative.id, 'utmFullUrl', value);
                              }} 
                              disabled={utmsLoading} 
                              fullWidth 
                              className="!mb-2"
                            />
                            <Input label="Start Date *" type="date" value={creative.startDate} onChange={e => updateCreativeField(pid, creative.id, 'startDate', e.target.value)} fullWidth className="!mb-2"/>
                            <Input label="End Date *" type="date" value={creative.endDate} onChange={e => updateCreativeField(pid, creative.id, 'endDate', e.target.value)} fullWidth className="!mb-2"/>
                            </div>
                        </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" icon={<PlusIcon size={16}/>} onClick={() => addCreativeToPlacement(pid)}>Add Creative to "{placementData.placementName}"</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Step 4: Additional Information */}
        <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">4. Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-black mb-1">Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any additional notes..." className="w-full px-3 py-2 bg-white border border-black/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#fbb832] focus:border-transparent" rows={3}/>
            </div>
            <Input label="Due Date (Optional)" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} fullWidth />
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <Button type="submit" variant="secondary" size="lg" icon={isLoading ? <Loader2Icon className="animate-spin" /> : <SaveIcon size={18}/>} disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Trafficking Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};