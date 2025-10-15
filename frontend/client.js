const api = '/api/movies';
const form = document.querySelector('#form');
const tbody = document.querySelector('tbody');

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

  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    await fetch(`${api}/${id}`, { method: 'DELETE' });
    load();
  }
});

load();
