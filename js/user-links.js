/**
 * ─── Paste your link here (optional) ─────────────────────────────────────────
 * Put any HTTPS URL you want as your “open this to get or manage keys” bookmark,
 * e.g. https://aistudio.google.com/app/apikey
 *
 * Why you can “hide” this (unlike an API key):
 * - A normal public docs / AI Studio URL is not a credential — it does not grant
 *   access to your account. Sharing or committing it does not leak your key.
 * - If your link is private (internal wiki, team doc), you can hide it from git by:
 *   (1) leaving this empty and using Settings → “Reference link” in the app only
 *       (saved in localStorage, not in the repo), or
 *   (2) adding this file to .gitignore after you paste, or keeping a copy only locally.
 * Never paste your actual API key here — only URLs.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const MY_GEMINI_REFERENCE_LINK = '';

/** Shown when MY_GEMINI_REFERENCE_LINK is empty and the user has not saved one in Settings. */
export const DEFAULT_GEMINI_KEY_PAGE = 'https://aistudio.google.com/app/apikey';
