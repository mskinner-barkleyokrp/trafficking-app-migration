
import React, { useState, useEffect, useMemo } from 'react'; // Added useEffect
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, ChevronRightIcon } from 'lucide-react'; // Added ChevronRightIcon
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AddClientModal } from '../components/AddClientModal';
import { AddCampaignModal } from '../components/AddCampaignModal';
import { EditClientModal } from '../components/EditClientModal';
import { EditCampaignModal } from '../components/EditCampaignModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useClients } from '../hooks/useClients';
import { useCampaigns } from '../hooks/useCampaigns'; // This hook is fine for fetching
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ClientsCampaigns = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null); // Renamed from selectedItem for clarity
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientIdForCampaigns, setSelectedClientIdForCampaigns] = useState(''); // More descriptive name
  
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' }); // For success/error
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const { 
    clients = [], 
    loading: clientsLoading, 
    error: clientsError, 
    createClient, 
    updateClient, 
    deleteClient,
    refetch: refetchClients 
  } = useClients();

  const { 
    campaigns = [], 
    loading: campaignsLoading, 
    error: campaignsError,
    createCampaign, 
    updateCampaign, 
    deleteCampaign,
    refetch: refetchCampaigns
  } = useCampaigns(selectedClientIdForCampaigns);

  useEffect(() => {
    // If a client is selected for campaigns, ensure campaigns are fetched/refetched
    if (selectedClientIdForCampaigns) {
      refetchCampaigns();
    }
  }, [selectedClientIdForCampaigns, refetchCampaigns]);


  const displayFeedback = (type, text) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage({ type: '', text: '' }), 3000);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleOpenAddClientModal = () => setShowAddClientModal(true);
  const handleOpenAddCampaignModal = () => setShowAddCampaignModal(true);

  const handleSaveClient = async (clientData, isEditing = false) => {
    try {
      if (isEditing && editingItem) {
        await updateClient(editingItem.id, clientData);
        displayFeedback('success', 'Client updated successfully!');
      } else {
        await createClient(clientData);
        displayFeedback('success', 'Client created successfully!');
      }
      setShowAddClientModal(false);
      setShowEditClientModal(false);
      setEditingItem(null);
      refetchClients(); // Refetch after save
    } catch (error) {
      displayFeedback('error', `Error saving client: ${error.message}`);
      throw error; // Re-throw for modal to handle its own submitting state
    }
  };

  const handleSaveCampaign = async (campaignData) => {
    // This function is now simpler. It's called for each campaign by the modal.
    try {
        await createCampaign(campaignData);
        // Feedback is handled after all campaigns are created in the modal
    } catch (error) {
        console.error("Error saving a single campaign:", error);
        // Re-throw the error so the modal's loop can catch it and display an alert
        throw error; 
    }
  };

  const handleUpdateCampaign = async (campaignData) => {
    try {
        await updateCampaign(editingItem.id, campaignData);
        displayFeedback('success', 'Campaign updated successfully!');
        setShowEditCampaignModal(false);
        setEditingItem(null);
    } catch (error) {
        displayFeedback('error', `Error updating campaign: ${error.message}`);
        throw error;
    }
  }


  const handleEditClientClick = (client) => {
    setEditingItem(client);
    setShowEditClientModal(true);
  };

  const handleEditCampaignClick = (campaign) => {
    setEditingItem(campaign);
    setShowEditCampaignModal(true);
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsProcessingDelete(true);
    try {
      if (deleteType === 'client') {
        await deleteClient(itemToDelete.id);
        displayFeedback('success', 'Client deleted successfully!');
        if (selectedClientIdForCampaigns === itemToDelete.id) { // If deleted client was selected for campaigns
            setSelectedClientIdForCampaigns(''); // Clear selection
        }
      } else if (deleteType === 'campaign') {
        await deleteCampaign(itemToDelete.id);
        displayFeedback('success', 'Campaign deleted successfully!');
      }
      setShowDeleteConfirmModal(false);
      setItemToDelete(null);
      setDeleteType('');
    } catch (error) {
      displayFeedback('error', `Error deleting ${deleteType}: ${error.message}`);
    } finally {
      setIsProcessingDelete(false);
    }
  };
  
  const selectedClientNameForCampaignsTab = useMemo(() => {
    if (!selectedClientIdForCampaigns) return null;
    return clients.find(c => c.id === selectedClientIdForCampaigns)?.name;
  }, [selectedClientIdForCampaigns, clients]);


  if (clientsLoading && activeTab === 'clients' && !clients.length) { // Show spinner only if no clients loaded yet
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">Clients & Campaigns</h1>
        <p className="text-gray-700">Manage your clients and their associated campaigns.</p>
      </div>

      {feedbackMessage.text && (
        <div className={`p-4 mb-6 rounded-md text-sm ${feedbackMessage.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
          {feedbackMessage.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-black/10 shadow-sm">
        <div className="border-b border-black/10">
          <nav className="flex -mb-px">
            <button
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'clients' ? 'border-b-2 border-[#ff501c] text-[#ff501c]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('clients'); setSearchTerm(''); /* Clear search on tab switch */ }}
            >
              Clients ({clients.length})
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'campaigns' ? 'border-b-2 border-[#ff501c] text-[#ff501c]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab('campaigns'); setSearchTerm(''); /* Clear search */ }}
            >
              Campaigns {selectedClientIdForCampaigns && campaigns.length > 0 ? `(${campaigns.length})` : ''}
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="flex-1 relative">
              <SearchIcon size={18} className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400"/>
              <Input type="text" placeholder={`Search ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 !mb-0" fullWidth/>
            </div>
            <Button variant="secondary" icon={<PlusIcon size={16} />} onClick={activeTab === 'clients' ? handleOpenAddClientModal : handleOpenAddCampaignModal}>
               {activeTab === 'clients' ? 'Add Client' : 'Build Campaigns'}
            </Button>
          </div>

          {/* Clients Tab Content */}
          {activeTab === 'clients' && (
            <div>
              {clientsLoading && <div className="text-center py-4"><LoadingSpinner/></div>}
              {clientsError && <div className="text-red-500 p-4">Error loading clients: {clientsError.message}</div>}
              {!clientsLoading && !clientsError && filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClients.map((client) => (
                    <div key={client.id} className="border border-black/10 rounded-lg p-4 hover:shadow-lg transition-shadow duration-150 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-black break-all">{client.name}</h3>
                          <div className="flex space-x-1 flex-shrink-0 ml-2">
                            <Button variant="outline" size="sm" className="!p-1.5" onClick={() => handleEditClientClick(client)} title="Edit client"><EditIcon size={14} /></Button>
                            <Button variant="outline" size="sm" className="!p-1.5 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteClick(client, 'client')} title="Delete client"><TrashIcon size={14} /></Button>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm mb-3">
                          {client.placement_name_template && (
                            <div>
                              <span className="font-medium text-gray-700">Placement Template:</span>
                              <div className="mt-1 bg-gray-50 p-2 rounded text-xs font-mono break-all">
                                {typeof client.placement_name_template === 'string' && client.placement_name_template.startsWith('[') ? 
                                 JSON.parse(client.placement_name_template).map(c => c.type === 'field' ? `{${c.field}}` : c.text).join(JSON.parse(client.placement_name_template)[0]?.separator || '_')
                                 : client.placement_name_template || 'Default/Not Set'}
                              </div>
                            </div>
                          )}
                          {client.cm360_instance_id && (
                            <div><span className="font-medium text-gray-700">CM360 ID:</span> <span className="text-gray-600">{client.cm360_instance_id}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto pt-3 border-t border-gray-100">
                        <Button variant="outline" size="sm" icon={<ChevronRightIcon size={16}/>} onClick={() => { setSelectedClientIdForCampaigns(client.id); setActiveTab('campaigns'); setSearchTerm(''); }} className="w-full">
                          View Campaigns
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !clientsLoading && !clientsError && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">{searchTerm ? 'No clients found matching your search.' : 'No clients created yet. Click "Add Client" to start.'}</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Campaigns Tab Content */}
          {activeTab === 'campaigns' && (
            <div>
              {selectedClientNameForCampaignsTab && (
                <div className="mb-4 p-3 bg-[#fff8ee] border border-[#fbb832]/30 rounded-md flex justify-between items-center">
                  <p className="text-sm">Showing campaigns for: <strong>{selectedClientNameForCampaignsTab}</strong></p>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedClientIdForCampaigns(''); setSearchTerm(''); }}>Clear Client Filter</Button>
                </div>
              )}
              {campaignsLoading && <div className="text-center py-4"><LoadingSpinner/></div>}
              {campaignsError && <div className="text-red-500 p-4">Error loading campaigns: {campaignsError.message}</div>}
              {!campaignsLoading && !campaignsError && filteredCampaigns.length > 0 ? (
                <div className="space-y-4">
                  {filteredCampaigns.map((campaign) => (
                    <div key={campaign.id} className="border border-black/10 rounded-lg p-4 hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{campaign.name}</h3>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                {campaign.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                              <div><span className="font-medium">Client:</span> <span className="text-gray-600">{campaign.client_name || clients.find(c=>c.id === campaign.client_id)?.name || 'N/A'}</span></div>
                              {campaign.start_date && <div><span className="font-medium">Start:</span> <span className="text-gray-600">{new Date(campaign.start_date).toLocaleDateString()}</span></div>}
                              {campaign.end_date && <div><span className="font-medium">End:</span> <span className="text-gray-600">{new Date(campaign.end_date).toLocaleDateString()}</span></div>}
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0 ml-2">
                            <Button variant="outline" size="sm" className="!p-1.5" onClick={() => handleEditCampaignClick(campaign)} title="Edit campaign"><EditIcon size={14} /></Button>
                            <Button variant="outline" size="sm" className="!p-1.5 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteClick(campaign, 'campaign')} title="Delete campaign"><TrashIcon size={14} /></Button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                !campaignsLoading && !campaignsError && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      {searchTerm ? 'No campaigns found matching your search.' : 
                       selectedClientIdForCampaigns ? 'No campaigns created for this client yet.' : 
                       'Select a client to view their campaigns, or add a new campaign.'}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddClientModal isOpen={showAddClientModal} onClose={() => setShowAddClientModal(false)} onSave={(data) => handleSaveClient(data, false)} />
      <AddCampaignModal 
          isOpen={showAddCampaignModal} 
          onClose={() => setShowAddCampaignModal(false)} 
          onSave={handleSaveCampaign} 
          clients={clients} 
          preselectedClientId={selectedClientIdForCampaigns}/>
      {editingItem && showEditClientModal && <EditClientModal isOpen={showEditClientModal} onClose={() => { setShowEditClientModal(false); setEditingItem(null); }} onSave={(id, data) => handleSaveClient(data, true)} client={editingItem} />}
      {editingItem && showEditCampaignModal && <EditCampaignModal isOpen={showEditCampaignModal} onClose={() => { setShowEditCampaignModal(false); setEditingItem(null); }} onSave={(id, data) => handleUpdateCampaign(data)} campaign={editingItem} clients={clients} />}
      {itemToDelete && <ConfirmDeleteModal isOpen={showDeleteConfirmModal} onClose={() => { setShowDeleteConfirmModal(false); setItemToDelete(null); setDeleteType(''); }} onConfirm={handleConfirmDelete} title={`Delete ${deleteType === 'client' ? 'Client' : 'Campaign'}`} message={`Are you sure you want to delete the ${deleteType} "${itemToDelete?.name}"? This action cannot be undone.`} itemName={itemToDelete?.name} isDeleting={isProcessingDelete} />}
    </div>
  );
};