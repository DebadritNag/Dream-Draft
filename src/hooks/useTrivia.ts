import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface LiveQuestion {
  question_id: string;
  question: string;
  options: string[];
  start_time: string;
  end_time: string;
  question_index: number;
  total_questions: number;
}

export interface TriviaResults {
  scores: Record<string, number>;
  draft_order: string[];
  correct_answers: Record<string, number>;
}

interface UseTriviaOptions {
  roomId: string | null;
  userId: string | null;
  sessionId: string | null;
}

export function useTrivia({ roomId, userId, sessionId }: UseTriviaOptions) {
  const [currentQuestion, setCurrentQuestion] = useState<LiveQuestion | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [respondedUsers, setRespondedUsers] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<TriviaResults | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(15);
  const [allAnswered, setAllAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`trivia:${roomId}`)
      // New question — reset all per-question state
      .on('broadcast', { event: 'question' }, ({ payload }: { payload: LiveQuestion }) => {
        setCurrentQuestion(payload);
        setSubmitted(false);
        setRespondedUsers(new Set());
        setAllAnswered(false);

        // Sync timer to server end_time
        const endTime = new Date(payload.end_time).getTime();
        if (timerRef.current) clearInterval(timerRef.current);
        const tick = () => {
          const secs = Math.max(0, Math.round((endTime - Date.now()) / 1000));
          setRemainingSeconds(secs);
          if (secs <= 0 && timerRef.current) clearInterval(timerRef.current);
        };
        timerRef.current = setInterval(tick, 500);
        tick();
      })
      // Server signals all players answered early
      .on('broadcast', { event: 'all_answered' }, () => {
        setAllAnswered(true);
        // Freeze the timer display at 0 immediately
        setRemainingSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
      })
      // Final results
      .on('broadcast', { event: 'results' }, ({ payload }: { payload: TriviaResults }) => {
        setResults(payload);
        if (timerRef.current) clearInterval(timerRef.current);
      })
      // Track who has responded (for status badges)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trivia_responses', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setRespondedUsers((prev) => new Set([...prev, payload.new.user_id as string]));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId]);

  const submitAnswer = useCallback(async (selectedOption: number) => {
    if (!roomId || !userId || !sessionId || !currentQuestion || submitted) return;

    setSubmitted(true);

    // Anti-cheat: random delay 200–500ms before hitting the edge function
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const { error } = await supabase.functions.invoke('submit-answer', {
      body: {
        room_id: roomId,
        user_id: userId,
        session_id: sessionId,
        question_id: currentQuestion.question_id,
        selected_option: selectedOption,
      },
    });

    if (error) {
      console.error('submit-answer error:', error);
      setSubmitted(false);
    }
  }, [roomId, userId, sessionId, currentQuestion, submitted]);

  return {
    currentQuestion,
    submitted,
    respondedUsers,
    results,
    remainingSeconds,
    allAnswered,
    submitAnswer,
  };
}
