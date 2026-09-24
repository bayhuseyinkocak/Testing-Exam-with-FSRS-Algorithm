// SQLite -> PostgreSQL tek seferlik veri taşıma (bir kez çalıştırıldı, artık gerek yok)
// Çalıştırmak gerekirse önce: pnpm add -D better-sqlite3 @types/better-sqlite3
// Kullanım: SQLITE_PATH=./data/app.db DATABASE_URL=<pg-url> tsx scripts/migrate-sqlite-to-pg.ts
import Database from 'better-sqlite3';
import { Pool } from 'pg';

const SQLITE_PATH = process.env.SQLITE_PATH ?? './data/app.db';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5433/app';

// drizzle sqlite timestamp modu unix SANİYE olarak saklar; pg'de Date olur
function toDate(v: number | null): Date | null {
  if (v == null) return null;
  return new Date(v * 1000);
}

function toBool(v: number): boolean {
  return v === 1;
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'TRUNCATE TABLE review_logs, user_question_fsrs, blanks, statements, options, questions, topics, exams, users RESTART IDENTITY CASCADE',
    );

    // users
    for (const u of sqlite.prepare('SELECT * FROM users').all() as any[]) {
      await client.query(
        'INSERT INTO users (id, username, password_hash, role, created_at) VALUES ($1,$2,$3,$4,$5)',
        [u.id, u.username, u.password_hash, u.role, toDate(u.created_at)],
      );
    }

    // exams
    for (const e of sqlite.prepare('SELECT * FROM exams').all() as any[]) {
      await client.query('INSERT INTO exams (id, name, code, description) VALUES ($1,$2,$3,$4)', [
        e.id, e.name, e.code, e.description,
      ]);
    }

    // topics
    for (const t of sqlite.prepare('SELECT * FROM topics').all() as any[]) {
      await client.query('INSERT INTO topics (id, exam_id, name) VALUES ($1,$2,$3)', [t.id, t.exam_id, t.name]);
    }

    // questions
    for (const q of sqlite.prepare('SELECT * FROM questions').all() as any[]) {
      await client.query(
        'INSERT INTO questions (id, exam_id, topic_id, type, question_text, explanation, translation, "order") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [q.id, q.exam_id, q.topic_id, q.type, q.question_text, q.explanation, q.translation ?? null, q.order],
      );
    }

    // options
    for (const o of sqlite.prepare('SELECT * FROM options').all() as any[]) {
      await client.query(
        'INSERT INTO options (id, question_id, option_text, is_correct, "order") VALUES ($1,$2,$3,$4,$5)',
        [o.id, o.question_id, o.option_text, toBool(o.is_correct), o.order],
      );
    }

    // statements
    for (const s of sqlite.prepare('SELECT * FROM statements').all() as any[]) {
      await client.query(
        'INSERT INTO statements (id, question_id, statement_text, correct_value) VALUES ($1,$2,$3,$4)',
        [s.id, s.question_id, s.statement_text, toBool(s.correct_value)],
      );
    }

    // blanks
    for (const b of sqlite.prepare('SELECT * FROM blanks').all() as any[]) {
      await client.query(
        'INSERT INTO blanks (id, question_id, position, options_json, correct_index) VALUES ($1,$2,$3,$4,$5)',
        [b.id, b.question_id, b.position, b.options_json, b.correct_index],
      );
    }

    // user_question_fsrs
    for (const f of sqlite.prepare('SELECT * FROM user_question_fsrs').all() as any[]) {
      await client.query(
        'INSERT INTO user_question_fsrs (id, user_id, question_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, learning_steps, last_review) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
        [f.id, f.user_id, f.question_id, toDate(f.due), f.stability, f.difficulty, f.elapsed_days, f.scheduled_days, f.reps, f.lapses, f.state, f.learning_steps, toDate(f.last_review)],
      );
    }

    // review_logs
    for (const l of sqlite.prepare('SELECT * FROM review_logs').all() as any[]) {
      await client.query(
        'INSERT INTO review_logs (id, user_id, question_id, rating, is_correct, selected_options, answered_at, new_interval, new_stability) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [l.id, l.user_id, l.question_id, l.rating, toBool(l.is_correct), l.selected_options, toDate(l.answered_at), l.new_interval, l.new_stability],
      );
    }

    // sequence'leri max(id) sonrasına çek (explicit id eklediğimiz için)
    const tables = ['users', 'exams', 'topics', 'questions', 'options', 'statements', 'blanks', 'user_question_fsrs', 'review_logs'];
    for (const t of tables) {
      await client.query(
        'SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT max(id) FROM ' + t + '), 1))',
        [t, 'id'],
      );
    }

    await client.query('COMMIT');
    console.log('SQLite -> PostgreSQL migration tamamlandi.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
