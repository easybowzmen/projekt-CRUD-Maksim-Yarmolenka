const api = '/api/movies';
const API_KEY = 'dev123';
const form = document.querySelector('#form');
const tbody = document.querySelector('tbody');
const errorsBox = document.querySelector('#form-errors');
const watchedDateInput = document.querySelector('#watched_date');

const today = new Date().toISOString().slice(0, 10);
if (watchedDateInput) watchedDateInput.max = today;

function showErrors(err) {
  if (!errorsBox) return;
  errorsBox.hidden = false;
  
  if (err && Array.isArray(err.fieldErrors) && err.fieldErrors.length) {
    errorsBox.innerHTML = err.fieldErrors
      .map(e => `<div><strong>${e.field}</strong>: ${e.message}</div>`)
      .join('');
  } else if (err && err.error) {
    errorsBox.textContent = `${err.status || ''} ${err.error}`;
  } else if (typeof err === 'string') {
    errorsBox.textContent = err;
  } else {
    errorsBox.textContent = 'Validation failed.';
  }
}

function clearErrors() {
  if (!errorsBox) return;
  errorsBox.hidden = true;
  errorsBox.innerHTML = '';
}

async function load() {
  const res = await fetch(api);
  const data = await res.json();
  tbody.innerHTML = '';
  for (const m of data) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${m.id}</td>
      <td>${m.title}</td>
      <td>${m.description || ''}</td>
      <td>${m.rating}</td>
      <td>${m.watched_date}</td>
      <td>${m.genre}</td>
      <td>${m.director || ''}</td>
      <td>${m.duration || ''}</td>
      <td><button data-id="${m.id}">Delete</button></td>
    `;
    tbody.appendChild(row);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  body.rating = Number(body.rating);
  body.duration = Number(body.duration);


  if (body.watched_date && body.watched_date.includes('.')) {
    const [day, month, year] = body.watched_date.split('.');
    body.watched_date = `${year}-${month}-${day}`;
  }


  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    alert('Failed to add movie. Please check the fields.');
    return;
  }

  form.reset();
  load();
});

tbody.addEventListener('click', async (e) => {
  if (e.target.tagName === 'BUTTON') {
    const id = e.target.dataset.id;
    const res = await fetch(`${api}/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': API_KEY }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Failed to delete movie: ${err.error || res.status}`);
      return;
    }
    load();
  }
});

load();
