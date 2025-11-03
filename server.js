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

// helper: error response
function errorResponse(res, status, error, fieldErrors = []) {
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error,
    fieldErrors
  });
}

// simple auth for write ops
const REQUIRED_API_KEY = process.env.BACKEND_API_KEY || '';
function requireApiKey(req, res, next) {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const key = req.header('X-API-Key');
    if (!key)
      return errorResponse(res, 401, 'Unauthorized', [
        { field: 'auth', code: 'MISSING_TOKEN', message: 'Brak tokena (X-API-Key).' }
      ]);
    if (REQUIRED_API_KEY && key !== REQUIRED_API_KEY)
      return errorResponse(res, 403, 'Forbidden', [
        { field: 'auth', code: 'INVALID_TOKEN', message: 'Nieprawidłowy token.' }
      ]);
  }
  next();
}
app.use(requireApiKey);

// validation helpers
function validateMoviePayload(payload, isUpdate = false) {
  const fe = [];
  const { title, description, rating, watched_date, genre, director, duration } = payload;

  if (!title || typeof title !== 'string' || !title.trim()) {
    fe.push({ field: 'title', code: 'REQUIRED', message: 'Title is required.' });
  } else if (title.trim().length < 3) {
    fe.push({ field: 'title', code: 'TOO_SHORT', message: 'Title must be at least 3 characters.' });
  } else if (title.trim().length > 50) {
    fe.push({ field: 'title', code: 'TOO_LONG', message: 'Title must be at most 50 characters.' });
  }

  if (rating == null || Number.isNaN(Number(rating))) {
    fe.push({ field: 'rating', code: 'REQUIRED', message: 'Rating is required.' });
  } else if (Number(rating) < 1 || Number(rating) > 10) {
    fe.push({ field: 'rating', code: 'OUT_OF_RANGE', message: 'Rating must be 1–10.' });
  }

  if (!watched_date) {
    fe.push({ field: 'watched_date', code: 'REQUIRED', message: 'Watched date is required.' });
  } else {
    const today = new Date().toISOString().slice(0, 10);
    if (watched_date > today)
      fe.push({ field: 'watched_date', code: 'DATE_IN_FUTURE', message: 'Date cannot be in the future.' });
  }

  if (!genre || !genre.trim()) {
    fe.push({ field: 'genre', code: 'REQUIRED', message: 'Genre is required.' });
  } else if (genre.trim().length < 2) {
    fe.push({ field: 'genre', code: 'TOO_SHORT', message: 'Genre must be at least 2 characters.' });
  } else if (genre.trim().length > 40) {
    fe.push({ field: 'genre', code: 'TOO_LONG', message: 'Genre must be at most 40 characters.' });
  }

  if (description && String(description).length > 500)
    fe.push({ field: 'description', code: 'TOO_LONG', message: 'Description max length is 500.' });

  if (director && String(director).length > 100)
    fe.push({ field: 'director', code: 'TOO_LONG', message: 'Director max length is 100.' });

  if (duration != null) {
    const num = Number(duration);
    if (!Number.isFinite(num) || num <= 0)
      fe.push({ field: 'duration', code: 'INVALID', message: 'Duration must be a positive number.' });
  }

  return fe;
}


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
  const fe = validateMoviePayload(req.body);
  if (fe.length) return errorResponse(res, 400, 'Bad Request', fe);

  const { title, description = '', rating, watched_date, genre, director = '', duration = null } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO movies (title, description, rating, watched_date, genre, director, duration)
      VALUES (?,?,?,?,?,?,?)
    `).run(title.trim(), description, Number(rating), watched_date, genre.trim(), director, duration);

    const created = db.prepare('SELECT * FROM movies WHERE id=?').get(result.lastInsertRowid);
    return res.status(201).json(created);

  } catch (e) {
    // 409 Conflict
    if (String(e.message).includes('UNIQUE') || String(e.message).includes('idx_movies_title_date')) {
      return errorResponse(res, 409, 'Conflict', [
        { field: 'title', code: 'DUPLICATE', message: 'Movie with this title/date already exists.' }
      ]);
    }
    return errorResponse(res, 500, 'Internal Server Error');
  }
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

// health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});


app.use('/', express.static(path.join(__dirname, 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
