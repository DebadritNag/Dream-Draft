import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const QUESTION_DURATION_MS = 15000;
const BETWEEN_QUESTIONS_MS = 3000;

interface UseTriviaHostOptions {
  roomId: string | null;
  sessionId: string | null;
  isHost: boolean;
  memberCount: number;
}

export function useTriviaHost({ roomId, sessionId, isHost, memberCount }: UseTriviaHostOptions) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!roomId || !sessionId || !isHost || runningRef.current) return;
    runningRef.current = true;

    const run = async () => {
      // Fetch all trivia questions
      const { data: questions } = await supabase
        .from('trivia_questions')
        .select('id, question, options, correct_answer')
        .limit(5);

      if (!questions || questions.length === 0) return;

      const channel = supabase.channel(`trivia:${roomId}`);
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
      });

      const scores: Record<string, number> = {};
      const correctAnswers: Record<string, number> = {};

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + QUESTION_DURATION_MS);

        // Update session current question index
        await supabase
          .from('trivia_sessions')
          .update({ current_question_index: i, question_start_time: startTime.toISOString(), question_end_time: endTime.toISOString() })
          .eq('id', sessionId);

        // Broadcast question to all players
        await channel.send({
          type: 'broadcast',
          event: 'question',
          payload: {
            question_id: q.id,
            question: q.question,
            options: q.options,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            question_index: i,
            total_questions: questions.length,
          },
        });

        // Wait for all answers or timeout
        const deadline = endTime.getTime();
        const respondedSet = new Set<string>();

        await new Promise<void>((resolve) => {
          const responseSub = supabase
            .channel(`trivia-responses:${sessionId}:${q.id}`)
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
          }, deadline - Date.now() + 500);
        });

        // Tally scores for this question
        const { data: responses } = await supabase
          .from('trivia_responses')
          .select('user_id, selected_option, answered_at')
          .eq('session_id', sessionId)
          .eq('question_id', q.id);

        if (responses) {
          const questionStart = startTime.getTime();
          responses.forEach((r) => {
            if (!scores[r.user_id]) scores[r.user_id] = 0;
            if (!correctAnswers[r.user_id]) correctAnswers[r.user_id] = 0;
            if (r.selected_option === q.correct_answer) {
              // Speed bonus: faster = more points (max 1000, min 500)
              const elapsed = new Date(r.answered_at).getTime() - questionStart;
              const speedBonus = Math.max(0, 1 - elapsed / QUESTION_DURATION_MS);
              scores[r.user_id] += Math.round(500 + 500 * speedBonus);
              correctAnswers[r.user_id] += 1;
            }
          });
        }

        // Signal all answered early if everyone responded
        if (respondedSet.size >= memberCount) {
          await channel.send({ type: 'broadcast', event: 'all_answered', payload: {} });
        }

        // Pause between questions
        if (i < questions.length - 1) {
          await new Promise((r) => setTimeout(r, BETWEEN_QUESTIONS_MS));
        }
      }

      // Determine draft order (highest score picks first)
      const draft_order = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .map(([uid]) => uid);

      // Save draft order to room
      await supabase.from('rooms').update({ draft_order, status: 'drafting' }).eq('id', roomId);

      // Mark session complete
      await supabase.from('trivia_sessions').update({ status: 'complete' }).eq('id', sessionId);

      // Broadcast final results
      await channel.send({
        type: 'broadcast',
        event: 'results',
        payload: { scores, draft_order, correct_answers: correctAnswers },
      });

      channel.unsubscribe();
    };

    run().catch(console.error);
  }, [roomId, sessionId, isHost, memberCount]);
}
