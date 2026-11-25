/**
 * تەپەككۇر بۇلىقى — يەرلىك ئۇيغۇرچە يېزىق ئالماشتۇرغۇچ
 * 100% Local Uyghur Script Converter: UEY (ئۇيغۇر ئەرەب يېزىقى) ⇄ ULY (ئۇيغۇر لاتىن يېزىقى)
 * Preserves Markdown code blocks and inline code cleanly.
 */

const UEY_TO_ULY_MAP: Record<string, string> = {
  'ا': 'a',
  'ە': 'e',
  'ب': 'b',
  'پ': 'p',
  'ت': 't',
  'ج': 'j',
  'چ': 'ch',
  'خ': 'x',
  'د': 'd',
  'ر': 'r',
  'ز': 'z',
  'ژ': 'zh',
  'س': 's',
  'ش': 'sh',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'گ': 'g',
  'ڭ': 'ng',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ھ': 'h',
  'و': 'o',
  'ۇ': 'u',
  'ۆ': 'ö',
  'ۈ': 'ü',
  'ۋ': 'w',
  'ې': 'é',
  'ى': 'i',
  'ي': 'y',
  '،': ',',
  '؛': ';',
  '؟': '?',
  '«': '"',
  '»': '"',
};

const UEY_VOWELS = new Set(['ا', 'ە', 'ې', 'ى', 'و', 'ۇ', 'ۆ', 'ۈ']);

const ULY_DIGRAPHS: Record<string, string> = {
  ch: 'چ',
  sh: 'ش',
  gh: 'غ',
  ng: 'ڭ',
  zh: 'ژ',
};

const ULY_SINGLE_MAP: Record<string, string> = {
  a: 'ا',
  e: 'ە',
  é: 'ې',
  ë: 'ې',
  i: 'ى',
  o: 'و',
  u: 'ۇ',
  ö: 'ۆ',
  ü: 'ۈ',
  b: 'ب',
  p: 'پ',
  t: 'ت',
  j: 'ج',
  x: 'خ',
  d: 'د',
  r: 'ر',
  z: 'ز',
  s: 'س',
  f: 'ف',
  q: 'ق',
  k: 'ك',
  g: 'گ',
  l: 'ل',
  m: 'م',
  n: 'ن',
  h: 'ھ',
  w: 'ۋ',
  v: 'ۋ',
  y: 'ي',
  ',': '،',
  ';': '؛',
  '?': '؟',
};

const ULY_VOWELS = new Set(['a', 'e', 'é', 'ë', 'i', 'o', 'u', 'ö', 'ü']);

function convertPlainUeyToUly(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // Hamza (ئ) before a vowel: drop at word start, emit apostrophe between vowels/inside word
    if (ch === 'ئ') {
      const prev = i > 0 ? text[i - 1] : '';
      const next = i + 1 < text.length ? text[i + 1] : '';
      const prevIsUyghurLetter = Boolean(UEY_TO_ULY_MAP[prev]);
      if (prevIsUyghurLetter && UEY_VOWELS.has(next)) {
        out += "'";
      }
      continue;
    }

    // Disambiguate adjacent letters that could form a digraph (e.g. ن + گ -> n'g)
    const mapped = UEY_TO_ULY_MAP[ch];
    if (mapped !== undefined) {
      const next = i + 1 < text.length ? text[i + 1] : '';
      if (
        (ch === 'ن' && next === 'گ') ||
        (ch === 'س' && next === 'ھ') ||
        (ch === 'گ' && next === 'ھ') ||
        (ch === 'ز' && next === 'ھ')
      ) {
        out += `${mapped}'`;
      } else {
        out += mapped;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function convertPlainUlyToUey(text: string): string {
  let out = '';
  let i = 0;

  const isWordBoundaryBefore = (idx: number) => {
    if (idx === 0) return true;
    const prev = text[idx - 1];
    return !/[a-zA-ZéëöüÉËÖÜ']/.test(prev);
  };

  while (i < text.length) {
    const raw = text[i];
    const lower = raw.toLowerCase();

    // Explicit apostrophe separator
    if (raw === "'" || raw === '’') {
      const nextLower = (text[i + 1] ?? '').toLowerCase();
      if (ULY_VOWELS.has(nextLower)) {
        out += 'ئ';
      }
      i++;
      continue;
    }

    // Check 2-letter digraphs first
    if (i + 1 < text.length) {
      const pair = lower + text[i + 1].toLowerCase();
      if (ULY_DIGRAPHS[pair]) {
        out += ULY_DIGRAPHS[pair];
        i += 2;
        continue;
      }
    }

    const mapped = ULY_SINGLE_MAP[lower];
    if (mapped !== undefined) {
      if (ULY_VOWELS.has(lower)) {
        const prevChar = i > 0 ? text[i - 1].toLowerCase() : '';
        if (isWordBoundaryBefore(i) || ULY_VOWELS.has(prevChar)) {
          out += 'ئ';
        }
      }
      out += mapped;
    } else {
      out += raw;
    }
    i++;
  }

  return out;
}

/**
 * Converts text while preserving fenced code blocks (```...```), inline code (`...`), and URLs.
 */
function transformPreservingCode(text: string, fn: (segment: string) => string): string {
  const tokenRegex = /(```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s)]+|local-img:\/\/[^\s)]+)/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += fn(text.slice(lastIndex, match.index));
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result += fn(text.slice(lastIndex));
  }

  return result;
}

export function convertUeyToUly(text: string): string {
  return transformPreservingCode(text, convertPlainUeyToUly);
}

export function convertUlyToUey(text: string): string {
  return transformPreservingCode(text, convertPlainUlyToUey);
}
