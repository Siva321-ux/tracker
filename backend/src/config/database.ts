import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export let pool: mysql.Pool | null = null;
export let sqliteDb: sqlite3.Database | null = null;
export let isUsingSqlite = false;

export async function initDatabase(): Promise<void> {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lora_tracker',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('Connected to MySQL database.');
  } catch (err: any) {
    console.log('MySQL connection not available. Initializing SQLite database fallback for development/testing...');
    isUsingSqlite = true;
    const dbPath = path.join(__dirname, '../../dev_server.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
    await initSqliteTables();
  }
}

function initSqliteTables(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sqliteDb) return reject(new Error('SQLite DB not initialized'));
    sqliteDb.serialize(() => {
      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          password_hash TEXT NOT NULL,
          language TEXT DEFAULT 'en',
          profile_image TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS team_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'active'
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS devices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_code TEXT NOT NULL UNIQUE,
          device_name TEXT NOT NULL,
          assigned_user_id INTEGER,
          team_id INTEGER,
          status TEXT DEFAULT 'offline',
          last_seen DATETIME,
          battery_level INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_id INTEGER NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          value REAL,
          source TEXT DEFAULT 'lora',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS public_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          client_msg_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS private_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          receiver_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          client_msg_id TEXT,
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          reference_id INTEGER,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS offline_regions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          min_latitude REAL NOT NULL,
          max_latitude REAL NOT NULL,
          min_longitude REAL NOT NULL,
          max_longitude REAL NOT NULL,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Database helper for abstracting queries across MySQL and SQLite
export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!isUsingSqlite && pool) {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      // Replace MySQL '?' placeholders if needed or MySQL specific syntax
      let convertedSql = sql;
      if (convertedSql.trim().toUpperCase().startsWith('INSERT') || convertedSql.trim().toUpperCase().startsWith('UPDATE') || convertedSql.trim().toUpperCase().startsWith('DELETE')) {
        sqliteDb!.run(convertedSql, params, function (err) {
          if (err) return reject(err);
          resolve([{ insertId: this.lastID, affectedRows: this.changes }] as any);
        });
      } else {
        sqliteDb!.all(convertedSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows as T[]);
        });
      }
    });
  }
  throw new Error('Database not initialized');
}
