// Keeps AI-written copy natural: no em/en dashes, no emoji. Mirrors server/services/claudeService.js.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍⃣]/gu;

export function humanize(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(EMOJI, '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/(\d)\s*–\s*(\d)/g, '$1-$2')
    .replace(/\s+–\s+/g, ' - ')
    .replace(/–/g, '-')
    .replace(/ {2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .replace(/,\s*,/g, ',');
}
