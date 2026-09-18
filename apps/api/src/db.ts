import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'provenim.db');

export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      intent_id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      merchant_address TEXT NOT NULL,
      amount_luna TEXT NOT NULL,
      network TEXT NOT NULL,
      order_reference TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      random_nonce TEXT NOT NULL,
      intent_digest TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intent_id TEXT NOT NULL,
      transaction_hash TEXT NOT NULL,
      raw_data TEXT,
      observed_at INTEGER NOT NULL,
      FOREIGN KEY (intent_id) REFERENCES payment_intents(intent_id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      intent_id TEXT PRIMARY KEY,
      transaction_hash TEXT NOT NULL UNIQUE,
      receipt_id TEXT NOT NULL UNIQUE,
      payer_address TEXT NOT NULL,
      merchant_address TEXT NOT NULL,
      amount_luna TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      settled_at INTEGER NOT NULL,
      FOREIGN KEY (intent_id) REFERENCES payment_intents(intent_id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
      receipt_id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL,
      receipt_digest TEXT NOT NULL UNIQUE,
      canonical_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (intent_id) REFERENCES payment_intents(intent_id)
    );

    CREATE TABLE IF NOT EXISTS verification_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      intent_id TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      verdict TEXT NOT NULL,
      invariants_json TEXT NOT NULL,
      failure_reason TEXT,
      timestamp INTEGER NOT NULL
    );
  `);
}
