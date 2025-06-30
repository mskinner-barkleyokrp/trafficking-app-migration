// src/hooks/useLegends.js
import { useCallback } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function useLegends(clientId) {
  const fetchLegends = useCallback(() => {
    if (!clientId) {
      return Promise.resolve([]);
    }
    return apiClient.getLegends(clientId);
  }, [clientId]);

  const {
    data,
    loading,
    error,
    refetch
  } = useApi(fetchLegends, [clientId]);

  const createLegend = useCallback(async (legendData) => {
    if (!clientId && !legendData.client_id) { // Assuming legendData might carry client_id for global creation
      // Or throw error if client_id is strictly required from context
      console.warn("Attempting to create legend without client_id");
    }
    // Ensure client_id is part of legendData if not global
    const payload = clientId ? { ...legendData, client_id: clientId } : legendData;
    await apiClient.createLegend(payload);
    await refetch();
  }, [clientId, refetch]);

  return {
    legends: data || [],
    loading,
    error,
    createLegend,
    refetch
  };
}