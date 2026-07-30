import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'sidequest.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    latitude REAL DEFAULT 37.7749,
    longitude REAL DEFAULT -122.4194,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sidequests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    reward TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const sidequestTemplates = [
  { title: 'Beach Day', description: 'Hit the sand and soak up some sun', reward: '☀️' },
  { title: 'Hiking Adventure', description: 'Find a trail and explore nature', reward: '🥾' },
  { title: 'Food Truck Tour', description: 'Try 3 different food trucks', reward: '🌮' },
  { title: 'Pool Party', description: 'Make a splash with friends', reward: '🏊' },
  { title: 'Stargazing', description: 'Find a dark spot and look up', reward: '⭐' },
  { title: 'Amusement Park', description: 'Ride the biggest coaster', reward: '🎢' },
  { title: 'BBQ Master', description: 'Grill something amazing', reward: '🍖' },
  { title: 'Photography Walk', description: 'Capture 10 summer shots', reward: '📸' },
  { title: 'Lake Day', description: 'Swim, paddle, or float', reward: '🚣' },
  { title: 'Sunset Watch', description: 'Watch the sun go down together', reward: '🌅' },
  { title: 'Bike Ride', description: 'Cycle somewhere new', reward: '🚲' },
  { title: 'Ice Cream Crawl', description: 'Visit 2 new ice cream shops', reward: '🍦' },
];

const stmt = db.prepare('INSERT OR IGNORE INTO sidequests (id, title, description, reward) VALUES (?, ?, ?, ?)');
for (const sq of sidequestTemplates) {
  stmt.run(uuidv4(), sq.title, sq.description, sq.reward);
}

app.get('/api/sidequests', (req, res) => {
  try {
    const count = req.query.count || 1;
    const sidequests = db.prepare('SELECT * FROM sidequests ORDER BY RANDOM() LIMIT ?').all(Number(count));
    res.json(sidequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, latitude, longitude, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, latitude, longitude, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { name, email, latitude, longitude } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const id = uuidv4();
    const lat = latitude ?? 37.7749;
    const lng = longitude ?? -122.4194;
    db.prepare('INSERT INTO users (id, name, email, latitude, longitude) VALUES (?, ?, ?, ?, ?)').run(id, name, email, lat, lng);
    const user = db.prepare('SELECT id, name, email, latitude, longitude, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { name, email, latitude, longitude } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (latitude !== undefined) { fields.push('latitude = ?'); values.push(latitude); }
    if (longitude !== undefined) { fields.push('longitude = ?'); values.push(longitude); }
    values.push(req.params.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const user = db.prepare('SELECT id, name, email, latitude, longitude, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Sidequest API running on http://localhost:${PORT}`);
});
