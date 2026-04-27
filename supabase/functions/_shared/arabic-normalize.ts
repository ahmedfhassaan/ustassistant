// Arabic text normalization + light fuzzy correction for RAG queries.
// Safe by design: never invents words, only swaps tokens for known
// university-domain terms when they are within Levenshtein distance ≤ 2
// of the normalized form.

const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g; // tashkeel + tatweel

export function normalizeArabic(text: string): string {
  if (!text) return "";
  let s = text.normalize("NFKC");
  s = s.replace(DIACRITICS, "");
  s = s
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // أ إ آ ٱ → ا
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u064A"); // ئ → ي
  // Collapse repeated whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// Canonical term → list of accepted variants (raw + common typos)
export const UNIVERSITY_TERMS: Record<string, string[]> = {
  "الحرمان": ["الحرمان", "الجرمان", "الجومان", "الحرمن", "حرمان", "حرمن"],
  "التسجيل": ["التسجيل", "تسجيل", "التسجل", "التسجييل"],
  "الانسحاب": ["الانسحاب", "انسحاب", "الانسحب", "انسحب"],
  "الحذف": ["الحذف", "حذف", "حذف مادة", "حذف ماده"],
  "الإضافة": ["الاضافه", "اضافه", "الاضافة", "اضافة", "اضافه ماده"],
  "المعدل": ["المعدل", "معدل", "المعدل التراكمي", "GPA", "تراكمي"],
  "الرسوم": ["الرسوم", "الرسم", "رسوم", "رسم", "الرسوم الدراسيه"],
  "الاختبارات": ["الاختبارات", "اختبارات", "الامتحانات", "الامتحان", "امتحان", "اختبار"],
  "الغياب": ["الغياب", "غياب", "غياب الطالب", "الحضور والغياب"],
  "القبول": ["القبول", "قبول", "التقديم", "تقديم"],
};

// Pre-build a map: normalized variant → canonical term
const VARIANT_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(UNIVERSITY_TERMS)) {
    for (const v of variants) m.set(normalizeArabic(v), canonical);
  }
  return m;
})();

const NORMALIZED_KEYS = Array.from(VARIANT_INDEX.keys());

// Iterative Levenshtein with early exit if distance exceeds maxDist.
function levenshtein(a: string, b: string, maxDist: number): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > maxDist) return maxDist + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

const TOKEN_SPLIT = /(\s+)/; // keep separators so we can rebuild

export interface FuzzyResult {
  corrected: string;
  changedWords: string[];
  confidence: "high" | "low" | "none";
}

export function fuzzyCorrect(text: string): FuzzyResult {
  const original = text.trim();
  if (!original) return { corrected: original, changedWords: [], confidence: "none" };

  const parts = original.split(TOKEN_SPLIT);
  const changed: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const word = parts[i];
    if (!word || /^\s+$/.test(word)) continue;
    // Strip trailing punctuation we shouldn't try to match
    const m = word.match(/^([\u0600-\u06FFA-Za-z0-9]+)(.*)$/);
    if (!m) continue;
    const core = m[1];
    const tail = m[2] || "";
    if (core.length < 4) continue; // skip very short words

    const norm = normalizeArabic(core);
    if (!norm) continue;

    // Exact normalized match → swap to canonical immediately
    const direct = VARIANT_INDEX.get(norm);
    if (direct) {
      if (core !== direct) {
        parts[i] = direct + tail;
        changed.push(`${core}→${direct}`);
      }
      continue;
    }

    // Fuzzy: find closest variant within distance ≤ 2
    let best: { key: string; dist: number } | null = null;
    for (const key of NORMALIZED_KEYS) {
      // Quick length filter
      if (Math.abs(key.length - norm.length) > 2) continue;
      const d = levenshtein(norm, key, 2);
      if (d <= 2 && (!best || d < best.dist)) {
        best = { key, dist: d };
        if (d === 0) break;
      }
    }
    if (best) {
      const canonical = VARIANT_INDEX.get(best.key)!;
      if (canonical && canonical !== core) {
        parts[i] = canonical + tail;
        changed.push(`${core}→${canonical}`);
      }
    }
  }

  const corrected = parts.join("");
  const confidence: FuzzyResult["confidence"] =
    changed.length === 0 ? "none" : changed.length <= 1 ? "high" : "low";
  return { corrected, changedWords: changed, confidence };
}

// Returns a deduped, ordered list of query variants worth searching with.
export function generateQueryVariants(question: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const v = (s || "").trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };

  push(question);
  const normalized = normalizeArabic(question);
  push(normalized);
  const fuzzy = fuzzyCorrect(question);
  if (fuzzy.changedWords.length > 0) push(fuzzy.corrected);
  return out;
}
