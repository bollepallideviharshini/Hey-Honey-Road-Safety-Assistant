export type HazardType = 'accident' | 'water' | 'rain' | 'road' | 'fight';

export interface RoadEvent {
  id: string;
  event_type: HazardType;
  latitude: number;
  longitude: number;
  address: string | null;
  created_at: string;
  reported_by: string;
  status: string;
}

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}
