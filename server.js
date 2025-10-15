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
  const { title, description = '', rating, watched_date, genre } = req.body;

  if (!title || !rating || !watched_date || !genre) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be between 1 and 10' });
  }

  const result = db.prepare(`
    INSERT INTO movies (title, description, rating, watched_date, genre)
    VALUES (?,?,?,?,?)
  `).run(title.trim(), description, rating, watched_date, genre);

  const created = db.prepare('SELECT * FROM movies WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.delete('/api/movies/:id', (req, res) => {
  const info = db.prepare('DELETE FROM movies WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Movie not found' });
  res.status(204).send();
});

app.put('/api/movies/:id', (req, res) => {
  const { title, description, rating, watched_date, genre } = req.body;
  const existing = db.prepare('SELECT * FROM movies WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Movie not found' });

  db.prepare(`
    UPDATE movies SET title=?, description=?, rating=?, watched_date=?, genre=? WHERE id=?
  `).run(title, description, rating, watched_date, genre, req.params.id);

  const updated = db.prepare('SELECT * FROM movies WHERE id=?').get(req.params.id);
  res.json(updated);
});

app.use('/', express.static(path.join(__dirname, 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));