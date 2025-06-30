// src/hooks/useUtms.js
import { useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function useUtms(filters = {}) {
  // Memoize filters to stabilize fetchUtms unless filters actually change
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchUtms = useCallback(() => {
    const parsedFilters = JSON.parse(filtersString);
    // Optionally, add a condition to not fetch if essential filters (like client_id) are missing
    // For now, we assume the backend handles empty filters or the UI manages this.
    if (!parsedFilters.client_id && !parsedFilters.campaign_id && !parsedFilters.search) {
        // If no filters are provided, and you want to avoid loading all UTMs,
        // you can return an empty array. Or let backend handle it.
        // This behavior matches usePlacements.
        return Promise.resolve([]);
    }
    return apiClient.getUtms(parsedFilters);
  }, [filtersString]);

  const {
    data,
    loading,
    error,
    refetch
  } = useApi(fetchUtms, [filtersString]); // Pass memoized fetchUtms and its dependency

  // createUtms is for bulk creation via the form
  const createMultipleUtms = useCallback(async (utmsArray) => {
    const result = await apiClient.createUtms(utmsArray); // Assumes utmsArray is { utms: [...] }
    await refetch();
    return result; // Return the API response, possibly list of created UTMs
  }, [refetch]);

  const updateSingleUtm = useCallback(async (utmId, utmData) => {
    const result = await apiClient.updateUtm(utmId, utmData);
    await refetch();
    return result;
  }, [refetch]);

  const deleteSingleUtm = useCallback(async (utmId) => {
    await apiClient.deleteUtm(utmId);
    await refetch();
  }, [refetch]);

  return {
    utms: data || [], // Existing UTMs fetched from backend
    loadingUtms: loading,
    errorUtms: error,
    createMultipleUtms,  // For the main builder form
    updateSingleUtm,   // For editing an existing UTM
    deleteSingleUtm,   // For deleting an existing UTM
    refetchUtms: refetch
  };
}