import { createClient } from '@supabase/supabase-js';
import type { RoadEvent } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// A custom mock client to simulate Supabase queries & real-time updates using localStorage
class MockSupabaseClient {
  private listeners: Set<(payload: any) => void> = new Set();

  constructor() {
    // Listen to Storage events from other browser tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'hey_honey_events_broadcast' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          this.notifyListeners(payload);
        } catch (err) {
          console.error('Error parsing broadcast payload', err);
        }
      }
    });
  }

  private notifyListeners(payload: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Listener callback error', err);
      }
    });
  }

  private getEvents(): RoadEvent[] {
    const raw = localStorage.getItem('hey_honey_road_events');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveEvents(events: RoadEvent[]) {
    localStorage.setItem('hey_honey_road_events', JSON.stringify(events));
  }

  from(table: string) {
    if (table !== 'road_events') {
      throw new Error(`MockSupabase does not support table ${table}`);
    }

    return {
      select: () => {
        const events = this.getEvents();
        return {
          order: (_column: string, _options?: { ascending: boolean }) => {
            // Newest first by default
            return Promise.resolve({ data: events, error: null });
          }
        };
      },
      insert: (rows: any[]) => {
        const events = this.getEvents();
        const newEvents = rows.map((row) => ({
          id: row.id || Math.random().toString(36).substring(2, 11),
          event_type: row.event_type,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          address: row.address || null,
          created_at: row.created_at || new Date().toISOString(),
          reported_by: row.reported_by || 'Anonymous',
          status: row.status || 'active',
        }));
        
        const updated = [...newEvents, ...events];
        this.saveEvents(updated);

        // Notify self and broadcast to other tabs
        newEvents.forEach((evt) => {
          const payload = {
            eventType: 'INSERT',
            new: evt,
          };
          this.notifyListeners(payload);
          localStorage.setItem('hey_honey_events_broadcast', JSON.stringify(payload));
          localStorage.removeItem('hey_honey_events_broadcast'); // Clean up trigger
        });

        return Promise.resolve({ data: newEvents, error: null });
      },
    };
  }

  channel(name: string) {
    return {
      on: (
        _type: string,
        filter: { event: string; schema: string; table: string },
        callback: (payload: any) => void
      ) => {
        const listener = (payload: any) => {
          if (filter.event === '*' || payload.eventType === filter.event) {
            callback(payload);
          }
        };
        this.listeners.add(listener);
        return {
          subscribe: () => {
            console.log(`Subscribed to mock channel: ${name}`);
            return {
              unsubscribe: () => {
                this.listeners.delete(listener);
              },
            };
          },
        };
      },
    };
  }
}

const isMockEnabled = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-');

if (isMockEnabled) {
  console.warn(
    'Hey Honey: Using Local Storage & Tab Broadcast Mock client because Supabase credentials are not configured.'
  );
}

export const supabase = isMockEnabled
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey);

export const IS_MOCKED = isMockEnabled;
export const MOCK_DB_HELPERS = {
  clearEvents: () => {
    localStorage.removeItem('hey_honey_road_events');
    window.location.reload();
  }
};
