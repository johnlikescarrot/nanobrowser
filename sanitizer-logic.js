export const SECURITY_PATTERNS = [
  { pattern: /ignore (all )?previous instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /forget (all )?instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /disregard (all )?(above|previous) (instructions|tasks)/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /(your new task is|you are now|actually you must)/gi, replacement: '[BLOCKED_TASK_INJECTION]' }
];

export function sanitize(text) {
  if (!text) return "";

  // Normalization and hidden char removal
  let result = text.normalize('NFC');
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');

  for (const { pattern, replacement } of SECURITY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
