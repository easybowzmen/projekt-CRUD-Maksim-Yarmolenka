const test = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');

const BASE = process.env.BASE_URL || 'http://localhost:10000';
const API = supertest(BASE);
const API_KEY = process.env.BACKEND_API_KEY || 'dev123';

test('GET /health returns ok', async () => {
  const res = await API.get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST /api/movies without token -> 401', async () => {
  const res = await API.post('/api/movies').send({});
  assert.equal(res.status, 401);
});

test('POST /api/movies invalid payload -> 400', async () => {
  const res = await API.post('/api/movies')
    .set('X-API-Key', API_KEY)
    .send({ title: 'A', rating: 15, watched_date: '2999-01-01', genre: '' });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.fieldErrors));
});

test('POST duplicate -> 409', async () => {
  const body = { title: 'Interstellar', rating: 9, watched_date: '2024-10-10', genre: 'sci-fi' };
  await API.post('/api/movies').set('X-API-Key', API_KEY).send(body);
  const res = await API.post('/api/movies').set('X-API-Key', API_KEY).send(body);
  assert.equal(res.status, 409);
});

test('GET/DELETE unknown -> 404', async () => {
  const g = await API.get('/api/movies/9999999');
  assert.equal(g.status, 404);

  const d = await API.delete('/api/movies/9999999').set('X-API-Key', API_KEY);
  assert.equal(d.status, 404);
});
