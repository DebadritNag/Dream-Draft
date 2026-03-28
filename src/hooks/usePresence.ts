import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  user_id: string;
  session_id: string;
  display_name: string;
  avatar: string;
  online_at: string;
}

/** Returns the stable session_id for this tab — persisted in sessionStorage */
export function getSessionId(): string {
  const key = 'draft_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function usePresence(roomId: string | null, currentUser: PresenceUser | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, PresenceUser[]>>({});
  const [isDuplicateSession, setIsDuplicateSession] = useState(false);

  // Keep currentUser in a ref so we can re-track on display_name changes without re-subscribing
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
    // If already subscribed, re-track with updated info (e.g. display_name typed in)
    if (channelRef.current && currentUser) {
      channelRef.current.track(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const syncState = (channel: RealtimeChannel) => {
      const state = channel.presenceState<PresenceUser>();
      setPresenceState({ ...state });

      const myPresences = state[currentUser.user_id] ?? [];
      if (myPresences.length > 1) {
        const sorted = [...myPresences].sort(
          (a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
        );
        setIsDuplicateSession(sorted[0].session_id !== currentUser.session_id);
      } else {
        setIsDuplicateSession(false);
      }
    };

    const channel = supabase.channel(`presence:${roomId}`, {
      config: { presence: { key: currentUser.user_id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => syncState(channel))
      .on('presence', { event: 'join' }, () => syncState(channel))
      .on('presence', { event: 'leave' }, () => syncState(channel))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(currentUserRef.current ?? currentUser);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
      setPresenceState({});
    };
  // Only re-subscribe when room or user identity changes — NOT on display_name changes
  }, [roomId, currentUser?.user_id, currentUser?.session_id]);

  const onlineUsers = Object.values(presenceState)
    .map((presences) =>
      [...presences].sort(
        (a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
      )[0]
    )
    .filter(Boolean);

  return { onlineUsers, isDuplicateSession };
}
