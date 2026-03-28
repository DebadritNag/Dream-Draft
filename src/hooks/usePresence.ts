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

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const channel = supabase.channel(`presence:${roomId}`, {
      config: { presence: { key: currentUser.user_id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        setPresenceState({ ...state });

        // Detect duplicate sessions: if another tab has a different session_id for same user
        const myPresences = state[currentUser.user_id] ?? [];
        if (myPresences.length > 1) {
          // Latest session_id wins — sort by online_at desc
          const sorted = [...myPresences].sort(
            (a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
          );
          const latestSessionId = sorted[0].session_id;
          setIsDuplicateSession(latestSessionId !== currentUser.session_id);
        } else {
          setIsDuplicateSession(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(currentUser);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, currentUser?.user_id, currentUser?.session_id]);

  const onlineUsers = Object.values(presenceState)
    .map((presences) => {
      // Latest session per user
      return [...presences].sort(
        (a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
      )[0];
    })
    .filter(Boolean);

  return { onlineUsers, isDuplicateSession };
}
