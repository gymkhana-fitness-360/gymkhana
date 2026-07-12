"use strict";

import { PaymentMethod } from "@prisma/client";

/**
 * TEXT PARSER SERVICE
 *
 * Parses natural language payment text into structured data.
 * Multi-pass: token normalize → phones → amount+method pairs (splits) → admission/duration → dates → name.
 */

export interface ParsedPayment {
  amount: number | null;
  method: PaymentMethod | null;
  name: string;
  duration: string | null;
  phone: string | null;
  date: Date | null;
  splitPayments: Array<{ amount: number; method: PaymentMethod }> | null;
}

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 99_999;

/** Tokens to drop from the member name (noise). */
const NAME_STOPWORDS = new Set([
  "payment",
  "payments",
  "split",
  "paid",
  "pay",
  "received",
  "for",
  "the",
  "a",
  "an",
  "via",
  "using",
  "member",
  "members",
  "fees",
  "fee",
  "gym",
  "pt",
  "txn",
  "transaction",
  "done",
  "ok",
  "yes",
  "pls",
  "please",
  "thanks",
  "thank",
  "you",
  "and",
  "or",
  "with",
  "from",
  "to",
]);

/**
 * Convert text to Title Case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeMethodToken(raw: string): string {
  const w = raw.toLowerCase().replace(/[^a-z+]/g, (c) => (c === "+" ? "+" : ""));
  const typoMap: Record<string, string> = {
    upii: "upi",
    upu: "upi",
    upis: "upi",
    phonepe: "phonepe",
    phonpe: "phonepe",
    fonepe: "phonepe",
    gpay: "gpay",
    googlepay: "gpay",
    paytm: "paytm",
    patym: "paytm",
    cas: "cash",
    csh: "cash",
    caash: "cash",
    neft: "neft",
    imps: "imps",
    card: "card",
    debit: "card",
    credit: "card",
    bank: "bank",
    transfer: "transfer",
    online: "online",
    netbanking: "banktransfer",
    upi: "upi",
    cash: "cash",
    mixed: "mixed",
    other: "other",
  };
  return typoMap[w] || raw.toLowerCase().replace(/[^a-z+]/g, "");
}

const paymentMethodMap: Record<string, PaymentMethod> = {
  upi: PaymentMethod.UPI,
  online: PaymentMethod.UPI,
  gpay: PaymentMethod.UPI,
  paytm: PaymentMethod.UPI,
  phonepe: PaymentMethod.UPI,
  cash: PaymentMethod.CASH,
  card: PaymentMethod.CARD,
  bank: PaymentMethod.BANK_TRANSFER,
  transfer: PaymentMethod.BANK_TRANSFER,
  banktransfer: PaymentMethod.BANK_TRANSFER,
  neft: PaymentMethod.BANK_TRANSFER,
  imps: PaymentMethod.BANK_TRANSFER,
  mixed: PaymentMethod.MIXED,
  other: PaymentMethod.OTHER,
};

function resolveMethodToken(token: string): PaymentMethod | undefined {
  const n = normalizeMethodToken(token);
  return paymentMethodMap[n];
}

/** Indian mobile from a pure-digit token; null if not a phone. */
function digitsAsIndianPhone(word: string): string | null {
  const d = word.replace(/\D/g, "");
  if (d.length === 10 && /^[6-9]\d{9}$/.test(d)) return d;
  if (d.length === 11 && d.startsWith("0") && /^0[6-9]\d{9}$/.test(d)) return d.slice(1);
  if (d.length === 12 && d.startsWith("91") && /^91[6-9]\d{9}$/.test(d)) return d.slice(2);
  return null;
}

/**
 * Rupee amount token (not a phone). 3–6 digits, business range.
 */
function parseAmountToken(word: string): number | null {
  if (!/^\d+$/.test(word)) return null;
  if (word.length < 3 || word.length > 6) return null;
  if (digitsAsIndianPhone(word)) return null;
  const n = parseInt(word, 10);
  if (n < MIN_AMOUNT || n > MAX_AMOUNT) return null;
  return n;
}

/**
 * Split glued amount + 10-digit phone: 6999876543210, 700-9876543210, 1500+9988776655
 */
function tokenizePaymentLine(text: string): string[] {
  let t = text.trim().replace(/\s+/g, " ");
  t = t.replace(/[₹]/g, " ");
  t = t.replace(/\b(?:rs\.?|inr)\s*/gi, " ");
  // Amount glued to Indian mobile (no \b between digits — only at token edges)
  t = t.replace(/(\d{3,5})(91[6-9]\d{9})(?!\d)/g, "$1 $2");
  t = t.replace(/(\d{3,5})([6-9]\d{9})(?!\d)/g, "$1 $2");
  t = t.replace(/(\d{3,5})[+\-_](91[6-9]\d{9})(?!\d)/g, "$1 $2");
  t = t.replace(/(\d{3,5})[+\-_]([6-9]\d{9})(?!\d)/g, "$1 $2");
  // Glued amount + method
  t = t.replace(
    /(\d{2,6})(?:[/\-]|)(upi|cash|card|gpay|paytm|phonepe|online|neft|imps|bank|transfer|mixed|other)\b/gi,
    "$1 $2"
  );
  t = t.replace(/\b(\d{2,6})(upi|cash|card|gpay|paytm|phonepe|online)\b/gi, "$1 $2");
  t = t.replace(/(\d{2,6})\/-\s*/g, "$1 ");
  // Two amounts separated by + & and — helps split lines
  t = t.replace(/(\d{3,6})\s*\+\s*(\d{3,6})\b/g, "$1 + $2");
  t = t.replace(/(\d{3,6})\s+(?:&|and)\s+(\d{3,6})\b/gi, "$1 + $2");
  return t
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:'"]+|[,;:'"]+$/g, ""))
    .filter(Boolean);
}

/**
 * Parse flexible date formats
 */
export function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  let s = dateStr.trim().replace(/^[,;]+|[,;]+$/g, "");

  const naturalLang = s.match(
    /^(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})$/i
  );
  if (naturalLang) {
    const day = parseInt(naturalLang[1], 10);
    const monthStr = naturalLang[3].toLowerCase();
    const year = parseInt(naturalLang[4], 10);
    const monthMap: Record<string, number> = {
      january: 0,
      jan: 0,
      february: 1,
      feb: 1,
      march: 2,
      mar: 2,
      april: 3,
      apr: 3,
      may: 4,
      june: 5,
      jun: 5,
      july: 6,
      jul: 6,
      august: 7,
      aug: 7,
      september: 8,
      sep: 8,
      october: 9,
      oct: 9,
      november: 10,
      nov: 10,
      december: 11,
      dec: 11,
    };
    const month = monthMap[monthStr];
    if (month !== undefined) {
      const date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime()) && date.getMonth() === month) return date;
    }
  }

  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime()) && date.getMonth() === month) return date;
  }

  const dmyy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (dmyy) {
    const day = parseInt(dmyy[1], 10);
    const month = parseInt(dmyy[2], 10) - 1;
    let year = parseInt(dmyy[3], 10);
    year = year < 50 ? 2000 + year : 1900 + year;
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime()) && date.getMonth() === month) return date;
  }

  const yyyymmdd = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime()) && date.getMonth() === month) return date;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

const DURATION_MAP: Record<string, string> = {
  renewal: "1 Month Renewal",
  renew: "1 Month Renewal",
  renwal: "1 Month Renewal",
  renewl: "1 Month Renewal",
  admission: "New Admission",
  admisson: "New Admission",
  admision: "New Admission",
  addmission: "New Admission",
  adm: "New Admission",
  join: "New Admission",
  joining: "New Admission",
  joinee: "New Admission",
  monthly: "1 Month",
  month: "1 Month",
  quarterly: "3 Months",
  halfyearly: "6 Months",
  yearly: "12 Months",
  annual: "12 Months",
};

const ADMISSION_BIGRAMS: [string, string][] = [
  ["new", "admission"],
  ["new", "member"],
  ["new", "join"],
  ["new", "joinee"],
  ["first", "time"],
  ["fresh", "admission"],
];

function isConnector(word: string): boolean {
  const w = word.toLowerCase();
  return w === "+" || w === "and" || w === "&" || w === "plus" || w === "then";
}

function isLikelyDateToken(word: string): boolean {
  if (parseFlexibleDate(word)) return true;
  return /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(word.trim());
}

/** After amount, renewal-ish word with no explicit method → assume UPI (common in India). */
const IMPLICIT_METHOD_AFTER_AMOUNT = new Set([
  "renewal",
  "renew",
  "renwal",
  "renewl",
  "monthly",
  "month",
]);

/**
 * Collect every (amount, method) pair; marks consumed indices in used.
 */
function collectAmountMethodPairs(words: string[], used: Set<number>): Array<{ amount: number; method: PaymentMethod }> {
  const pairs: Array<{ amount: number; method: PaymentMethod }> = [];
  const n = words.length;

  const skipUsedAndConnectors = (j: number): number => {
    while (j < n && (used.has(j) || isConnector(words[j]))) j++;
    return j;
  };

  const tryPair = (amountIdx: number, methodIdx: number): boolean => {
    if (used.has(amountIdx) || used.has(methodIdx)) return false;
    const amt = parseAmountToken(words[amountIdx]);
    if (amt == null) return false;
    const method = resolveMethodToken(words[methodIdx]);
    if (!method) return false;
    pairs.push({ amount: amt, method });
    used.add(amountIdx);
    used.add(methodIdx);
    return true;
  };

  const pushImplicit = (amountIdx: number, method: PaymentMethod): boolean => {
    if (used.has(amountIdx)) return false;
    const amt = parseAmountToken(words[amountIdx]);
    if (amt == null) return false;
    pairs.push({ amount: amt, method });
    used.add(amountIdx);
    return true;
  };

  // Pass 0: "New Admission" + amount + method OR + amount + date (implicit cash)
  for (let i = 0; i + 2 < n; i++) {
    if (used.has(i) || used.has(i + 1)) continue;
    if (words[i].toLowerCase() !== "new" || words[i + 1].toLowerCase() !== "admission") continue;
    const aIdx = i + 2;
    if (used.has(aIdx) || parseAmountToken(words[aIdx]) == null) continue;
    const after = i + 3;
    if (after < n && resolveMethodToken(words[after]) && !used.has(after)) {
      if (tryPair(aIdx, after)) {
        used.add(i);
        used.add(i + 1);
      }
      continue;
    }
    if (after < n && isLikelyDateToken(words[after])) {
      pushImplicit(aIdx, PaymentMethod.CASH);
      used.add(i);
      used.add(i + 1);
    }
  }

  const skipToMethodAfterSplit = (start: number): number => {
    let j = start;
    while (j < n) {
      if (used.has(j)) {
        j++;
        continue;
      }
      if (isConnector(words[j])) {
        j++;
        continue;
      }
      if (parseAmountToken(words[j]) != null) {
        j++;
        continue;
      }
      if (resolveMethodToken(words[j])) return j;
      j++;
    }
    return n;
  };

  // Pass E (early): "400 + 300 upi" — chain amounts separated ONLY by connectors to a trailing method.
  // Stop chaining if a method token appears mid-chain (e.g. "400 + UPI 300" → only 300 UPI, 400 is orphan).
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    if (parseAmountToken(words[i]) == null) continue;

    const chain: number[] = [i];
    let j = i + 1;
    while (j < n) {
      if (used.has(j)) {
        j++;
        continue;
      }
      if (isConnector(words[j])) {
        j++;
        continue;
      }
      if (resolveMethodToken(words[j])) break;
      if (parseAmountToken(words[j]) != null) {
        chain.push(j);
        j++;
        continue;
      }
      break;
    }
    if (j >= n || used.has(j) || !resolveMethodToken(words[j])) continue;
    if (chain.length < 2) continue;

    const method = resolveMethodToken(words[j])!;
    for (const ai of chain) {
      if (used.has(ai)) continue;
      pairs.push({ amount: parseAmountToken(words[ai])!, method });
      used.add(ai);
    }
    used.add(j);
  }

  // Pass A: amount then method (canonical) — do NOT skip connectors (they indicate splits)
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    if (parseAmountToken(words[i]) == null) continue;
    let j = i + 1;
    while (j < n && used.has(j)) j++;
    if (j < n && !isConnector(words[j]) && tryPair(i, j)) continue;
  }

  // Pass B: duration then amount then method (renewal 700 cash)
  for (let i = 0; i + 2 < n; i++) {
    if (used.has(i) || used.has(i + 1) || used.has(i + 2)) continue;
    const dur = words[i].toLowerCase();
    if (!DURATION_MAP[dur] || DURATION_MAP[dur] === "New Admission") continue;
    if (tryPair(i + 1, i + 2)) {
      used.add(i);
    }
  }

  // Pass C: admission then amount then method (admission 699 upi)
  for (let i = 0; i + 2 < n; i++) {
    if (used.has(i) || used.has(i + 1) || used.has(i + 2)) continue;
    const w0 = words[i].toLowerCase();
    const isAdm =
      w0 === "admission" ||
      w0 === "admisson" ||
      w0 === "admision" ||
      w0 === "addmission" ||
      w0 === "adm";
    if (!isAdm) continue;
    if (tryPair(i + 1, i + 2)) used.add(i);
  }

  // Pass D: method then amount (cash 700)
  for (let i = 1; i < n; i++) {
    if (used.has(i)) continue;
    if (parseAmountToken(words[i]) == null) continue;
    if (i >= 2) {
      const mPrev2 = resolveMethodToken(words[i - 2]);
      const mPrev1 = resolveMethodToken(words[i - 1]);
      if (mPrev2 && mPrev1) continue; // "cash upi 400 …" — Pass G pairs methods to amounts in order
    }
    const method = resolveMethodToken(words[i - 1]);
    if (!method || used.has(i - 1)) continue;
    if (tryPair(i, i - 1)) continue;
  }

  // Pass F: two+ unused amounts sharing one trailing method ("700 cash 400 + 300 upi renewal …")
  const applySharedTrailingMethod = () => {
    const amountIdxs: number[] = [];
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      if (parseAmountToken(words[i]) != null) amountIdxs.push(i);
    }
    if (amountIdxs.length < 2) return;
    let methodIdx = -1;
    for (let k = amountIdxs[amountIdxs.length - 1] + 1; k < n; k++) {
      if (used.has(k)) continue;
      const m = resolveMethodToken(words[k]);
      if (m) {
        methodIdx = k;
        break;
      }
    }
    if (methodIdx < 0) return;
    const shared = resolveMethodToken(words[methodIdx])!;
    for (const ai of amountIdxs) {
      if (used.has(ai)) continue;
      pairs.push({ amount: parseAmountToken(words[ai])!, method: shared });
      used.add(ai);
    }
    used.add(methodIdx);
  };

  applySharedTrailingMethod();

  // Pass G: "cash upi 400 300" — two methods then two amounts (in order)
  if (pairs.length === 0) {
    const methods: { idx: number; m: PaymentMethod }[] = [];
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      const m = resolveMethodToken(words[i]);
      if (m) methods.push({ idx: i, m });
    }
    const amounts: { idx: number; v: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      const v = parseAmountToken(words[i]);
      if (v != null) amounts.push({ idx: i, v });
    }
    if (methods.length >= 2 && amounts.length === 2 && methods[0].idx < amounts[0].idx && methods[1].idx < amounts[1].idx) {
      pairs.push({ amount: amounts[0].v, method: methods[0].m });
      pairs.push({ amount: amounts[1].v, method: methods[1].m });
      used.add(methods[0].idx);
      used.add(methods[1].idx);
      used.add(amounts[0].idx);
      used.add(amounts[1].idx);
    } else if (methods.length >= 1 && amounts.length >= 1) {
      for (const { idx: ai, v } of amounts) {
        let best: PaymentMethod | null = null;
        for (const { idx: mi, m } of methods) {
          if (mi < ai) best = m;
        }
        if (best) {
          pairs.push({ amount: v, method: best });
          used.add(ai);
        }
      }
      for (const { idx: mi } of methods) used.add(mi);
    }
  }

  // Implicit UPI when amount is directly followed by renewal/monthly (no method written)
  for (let i = 0; i + 1 < n; i++) {
    if (used.has(i) || parseAmountToken(words[i]) == null) continue;
    const nxt = words[i + 1].toLowerCase();
    if (!IMPLICIT_METHOD_AFTER_AMOUNT.has(nxt)) continue;
    pushImplicit(i, PaymentMethod.UPI);
  }

  return pairs;
}

const DURATION_CONSUME_WORDS = new Set([
  "renewal",
  "renew",
  "renwal",
  "renewl",
  "admission",
  "admisson",
  "admision",
  "addmission",
  "adm",
  "joining",
  "join",
  "joinee",
  "monthly",
  "month",
  "quarterly",
  "halfyearly",
  "yearly",
  "annual",
]);

function detectDurationAndAdmission(words: string[], used: Set<number>): string | null {
  let duration: string | null = null;
  const n = words.length;

  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    const w = words[i].toLowerCase();

    let bigramHit = false;
    for (const [a, b] of ADMISSION_BIGRAMS) {
      if (w === a && i + 1 < n && words[i + 1].toLowerCase() === b) {
        duration = "New Admission";
        used.add(i);
        used.add(i + 1);
        i++;
        bigramHit = true;
        break;
      }
    }
    if (bigramHit) continue;

    const mapped = DURATION_MAP[w];
    if (!mapped) continue;

    duration = mapped;
    if (DURATION_CONSUME_WORDS.has(w)) {
      used.add(i);
    }
  }

  return duration;
}

/**
 * Parse payment text into structured data
 */
export function parsePaymentText(text: string): ParsedPayment {
  const words = tokenizePaymentLine(text);
  const used = new Set<number>();

  let phone: string | null = null;
  for (let i = 0; i < words.length; i++) {
    const p = digitsAsIndianPhone(words[i]);
    if (p) {
      phone = p;
      used.add(i);
      break;
    }
  }

  const payments = collectAmountMethodPairs(words, used);

  let duration: string | null = null;
  for (let i = 0; i + 1 < words.length; i++) {
    if (
      words[i].toLowerCase() === "new" &&
      words[i + 1].toLowerCase() === "admission" &&
      used.has(i) &&
      used.has(i + 1)
    ) {
      duration = "New Admission";
      break;
    }
  }
  if (!duration) {
    duration = detectDurationAndAdmission(words, used);
  }

  let date: Date | null = null;
  const dateWords: string[] = [];
  let collectingDate = false;

  const nameWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    if (used.has(i)) continue;

    const word = words[i];
    const wordLower = word.toLowerCase();

    if (!phone) {
      const p = digitsAsIndianPhone(word);
      if (p) {
        phone = p;
        continue;
      }
    }

    if (!date && /^\d{1,2}(st|nd|rd|th)$/i.test(word)) {
      collectingDate = true;
      dateWords.push(word);
      continue;
    }

    if (collectingDate) {
      const months = [
        "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
        "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
      ];
      if (months.includes(wordLower)) {
        dateWords.push(word);
        continue;
      }
      if (/^\d{4}$/.test(word)) {
        dateWords.push(word);
        const parsedDate = parseFlexibleDate(dateWords.join(" "));
        if (parsedDate) {
          date = parsedDate;
          collectingDate = false;
          dateWords.length = 0;
          continue;
        }
      }
    }

    if (!date && /[\d/.-]+/.test(word) && (word.includes("/") || word.includes("-") || word.includes("."))) {
      const parsedDate = parseFlexibleDate(word);
      if (parsedDate) {
        date = parsedDate;
        continue;
      }
    }

    if (collectingDate) continue;

    if (NAME_STOPWORDS.has(wordLower)) continue;

    if (isConnector(word) && nameWords.length === 0) continue;

    // Skip orphan amount-like tokens (3-5 digits in valid range) from name
    if (/^\d{3,5}$/.test(word)) {
      const maybeAmt = parseInt(word, 10);
      if (maybeAmt >= MIN_AMOUNT && maybeAmt <= MAX_AMOUNT) continue;
    }

    nameWords.push(word);
  }

  const rawName = nameWords.join(" ").trim().replace(/^[,;:'"]+|[,;:'"]+$/g, "");
  const cleanedName = rawName
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*[+&]\s*$/g, "")
    .replace(/^\s*[+&]\s*/g, "");
  const name = cleanedName.trim();

  if (payments.length > 1) {
    return {
      amount: null,
      method: null,
      name,
      duration,
      phone,
      date,
      splitPayments: payments,
    };
  }

  const single = payments.length === 1 ? payments[0] : null;
  return {
    amount: single?.amount ?? null,
    method: single?.method ?? null,
    name,
    duration,
    phone,
    date,
    splitPayments: null,
  };
}
