import { Workbook } from 'exceljs';

export type QuestionInputLoose = {
  type: string;
  question_text: string;
  explanation?: string | null;
  translation?: string | null;
  topic_id?: number | null;
  order?: number;
  options?: { option_text: string; is_correct: boolean; order?: number }[];
  statements?: { statement_text: string; correct_value: boolean }[];
  blanks?: { position: number; options: string[]; correct_index: number }[];
};

// ---------- CSV (basit RFC4180) ----------
export function parseCsv(text: string): string[][] {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // yoksay
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ---------- Excel ----------
function cellToText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('result' in obj && obj.result !== null && obj.result !== undefined) return String(obj.result);
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map((r) => r.text ?? '').join('');
    }
    if (v instanceof Date) return v.toISOString();
    if ('text' in obj) return String(obj.text);
  }
  return String(v);
}

export async function parseExcel(buffer: Buffer): Promise<string[][]> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as any);
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error('Excel dosyasında sayfa bulunamadı');
  const rows: string[][] = [];
  ws.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (values.length < colNumber - 1) values.push('');
      values.push(cellToText(cell.value));
    });
    rows.push(values);
  });
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ---------- JSON ----------
export function parseJsonImport(text: string): QuestionInputLoose[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data as QuestionInputLoose[];
  if (data && typeof data === 'object' && Array.isArray((data as any).questions)) {
    return (data as any).questions as QuestionInputLoose[];
  }
  throw new Error('JSON formatı geçersiz: "questions" dizisi bekleniyor');
}

// ---------- Satır -> soru dönüşümü ----------
function normalizeHeader(h: string): string | null {
  const key = h.trim().toLowerCase();
  const map: Record<string, string> = {
    type: 'type',
    tip: 'type',
    'soru tipi': 'type',
    sorutipi: 'type',
    question_text: 'question_text',
    question: 'question_text',
    soru: 'question_text',
    'soru metni': 'question_text',
    explanation: 'explanation',
    aciklama: 'explanation',
    açıklama: 'explanation',
    translation: 'translation',
    tercume: 'translation',
    çeviri: 'translation',
    choices: 'choices',
    options: 'choices',
    secenekler: 'choices',
    seçenekler: 'choices',
    correct: 'correct',
    dogru: 'correct',
    doğru: 'correct',
    answer: 'correct',
  };
  return map[key] ?? null;
}

export function rowsToQuestions(rows: string[][]): {
  questions: QuestionInputLoose[];
  error?: string;
} {
  if (rows.length === 0) return { questions: [] };
  const headerRow = rows[0];
  const columns = headerRow.map((h, i) => ({ index: i, key: normalizeHeader(h) }));

  for (const req of ['type', 'question_text', 'choices', 'correct']) {
    if (!columns.some((c) => c.key === req)) {
      return {
        questions: [],
        error: 'Eksik kolon: "' + req + '". Gerekli başlıklar: type,question_text,explanation,choices,correct',
      };
    }
  }

  const questions: QuestionInputLoose[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key: string): string => {
      const col = columns.find((c) => c.key === key);
      return col ? (row[col.index] ?? '').trim() : '';
    };

    const type = get('type').toLowerCase();
    const questionText = get('question_text');
    if (!questionText) continue;
    const explanation = get('explanation') || undefined;
    const translation = get('translation') || undefined;
    const choices = get('choices').split('|').map((s) => s.trim()).filter(Boolean);
    const correctParts = get('correct').split(',').map((s) => s.trim()).filter(Boolean);

    let q: QuestionInputLoose;

    if (type === 'single' || type === 'multiple') {
      const opts = choices.map((text, i) => ({ option_text: text, is_correct: false, order: i }));
      if (opts.length < 2) continue;
      if (type === 'single') {
        const idx = parseInt(correctParts[0] ?? '', 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= opts.length) continue;
        opts[idx].is_correct = true;
      } else {
        for (const part of correctParts) {
          const idx = parseInt(part, 10) - 1;
          if (!Number.isNaN(idx) && idx >= 0 && idx < opts.length) opts[idx].is_correct = true;
        }
      }
      q = { type, question_text: questionText, explanation, translation, options: opts };
    } else if (type === 'true_false') {
      const stmts = choices.map((text) => ({ statement_text: text, correct_value: false }));
      if (stmts.length < 1) continue;
      correctParts.forEach((part, i) => {
        if (i < stmts.length) {
          const t = part.toLowerCase();
          stmts[i].correct_value = t === 't' || t === 'true' || t === '1' || t === 'doğru' || t === 'dogru';
        }
      });
      q = { type, question_text: questionText, explanation, translation, statements: stmts };
    } else if (type === 'fill_blank') {
      const idx = parseInt(correctParts[0] ?? '', 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= choices.length) continue;
      q = {
        type,
        question_text: questionText,
        explanation,
        translation,
        blanks: [{ position: 1, options: choices, correct_index: idx }],
      };
    } else {
      continue;
    }

    questions.push(q);
  }

  return { questions };
}
