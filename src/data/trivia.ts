import triviaBank from "./trivia.json";

export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // index into options
}

/** Returns `count` randomly shuffled questions from the 250-question bank. */
export function getRandomQuestions(count = 5): TriviaQuestion[] {
  const shuffled = [...triviaBank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.options.indexOf(q.answer),
  }));
}
