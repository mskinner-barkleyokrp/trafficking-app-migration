// src/hooks/usePlacements.js
import { useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function usePlacements(filters = {}) {
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchPlacements = useCallback(() => {
    const parsedFilters = JSON.parse(filtersString);
    if (!parsedFilters.client_id && !parsedFilters.campaign_id && !parsedFilters.search) {
        return Promise.resolve([]);
    }
    return apiClient.getPlacements(parsedFilters);
  }, [filtersString]);

  const {
    data,
    loading,
    error,
    refetch
  } = useApi(fetchPlacements, [filtersString]);

  const createPlacements = useCallback(async (placementsData) => {
    await apiClient.createPlacements(placementsData); // Bulk create
    await refetch();
  }, [refetch]);

  const updatePlacement = useCallback(async (placementId, placementData) => {
    await apiClient.updatePlacement(placementId, placementData); // Single update
    await refetch();
  }, [refetch]);

  const deletePlacement = useCallback(async (placementId) => {
    await apiClient.deletePlacement(placementId); // Single delete
    await refetch();
  }, [refetch]);

  return {
    placements: data || [],
    loading,
    error,
    createPlacements, // For bulk creation from builder
    updatePlacement,  // For editing a single existing placement
    deletePlacement,  // For deleting a single existing placement
    refetch
  };
}