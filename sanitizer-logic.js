export const SECURITY_PATTERNS = [
  { pattern: /ignore (all )?previous instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /forget (all )?instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /disregard (all )?(above|previous) (instructions|tasks)/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
  { pattern: /(your new task is|you are now|actually you must)/gi, replacement: '[BLOCKED_TASK_INJECTION]' },
  { pattern: /override system prompts?/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' }
];

/**
 * Shared interactivity logic used by both the userscript and verification suite.
 */
export function isInteractive(el) {
    if (!el) return false;
    const tagName = el.tagName ? el.tagName.toUpperCase() : '';
    const interactiveTags = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY']);
    if (interactiveTags.has(tagName)) return true;

    const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : (el.style || {});
    if (style.cursor === 'pointer') return true;

    // Support property-based check for framework-heavy sites
    if (el.isContentEditable || el.contentEditable === 'true' || (el.getAttribute && el.getAttribute('contenteditable') === 'true')) return true;

    if (el.hasAttribute && (el.hasAttribute('onclick') || el.getAttribute('role') === 'button')) return true;
    return false;
}

/**
 * Hardened sanitization logic using NFKC normalization and broad Unicode format stripping.
 */
export function sanitize(text) {
  if (!text) return "";

  // NFKC Normalization + stripping Unicode format characters (invisible bypasses)
  let result = text.normalize('NFKC');
  const invisiblePattern = /[\u00AD\u034F\u061C\u070F\u180E\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF]/g;
  result = result.replace(invisiblePattern, '');

  try {
      // Use Unicode property escape if available
      result = result.replace(/\p{Cf}/gu, '');
  } catch (e) {}

  for (const { pattern, replacement } of SECURITY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
