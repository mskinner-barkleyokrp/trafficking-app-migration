// src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';

export function useApi(apiCall, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The `apiCall` function is now expected to be memoized by the caller (using useCallback)
  // if it's an inline function with its own dependencies.
  // The `dependencies` array here is for the `execute` function's own stability,
  // ensuring it only re-creates if `apiCall` or its *passed-in* dependencies change.
  const execute = useCallback(async (...args) => {
    if (typeof apiCall !== 'function') {
      // console.warn('useApi: apiCall is not a function. Setting default empty data.');
      setData([]); // Or appropriate default
      setLoading(false);
      return [];   // Or appropriate default
    }
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(...args);
      setData(result !== undefined ? result : null); // Handle API returning undefined
      return result;
    } catch (err) {
      console.error('API call error in useApi:', err);
      setError(err.message || 'An error occurred');
      setData(null); // Set data to null on error
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall, ...dependencies]); // Spread the dependencies of the apiCall itself

  useEffect(() => {
    execute().catch(err => {
      // Error is already set by execute and logged
    });
  }, [execute]); // `execute` is memoized, so this effect runs when `execute` identity changes

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    refetch
  };
}