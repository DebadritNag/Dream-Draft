import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getRandomQuestions } from '@/data/trivia';

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
  isHost: boolean;
  memberCount: number;
}

const QUESTION_DURATION_MS = 15000;
const BETWEEN_QUESTIONS_MS = 3000;

export function useTrivia({ roomId, userId, sessionId, isHost, memberCount }: UseTriviaOptions) {
  const [currentQuestion, setCurrentQuestion] = useState<LiveQuestion | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [respondedUsers, setRespondedUsers] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<TriviaResults | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(15);
  const [allAnswered, setAllAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hostRunningRef = useRef(false);

  // Single shared channel for all trivia events
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`trivia:${roomId}`, {
      config: { broadcast: { self: true } }, // host receives its own broadcasts
    });

    channel
      .on('broadcast', { event: 'question' }, ({ payload }: { payload: LiveQuestion }) => {
        setCurrentQuestion(payload);
        setSubmitted(false);
        setRespondedUsers(new Set());
        setAllAnswered(false);

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
      .on('broadcast', { event: 'all_answered' }, () => {
        setAllAnswered(true);
        setRemainingSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
      })
      .on('broadcast', { event: 'results' }, ({ payload }: { payload: TriviaResults }) => {
        setResults(payload);
        if (timerRef.current) clearInterval(timerRef.current);
      })
      .on('broadcast', { event: 'user_answered' }, ({ payload }: { payload: { user_id: string } }) => {
        setRespondedUsers((prev) => new Set([...prev, payload.user_id]));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trivia_responses', filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setRespondedUsers((prev) => new Set([...prev, payload.new.user_id as string]));
      })
      .subscribe((status) => {
        console.log('[trivia channel]', status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId]);

  // Host engine — runs after channel is ready and sessionId is available
  useEffect(() => {
    if (!roomId || !sessionId || !isHost || hostRunningRef.current) return;
    hostRunningRef.current = true;

    const runHost = async () => {
      // Wait for channel to be subscribed
      await new Promise<void>((resolve) => {
        const check = () => {
          if (channelRef.current) { resolve(); return; }
          setTimeout(check, 100);
        };
        check();
      });

      // Small delay to ensure all clients are subscribed
      await new Promise((r) => setTimeout(r, 1500));

      const questions = getRandomQuestions(5);
      if (!questions || questions.length === 0) {
        console.error('[host] no trivia questions found');
        return;
      }

      const scores: Record<string, number> = {};
      const correctAnswers: Record<string, number> = {};

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + QUESTION_DURATION_MS);

        await supabase.from('trivia_sessions').update({
          current_question_index: i,
          question_start_time: startTime.toISOString(),
          question_end_time: endTime.toISOString(),
        }).eq('id', sessionId);

        const questionPayload: LiveQuestion = {
          question_id: String(q.id),
          question: q.question,
          options: q.options,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          question_index: i,
          total_questions: questions.length,
        };

        await channelRef.current!.send({
          type: 'broadcast', event: 'question', payload: questionPayload,
        });

        // Wait for all answers or timeout — whichever comes first
        const respondedSet = new Set<string>();
        await new Promise<void>((resolve) => {
          const responseSub = supabase
            .channel(`host-responses:${sessionId}:${q.id}`)
            .on('postgres_changes', {
              event: 'INSERT', schema: 'public', table: 'trivia_responses',
              filter: `session_id=eq.${sessionId}`,
            }, (payload) => {
              respondedSet.add(payload.new.user_id as string);
              if (respondedSet.size >= memberCount) {
                clearTimeout(timer);
                responseSub.unsubscribe();
                resolve();
              }
            })
            .subscribe();

          const timer = setTimeout(() => {
            responseSub.unsubscribe();
            resolve();
          }, endTime.getTime() - Date.now() + 500);
        });

        if (respondedSet.size >= memberCount) {
          await channelRef.current!.send({ type: 'broadcast', event: 'all_answered', payload: {} });
        }

        // Tally scores
        const { data: responses } = await supabase
          .from('trivia_responses')
          .select('user_id, selected_option, answered_at')
          .eq('session_id', sessionId)
          .eq('question_id', String(q.id));

        if (responses) {
          responses.forEach((r) => {
            if (!scores[r.user_id]) scores[r.user_id] = 0;
            if (!correctAnswers[r.user_id]) correctAnswers[r.user_id] = 0;
            if (r.selected_option === q.correctAnswer) {
              const elapsed = new Date(r.answered_at).getTime() - startTime.getTime();
              const speedBonus = Math.max(0, 1 - elapsed / QUESTION_DURATION_MS);
              scores[r.user_id] += Math.round(500 + 500 * speedBonus);
              correctAnswers[r.user_id] += 1;
            }
          });
        }

        if (i < questions.length - 1) {
          await new Promise((r) => setTimeout(r, BETWEEN_QUESTIONS_MS));
        }
      }

      const draft_order = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .map(([uid]) => uid);

      await supabase.from('rooms').update({ draft_order, status: 'drafting' }).eq('id', roomId);
      await supabase.from('trivia_sessions').update({ status: 'complete' }).eq('id', sessionId);

      await channelRef.current!.send({
        type: 'broadcast', event: 'results',
        payload: { scores, draft_order, correct_answers: correctAnswers },
      });
    };

    runHost().catch(console.error);
  }, [roomId, sessionId, isHost, memberCount]);

  const submitAnswer = useCallback(async (selectedOption: number) => {
    if (!roomId || !userId || !sessionId || !currentQuestion || submitted) return;
    setSubmitted(true);
    // Immediately mark self as responded
    setRespondedUsers((prev) => new Set([...prev, userId]));

    // Broadcast to others instantly so their badges update without waiting for DB
    channelRef.current?.send({
      type: 'broadcast', event: 'user_answered', payload: { user_id: userId },
    });

    const { error } = await supabase.from('trivia_responses').insert({
      room_id: roomId,
      session_id: sessionId,
      user_id: userId,
      question_id: currentQuestion.question_id,
      selected_option: selectedOption,
    });

    if (error) {
      console.error('submitAnswer error:', error);
      setSubmitted(false);
      setRespondedUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    }
  }, [roomId, userId, sessionId, currentQuestion, submitted]);

  return { currentQuestion, submitted, respondedUsers, results, remainingSeconds, allAnswered, submitAnswer };
}
