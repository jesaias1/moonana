import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  tokenBalance: integer('token_balance').notNull().default(10), // start with 10 free tokens
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const generationsTable = pgTable('generations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id),
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const purchasesTable = pgTable('purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id),
  stripeSessionId: text('stripe_session_id').unique().notNull(),
  tokensAdded: integer('tokens_added').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
