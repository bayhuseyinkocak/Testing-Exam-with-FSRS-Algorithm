import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const exams = sqliteTable('exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
});

export const topics = sqliteTable('topics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exam_id: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exam_id: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  topic_id: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['single', 'multiple', 'true_false', 'fill_blank'] }).notNull(),
  question_text: text('question_text').notNull(),
  explanation: text('explanation'),
  translation: text('translation'),
  order: integer('order').notNull().default(0),
});

export const options = sqliteTable('options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  option_text: text('option_text').notNull(),
  is_correct: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
  order: integer('order').notNull().default(0),
});

export const statements = sqliteTable('statements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  statement_text: text('statement_text').notNull(),
  correct_value: integer('correct_value', { mode: 'boolean' }).notNull().default(false),
});

export const blanks = sqliteTable('blanks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  options_json: text('options_json').notNull(),
  correct_index: integer('correct_index').notNull(),
});

export const userQuestionFsrs = sqliteTable(
  'user_question_fsrs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    due: integer('due', { mode: 'timestamp' }).notNull(),
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    elapsed_days: real('elapsed_days').notNull().default(0),
    scheduled_days: real('scheduled_days').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    state: integer('state').notNull().default(0),
    learning_steps: integer('learning_steps').notNull().default(0),
    last_review: integer('last_review', { mode: 'timestamp' }),
  },
  (t) => [uniqueIndex('uq_user_question').on(t.user_id, t.question_id)],
);

export const reviewLogs = sqliteTable('review_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  question_id: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  rating: text('rating').notNull(),
  is_correct: integer('is_correct', { mode: 'boolean' }).notNull(),
  selected_options: text('selected_options'),
  answered_at: integer('answered_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  new_interval: real('new_interval'),
  new_stability: real('new_stability'),
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
