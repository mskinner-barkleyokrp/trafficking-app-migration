// src/hooks/useLegendFields.js
import { useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

// Hook to fetch unique legend categories (distinct display_names from wb_legend_fields)
// These are used in TemplateBuilder to define which category a field should lookup.
export function useLegendCategories() {
  // apiClient.getLegendFields() without arguments fetches distinct display_names
  const fetchCategories = useCallback(() => apiClient.getLegendFields(), []); 
  const { data, loading, error, refetch } = useApi(fetchCategories, []);

  const categories = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    // Data from backend for categories is already: [{ label: 'CategoryName', value: 'CategoryName' }, ...]
    return data;
  }, [data]);

  return {
    categories,
    loadingCategories: loading,
    errorCategories: error,
    refetchCategories: refetch,
  };
}

// Hook to fetch legend values for a specific category name
// Used in PlacementBuilder to populate dropdowns based on template definition.
export function useLegendValues(categoryName) {
  const fetchValues = useCallback(() => {
    if (!categoryName) return Promise.resolve([]);
    return apiClient.getLegendFields(categoryName); 
  }, [categoryName]);

  const { data, loading, error, refetch } = useApi(fetchValues, [categoryName]);
  
  // `data` from backend for values within a category should be: 
  // [{ id, label: 'Value (ABR)', value: 'ActualValue', abbreviation: 'ABR' (or null) }, ...]
  const values = useMemo(() => {
    // if (data) { // DEBUG
    //   console.log(`useLegendValues for '${categoryName}':`, JSON.stringify(data, null, 2));
    // }
    return data || [];
  }, [data/*, categoryName*/]); // Add categoryName to re-memoize if it changes, though data should trigger it

  return {
    values,
    loadingValues: loading,
    errorValues: error,
    refetchValues: refetch,
  };
}


// Hook to fetch ALL individual legend field items and manage them.
export function useAllLegendFieldItems() {
  const fetchAllItems = useCallback(() => {
    // This assumes your backend's /api/legend-fields?category=__ALL_ITEMS__
    // returns a flat list of all individual legend items
    return apiClient.getLegendFields('__ALL_ITEMS__');
  }, []);

  const { data, loading, error, refetch } = useApi(fetchAllItems, []);

  const createItem = useCallback(async (itemData) => {
    await apiClient.createLegendField(itemData);
    await refetch();
  }, [refetch]);

  const updateItem = useCallback(async (itemId, itemData) => {
    await apiClient.updateLegendField(itemId, itemData);
    await refetch();
  }, [refetch]);

  const deleteItem = useCallback(async (itemId) => {
    await apiClient.deleteLegendField(itemId);
    await refetch();
  }, [refetch]);


  // `data` would be the raw array from the API
  const options = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => ({
      label: item.label, // e.g., "Site: Google (GGL)"
      value: item.id,
    }));
  }, [data]);

  return {
    allItems: data || [], // Raw items
    allItemOptions: options, // Formatted for Select
    loadingAllItems: loading,
    errorAllItems: error,
    refetchAllItems: refetch,
    createLegendItem: createItem,
    updateLegendItem: updateItem,
    deleteLegendItem: deleteItem,
  };
}