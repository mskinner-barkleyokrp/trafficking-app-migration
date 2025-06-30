// src/hooks/useClients.js
import { useCallback } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function useClients() {
  // apiClient.getClients is a stable method on the class instance.
  // To ensure `this` is correct, we wrap it.
  const fetchClients = useCallback(() => apiClient.getClients(), []); // No external dependencies for getClients itself

  const {
    data,
    loading,
    error,
    refetch
  } = useApi(fetchClients, []); // Pass memoized fetchClients, empty deps for useApi's useCallback

  const createClient = useCallback(async (clientData) => {
    await apiClient.createClient(clientData);
    await refetch();
  }, [refetch]);

  const updateClient = useCallback(async (clientId, clientData) => {
    await apiClient.updateClient(clientId, clientData);
    await refetch();
  }, [refetch]);

  const deleteClient = useCallback(async (clientId) => {
    await apiClient.deleteClient(clientId);
    await refetch();
  }, [refetch]);

  return {
    clients: data || [],
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refetch
  };
}