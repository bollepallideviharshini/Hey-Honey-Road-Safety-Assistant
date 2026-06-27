import { useState, useEffect, useCallback } from 'react';
import type { LocationState } from '../types';

// Default fallback coordinates if user denies GPS (San Francisco center)
export const DEFAULT_LAT = 37.7749;
export const DEFAULT_LNG = -122.4194;

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
    });
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'An unknown geolocation error occurred.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location Permission Denied. Using mock location.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location position unavailable. Using mock location.';
        break;
      case error.TIMEOUT:
        errorMessage = 'GPS request timed out. Using mock location.';
        break;
    }
    
    console.warn(`${errorMessage} Fallback coordinates applied.`);
    setState((prev) => ({
      ...prev,
      latitude: prev.latitude || DEFAULT_LAT,
      longitude: prev.longitude || DEFAULT_LNG,
      error: errorMessage,
      loading: false,
    }));
  }, []);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        error: 'Geolocation is not supported by your browser.',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        accuracy: null,
        error: 'Geolocation is not supported by your browser.',
        loading: false,
      });
      return;
    }

    // Attempt to get initial location
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [onSuccess, onError]);

  return {
    ...state,
    refreshLocation,
  };
}
