import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/supabase';

type Player = Tables<'players'>;
type DraftPick = Tables<'draft_picks'>;
type Room = Tables<'rooms'>;

interface UseDraftOptions {
  roomId: string | null;
  userId: string | null;
}

export function useDraft({ roomId, userId }: UseDraftOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [playerMap, setPlayerMap] = useState<Record<string, Player>>({});
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPickedPlayerId, setLastPickedPlayerId] = useState<string | null>(null);

  // Fully rebuild state from DB — called on mount and on reconnect
  const loadFromDB = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);

    const [roomRes, picksRes, playersRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('draft_picks').select('*').eq('room_id', roomId).order('pick_number'),
      supabase.from('players').select('*').order('rating', { ascending: false }),
    ]);

    if (roomRes.error) { setError(roomRes.error.message); setLoading(false); return; }

    const allPlayers = playersRes.data ?? [];
    const map = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
    const pickedIds = new Set(picksRes.data?.map((p) => p.player_id) ?? []);

    setRoom(roomRes.data);
    setPicks(picksRes.data ?? []);
    setPlayerMap(map);
    setAvailablePlayers(allPlayers.filter((p) => !pickedIds.has(p.id)));
    setLoading(false);
  }, [roomId]);

  useEffect(() => { loadFromDB(); }, [loadFromDB]);

  // Apply a new pick from realtime — no DB round-trip needed
  const applyPick = useCallback((pick: DraftPick) => {
    setPicks((prev) => {
      if (prev.some((p) => p.id === pick.id)) return prev; // dedupe
      return [...prev, pick];
    });
    setAvailablePlayers((prev) => prev.filter((p) => p.id !== pick.player_id));
    setLastPickedPlayerId(pick.player_id);
    // Clear flash after 1.5s
    setTimeout(() => setLastPickedPlayerId(null), 1500);
  }, []);

  const applyRoomUpdate = useCallback((update: Partial<Room>) => {
    setRoom((prev) => (prev ? { ...prev, ...update } : prev));
  }, []);

  const draftPlayer = useCallback(async (playerId: string) => {
    if (!roomId || !userId) return { error: 'Not ready' };

    const draftOrder: string[] = Array.isArray(room?.draft_order) ? (room.draft_order as string[]) : [];
    const picksPerUser = room?.picks_per_user ?? 5;
    const totalPicks = draftOrder.length * picksPerUser;
    const draftFormat = (room as any)?.draft_format ?? 'snake';

    const { data: latestPicks } = await supabase
      .from('draft_picks')
      .select('pick_number')
      .eq('room_id', roomId)
      .order('pick_number', { ascending: false })
      .limit(1);

    const pickNumber = (latestPicks?.[0]?.pick_number ?? 0) + 1;

    const { data: insertedPick, error } = await supabase
      .from('draft_picks')
      .insert({ room_id: roomId, user_id: userId, player_id: playerId, pick_number: pickNumber })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { error: 'Player already drafted' };
      return { error: error.message };
    }

    if (insertedPick) applyPick(insertedPick as DraftPick);

    if (pickNumber >= totalPicks) {
      await supabase.from('rooms').update({ status: 'complete' }).eq('id', roomId);
      applyRoomUpdate({ status: 'complete' });
    } else {
      let nextTurn: number;
      if (draftFormat === 'snake') {
        const nextRound = Math.floor(pickNumber / draftOrder.length);
        const posInRound = pickNumber % draftOrder.length;
        nextTurn = nextRound % 2 === 0 ? posInRound : draftOrder.length - 1 - posInRound;
      } else {
        nextTurn = pickNumber % draftOrder.length;
      }
      const expiresAt = new Date(Date.now() + 30000).toISOString();
      await supabase.from('rooms').update({ current_turn: nextTurn, turn_expires_at: expiresAt }).eq('id', roomId);
      applyRoomUpdate({ current_turn: nextTurn, turn_expires_at: expiresAt });
    }

    return { data: true };
  }, [roomId, userId, room, applyPick, applyRoomUpdate]);

  // Derived state
  const draftOrder: string[] = Array.isArray(room?.draft_order) ? (room.draft_order as string[]) : [];
  const currentTurnUserId = draftOrder[room?.current_turn ?? 0] ?? null;
  const isMyTurn = currentTurnUserId === userId;

  const turnExpiresAt = room?.turn_expires_at ? new Date(room.turn_expires_at).getTime() : null;
  const getRemainingSeconds = useCallback(() => {
    if (!turnExpiresAt) return 30;
    return Math.max(0, Math.round((turnExpiresAt - Date.now()) / 1000));
  }, [turnExpiresAt]);

  const myPicks = picks.filter((p) => p.user_id === userId);
  const isDraftComplete = room?.status === 'complete';

  // Resolve player name from map (for "My Team" panel)
  const getPlayer = useCallback((id: string): Player | undefined => playerMap[id], [playerMap]);

  // Auto-pick: only the current turn user triggers this to avoid race conditions
  const autoPickRef = useRef(false);
  useEffect(() => {
    if (!isMyTurn || !turnExpiresAt || availablePlayers.length === 0) {
      autoPickRef.current = false;
      return;
    }

    const msLeft = turnExpiresAt - Date.now();
    if (msLeft <= 0) return;

    const timer = setTimeout(async () => {
      if (!isMyTurn || autoPickRef.current) return;
      autoPickRef.current = true;

      // Pick highest rated available player (smart auto-pick)
      const sorted = [...availablePlayers].sort((a, b) => b.rating - a.rating);
      const pick = sorted[0];
      if (pick) {
        await draftPlayer(pick.id);
      }
    }, msLeft);

    return () => clearTimeout(timer);
  }, [isMyTurn, turnExpiresAt, availablePlayers, draftPlayer]);

  return {
    room,
    picks,
    availablePlayers,
    myPicks,
    loading,
    error,
    isMyTurn,
    currentTurnUserId,
    draftOrder,
    isDraftComplete,
    lastPickedPlayerId,
    getRemainingSeconds,
    draftPlayer,
    applyPick,
    applyRoomUpdate,
    loadFromDB,
    getPlayer,
  };
}
