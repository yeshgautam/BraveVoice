// Rotating daily check-in question bank (Phase 6) — also reused as connected-speech practice
// topics (Phase 1/4), since both want the same kind of open-ended, unscored talking prompt.

export const CHECK_IN_QUESTIONS: string[] = [
  'Tell me about your best friends.',
  "What's the greatest movie ever, in your opinion?",
  'Tell me about a cute pet or animal you like.',
  'What do you usually do to celebrate a birthday?',
  'What do you do after school?',
  "What's your favorite subject at school?",
  'Tell me about your family.',
  'What do you want to be when you grow up?',
  'Is there something that annoys you?',
];

/** Deterministic day-of-year rotation so every child sees the same question on the same date. */
export function getTodaysQuestion(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return CHECK_IN_QUESTIONS[dayOfYear % CHECK_IN_QUESTIONS.length];
}
