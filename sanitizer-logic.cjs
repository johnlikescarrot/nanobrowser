const SECURITY_PATTERNS = [
  { pattern: /ignore previous instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /your new task is/gi, replacement: '[BLOCKED_TASK_INJECTION]' }
];

function sanitize(text) {
  if (!text) return "";
  let result = text;
  for (const { pattern, replacement } of SECURITY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SECURITY_PATTERNS, sanitize };
}
