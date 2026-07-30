import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = new Database(path.join(__dirname, 'sidequest.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    latitude REAL DEFAULT 37.7749,
    longitude REAL DEFAULT -122.4194,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sidequests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    reward TEXT,
    created_by TEXT,
    tiktok_url TEXT,
    approved INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sidequest_id TEXT NOT NULL,
    tiktok_url TEXT,
    status TEXT DEFAULT 'pending',
    xp_awarded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sidequest_id) REFERENCES sidequests(id)
  )
`);

const sidequestTemplates = [
  { title: 'Beach Day', description: 'Hit the sand and soak up some sun', reward: '☀️', created_by: 'system', tiktok_url: '' },
  { title: 'Hiking Adventure', description: 'Find a trail and explore nature', reward: '🥾', created_by: 'system', tiktok_url: '' },
  { title: 'Food Truck Tour', description: 'Try 3 different food trucks', reward: '🌮', created_by: 'system', tiktok_url: '' },
  { title: 'Pool Party', description: 'Make a splash with friends', reward: '🏊', created_by: 'system', tiktok_url: '' },
  { title: 'Stargazing', description: 'Find a dark spot and look up', reward: '⭐', created_by: 'system', tiktok_url: '' },
  { title: 'Amusement Park', description: 'Ride the biggest coaster', reward: '🎢', created_by: 'system', tiktok_url: '' },
  { title: 'BBQ Master', description: 'Grill something amazing', reward: '🍖', created_by: 'system', tiktok_url: '' },
  { title: 'Photography Walk', description: 'Capture 10 summer shots', reward: '📸', created_by: 'system', tiktok_url: '' },
  { title: 'Lake Day', description: 'Swim, paddle, or float', reward: '🚣', created_by: 'system', tiktok_url: '' },
  { title: 'Sunset Watch', description: 'Watch the sun go down together', reward: '🌅', created_by: 'system', tiktok_url: '' },
  { title: 'Bike Ride', description: 'Cycle somewhere new', reward: '🚲', created_by: 'system', tiktok_url: '' },
  { title: 'Ice Cream Crawl', description: 'Visit 2 new ice cream shops', reward: '🍦', created_by: 'system', tiktok_url: '' },
];

const insertSidequest = db.prepare('INSERT OR IGNORE INTO sidequests (id, title, description, reward, created_by, tiktok_url) VALUES (?, ?, ?, ?, ?, ?)');
for (const sq of sidequestTemplates) {
  insertSidequest.run(uuidv4(), sq.title, sq.description, sq.reward, sq.created_by, sq.tiktok_url);
}

function xpForLevel(level) {
  return level * 100;
}

function addXp(userId, amount) {
  const user = db.prepare('SELECT xp, level FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  let newXp = (user.xp || 0) + amount;
  let newLevel = user.level || 1;
  while (newXp >= xpForLevel(newLevel)) {
    newXp -= xpForLevel(newLevel);
    newLevel += 1;
  }
  db.prepare('UPDATE users SET xp = ?, level = ? WHERE id = ?').run(newXp, newLevel, userId);
  return { xp: newXp, level: newLevel, xpNeeded: xpForLevel(newLevel) };
}

app.get('/api/sidequests', (req, res) => {
  try {
    const count = Number(req.query.count || 1);
    const sidequests = db.prepare('SELECT * FROM sidequests WHERE approved = 1 ORDER BY RANDOM() LIMIT ?').all(count);
    res.json(sidequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, latitude, longitude, xp, level, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, latitude, longitude, xp, level, created_at FROM users WHERE id = ?').get(req.params.id);
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
    const user = db.prepare('SELECT id, name, email, latitude, longitude, xp, level, created_at FROM users WHERE id = ?').get(id);
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
    const user = db.prepare('SELECT id, name, email, latitude, longitude, xp, level, created_at FROM users WHERE id = ?').get(req.params.id);
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

app.post('/api/sidequests', (req, res) => {
  try {
    const { title, description, reward, created_by, tiktok_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const id = uuidv4();
    const approved = created_by === 'system' ? 1 : 0;
    db.prepare('INSERT INTO sidequests (id, title, description, reward, created_by, tiktok_url, approved) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, title, description || '', reward || '🎯', created_by || 'user', tiktok_url || '', approved);
    const sidequest = db.prepare('SELECT * FROM sidequests WHERE id = ?').get(id);
    res.status(201).json(sidequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sidequests/:id/verify', (req, res) => {
  try {
    const { user_id, tiktok_url } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const sidequest = db.prepare('SELECT id FROM sidequests WHERE id = ?').get(req.params.id);
    if (!sidequest) return res.status(404).json({ error: 'Sidequest not found' });
    const id = uuidv4();
    const xpAward = 50;
    db.prepare('INSERT INTO verifications (id, user_id, sidequest_id, tiktok_url, status, xp_awarded) VALUES (?, ?, ?, ?, ?, ?)').run(id, user_id, req.params.id, tiktok_url || '', 'approved', xpAward);
    const result = addXp(user_id, xpAward);
    res.status(201).json({ verificationId: id, xpAwarded: xpAward, newXp: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/verifications', (req, res) => {
  try {
    const userId = req.query.user_id;
    let rows;
    if (userId) {
      rows = db.prepare('SELECT * FROM verifications WHERE user_id = ?').all(userId);
    } else {
      rows = db.prepare('SELECT * FROM verifications ORDER BY created_at DESC LIMIT 50').all();
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Sidequest API running on http://${HOST}:${PORT}`);
});

export default server;
