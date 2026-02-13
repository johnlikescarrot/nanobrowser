export const SECURITY_PATTERNS = [
  { pattern: /ignore (all )?previous instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /forget (all )?instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /disregard (all )?(above|previous) (instructions|tasks)/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /(your new task is|you are now|actually you must)/gi, replacement: '[BLOCKED_TASK_INJECTION]' }
];

export function isInteractive(el) {
    if (!el) return false;
    const tagName = el.tagName ? el.tagName.toUpperCase() : '';
    const interactiveTags = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY']);
    if (interactiveTags.has(tagName)) return true;

    // Check for computed styles (simulated in tests, real in browser)
    const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : (el.style || {});
    if (style.cursor === 'pointer') return true;

    if (el.hasAttribute && (el.hasAttribute('onclick') || el.getAttribute('role') === 'button' || el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true')) return true;
    return false;
}

export function sanitize(text) {
  if (!text) return "";

  // Normalization
  let result = text.normalize('NFC');

  // Broad invisible/format char removal (Unicode property escapes)
  // Replaces: Zero-width chars, soft hyphens, variation selectors, tag characters, etc.
  result = result.replace(/[\u00AD\u034F\u061C\u070F\u180E\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF]/g, '');
  // Also use Unicode property Cf (Format) if supported by the environment
  try {
      result = result.replace(/\p{Cf}/gu, '');
  } catch (e) { /* Fallback to manual list if environment doesn't support \p */ }

  for (const { pattern, replacement } of SECURITY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
