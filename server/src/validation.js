const STUDENT_CODE_PATTERN = /^[A-Z]{2}\d{3}$/;
const FORBIDDEN_KEYS = ['name', 'firstname', 'lastname', 'email', 'phone', 'address', 'school'];

class ValidationError extends Error {}

/** Rejects payloads containing PII fields or malformed student codes / fluency scores. */
function validateSessionPayload(session) {
  const keys = Object.keys(session).map((k) => k.toLowerCase());
  const hasForbidden = FORBIDDEN_KEYS.some((f) => keys.includes(f));
  if (hasForbidden) throw new ValidationError('Payload contains forbidden PII fields');

  if (typeof session.student_code !== 'string' || !STUDENT_CODE_PATTERN.test(session.student_code)) {
    throw new ValidationError('Invalid student code format');
  }

  if (typeof session.class_code !== 'string' || session.class_code.length === 0) {
    throw new ValidationError('Missing class code');
  }

  if (typeof session.fluency_score !== 'number' || session.fluency_score < 0 || session.fluency_score > 1) {
    throw new ValidationError('Invalid fluency score');
  }

  if (typeof session.game_name !== 'string' || typeof session.strategy_name !== 'string') {
    throw new ValidationError('Missing game or strategy name');
  }

  return true;
}

function validateHomeworkAssignment(body) {
  const { class_code, student_code, strategy, game, due_date } = body;

  if (typeof class_code !== 'string' || class_code.length === 0) {
    throw new ValidationError('Missing class code');
  }
  if (typeof student_code !== 'string' || !STUDENT_CODE_PATTERN.test(student_code)) {
    throw new ValidationError('Invalid student code format');
  }
  if (typeof strategy !== 'string' || typeof game !== 'string') {
    throw new ValidationError('Missing strategy or game');
  }
  if (!due_date || Number.isNaN(new Date(due_date).getTime())) {
    throw new ValidationError('Invalid due date');
  }

  return true;
}

module.exports = { ValidationError, validateSessionPayload, validateHomeworkAssignment, STUDENT_CODE_PATTERN };
