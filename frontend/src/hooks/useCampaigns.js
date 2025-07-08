
import { useCallback } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function useCampaigns(clientId) {
  const fetchCampaigns = useCallback(() => {
    if (!clientId) { // Avoid API call if clientId is not available
      return Promise.resolve([]);
    }
    return apiClient.getCampaigns(clientId);
  }, [clientId]); // This function depends on clientId

  const {
    data, // Keep as data, default applied in return
    loading,
    error,
    refetch
  } = useApi(fetchCampaigns, [clientId]); // Pass memoized fetchCampaigns and its dependency

  const createCampaign = useCallback(async (campaignData) => {
    // FIX: The createCampaign function should not depend on the hook's `clientId`.
    // It must use the client_id provided in the campaignData object from the form.
    if (!campaignData || !campaignData.client_id) {
        throw new Error("Client ID is required in the campaign data to create a campaign.");
    }
    await apiClient.createCampaign(campaignData);
    // After creation, refetch will correctly use the hook's `clientId` to refresh the list,
    // which is the desired behavior for updating the UI.
    await refetch();
  }, [refetch]);

  const updateCampaign = useCallback(async (campaignId, campaignData) => {
    // campaignData should ideally already contain client_id if it's updatable
    // or the backend should handle partial updates without requiring it always.
    await apiClient.updateCampaign(campaignId, campaignData);
    await refetch();
  }, [refetch]);

  const deleteCampaign = useCallback(async (campaignId) => {
    await apiClient.deleteCampaign(campaignId);
    await refetch();
  }, [refetch]);

  return {
    campaigns: data || [],
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refetch
  };
}