// src/hooks/useTraffickingRequests.js
import { useCallback } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function useTraffickingRequests() {
  const fetchTraffickingRequests = useCallback(() => apiClient.getTraffickingRequests(), []);

  const {
    data,
    loading,
    error,
    refetch
  } = useApi(fetchTraffickingRequests, []);

  const createRequest = useCallback(async (requestData) => {
    await apiClient.createTraffickingRequest(requestData);
    await refetch();
  }, [refetch]);

  const updateRequest = useCallback(async (id, updates) => {
    await apiClient.updateTraffickingRequest(id, updates);
    await refetch();
  }, [refetch]);

  return {
    requests: data || [],
    loading,
    error,
    createRequest,
    updateRequest,
    refetch
  };
}