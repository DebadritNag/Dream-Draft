import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomState {
  status: string;
  draft_order: string[];
  current_turn: number;
  turn_expires_at: string | null;
}

export interface DraftPick {
  id: string;
  user_id: string;
  player_id: string;
  pick_number: number;
  picked_at: string;
}

interface UseRoomRealtimeOptions {
  roomId: string | null;
  onRoomUpdate?: (room: Partial<RoomState>) => void;
  onDraftPick?: (pick: DraftPick) => void;
}

export function useRoomRealtime({ roomId, onRoomUpdate, onDraftPick }: UseRoomRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Keep callbacks in refs so the effect doesn't re-run on every render
  const onRoomUpdateRef = useRef(onRoomUpdate);
  const onDraftPickRef = useRef(onDraftPick);
  useEffect(() => { onRoomUpdateRef.current = onRoomUpdate; }, [onRoomUpdate]);
  useEffect(() => { onDraftPickRef.current = onDraftPick; }, [onDraftPick]);

  useEffect(() => {
    if (!roomId) return;

    // Single channel for rooms + draft_picks only
    const channel = supabase
      .channel(`room:${roomId}`, { config: { broadcast: { ack: false } } })
      .on(
        'broadcast', { event: 'turn_update' },
        (payload) => {
          console.log('[realtime] turn_update broadcast:', payload.payload);
          onRoomUpdateRef.current?.(payload.payload as RoomState);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          console.log('[realtime] rooms UPDATE:', payload.new);
          onRoomUpdateRef.current?.(payload.new as RoomState);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log('[realtime] draft_picks INSERT:', payload.new);
          onDraftPickRef.current?.(payload.new as DraftPick);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          setReconnecting(false);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
          setReconnecting(true);
        } else if (status === 'CLOSED') {
          setConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
  }, [roomId]);

  return { connected, reconnecting };
}
