/**
 * Database schema, as numbered migrations. PRAGMA user_version records how
 * many have run. Never edit a shipped migration; add a new one at the end.
 */

export const MIGRATIONS: string[] = [
  // 1: first version
  `
  CREATE TABLE category (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE card (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT REFERENCES category(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    use_count INTEGER NOT NULL DEFAULT 0,
    last_used_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX card_category ON card(category_id);
  CREATE TABLE card_image (
    card_id TEXT NOT NULL REFERENCES card(id) ON DELETE CASCADE,
    side TEXT NOT NULL CHECK (side IN ('front', 'back')),
    full TEXT NOT NULL,
    thumb TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    PRIMARY KEY (card_id, side)
  );
  CREATE TABLE setting (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Categories a new wallet starts with. Users can rename, switch off or delete them. */
export const STARTER_CATEGORIES = [
  { name: 'Bank', color: 'indigo' },
  { name: 'Loyalty', color: 'orange' },
  { name: 'ID', color: 'teal' },
  { name: 'Membership', color: 'purple' },
] as const;
