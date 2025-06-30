// src/hooks/useTemplates.js
import { useCallback } from 'react';
import { apiClient } from '../lib/api';
import { useApi } from './useApi';

export function useTemplates(clientId, type = null) {
  const fetchTemplates = useCallback(() => {
    // apiClient.getTemplates will handle the query parameters.
    // The backend should return templates where client_id matches OR is_global is true.
    return apiClient.getTemplates(clientId || undefined, type || undefined);
  }, [clientId, type]);

  const {
    data,
    loading,
    error,
    refetch
  } = useApi(fetchTemplates, [clientId, type]);

  const createTemplate = useCallback(async (templateData) => {
    await apiClient.createTemplate(templateData);
    await refetch();
  }, [refetch]);

  const updateTemplate = useCallback(async (templateId, templateData) => {
    await apiClient.updateTemplate(templateId, templateData);
    await refetch();
  }, [refetch]);

  const deleteTemplate = useCallback(async (templateId) => {
    await apiClient.deleteTemplate(templateId);
    await refetch();
  }, [refetch]);

  return {
    // The backend `GET /api/templates` already handles fetching both global and client-specific templates
    // when a client_id is provided, so we can just return the data.
    templates: data || [],
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch
  };
}