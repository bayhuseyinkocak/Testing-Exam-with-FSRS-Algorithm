import {
  pgTable,
  pgEnum,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  uniqueIndex,
  serial,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'user']);
export const questionTypeEnum = pgEnum('question_type', ['single', 'multiple', 'true_false', 'fill_blank']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const exams = pgTable('exams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
});

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  exam_id: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  exam_id: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  topic_id: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  type: questionTypeEnum('type').notNull(),
  question_text: text('question_text').notNull(),
  explanation: text('explanation'),
  translation: text('translation'),
  order: integer('order').notNull().default(0),
});

export const options = pgTable('options', {
  id: serial('id').primaryKey(),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  option_text: text('option_text').notNull(),
  is_correct: boolean('is_correct').notNull().default(false),
  order: integer('order').notNull().default(0),
});

export const statements = pgTable('statements', {
  id: serial('id').primaryKey(),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  statement_text: text('statement_text').notNull(),
  correct_value: boolean('correct_value').notNull().default(false),
});

export const blanks = pgTable('blanks', {
  id: serial('id').primaryKey(),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  options_json: text('options_json').notNull(),
  correct_index: integer('correct_index').notNull(),
});

export const userQuestionFsrs = pgTable(
  'user_question_fsrs',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    due: timestamp('due', { withTimezone: true }).notNull(),
    stability: doublePrecision('stability').notNull(),
    difficulty: doublePrecision('difficulty').notNull(),
    elapsed_days: doublePrecision('elapsed_days').notNull().default(0),
    scheduled_days: doublePrecision('scheduled_days').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    state: integer('state').notNull().default(0),
    learning_steps: integer('learning_steps').notNull().default(0),
    last_review: timestamp('last_review', { withTimezone: true }),
  },
  (t) => [uniqueIndex('uq_user_question').on(t.user_id, t.question_id)],
);

export const reviewLogs = pgTable('review_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  rating: text('rating').notNull(),
  is_correct: boolean('is_correct').notNull(),
  selected_options: text('selected_options'),
  answered_at: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  new_interval: doublePrecision('new_interval'),
  new_stability: doublePrecision('new_stability'),
});

export const fsrsParams = pgTable('fsrs_params', {
  user_id: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  w_json: text('w_json').notNull(),
  review_count: integer('review_count').notNull().default(0),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Kullanıcı geneli çalışma ayarları. new_cards_per_day = 0 ise sınırsız yeni kart.
export const studySettings = pgTable('study_settings', {
  user_id: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  new_cards_per_day: integer('new_cards_per_day').notNull().default(20),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type Option = typeof options.$inferSelect;
export type Statement = typeof statements.$inferSelect;
export type Blank = typeof blanks.$inferSelect;
