import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('running.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        duration INTEGER NOT NULL,
        distance REAL NOT NULL,
        pace REAL NOT NULL,
        route TEXT NOT NULL
      );
    `);
  }
  return db;
}

export async function saveRun({ date, duration, distance, pace, route }) {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO runs (date, duration, distance, pace, route) VALUES (?, ?, ?, ?, ?)',
    [date, duration, distance, pace, JSON.stringify(route)]
  );
  return result.lastInsertRowId;
}

export async function getAllRuns() {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM runs ORDER BY date DESC');
  return rows.map((row) => ({ ...row, route: JSON.parse(row.route) }));
}

export async function getRunById(id) {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT * FROM runs WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, route: JSON.parse(row.route) };
}

export async function deleteRun(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM runs WHERE id = ?', [id]);
}
