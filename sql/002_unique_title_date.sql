CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_title_date
ON movies (title, watched_date);