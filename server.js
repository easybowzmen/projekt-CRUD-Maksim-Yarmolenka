require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'data.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Ensure the table exists with new columns
db.prepare(`
  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
    watched_date TEXT NOT NULL,
    genre TEXT NOT NULL,
    director TEXT,
    duration INTEGER CHECK (duration > 0)
  )
`).run();

// --- ROUTES ---

app.get('/api/movies', (req, res) => {
  const movies = db.prepare('SELECT * FROM movies ORDER BY id DESC').all();
  res.json(movies);
});

app.get('/api/movies/:id', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id=?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json(movie);
});

app.post('/api/movies', (req, res) => {
  const { title, description = '', rating, watched_date, genre, director = '', duration = null } = req.body;

  if (!title || !rating || !watched_date || !genre) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be between 1 and 10' });
  }
  if (duration !== null && duration <= 0) {
    return res.status(400).json({ error: 'Duration must be positive if provided' });
  }

  const result = db.prepare(`
    INSERT INTO movies (title, description, rating, watched_date, genre, director, duration)
    VALUES (?,?,?,?,?,?,?)
  `).run(title.trim(), description, rating, watched_date, genre, director, duration);

  const created = db.prepare('SELECT * FROM movies WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/movies/:id', (req, res) => {
  const { title, description, rating, watched_date, genre, director, duration } = req.body;
  const existing = db.prepare('SELECT * FROM movies WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Movie not found' });

  if (rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be between 1 and 10' });
  }
  if (duration !== null && duration <= 0) {
    return res.status(400).json({ error: 'Duration must be positive if provided' });
  }

  db.prepare(`
    UPDATE movies 
    SET title=?, description=?, rating=?, watched_date=?, genre=?, director=?, duration=? 
    WHERE id=?
  `).run(title, description, rating, watched_date, genre, director, duration, req.params.id);

  const updated = db.prepare('SELECT * FROM movies WHERE id=?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/movies/:id', (req, res) => {
  const info = db.prepare('DELETE FROM movies WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Movie not found' });
  res.status(204).send();
});

app.use('/', express.static(path.join(__dirname, 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
