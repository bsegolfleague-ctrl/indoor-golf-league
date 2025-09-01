const API_URL = 'https://script.google.com/macros/s/AKfycbxtWOz2e4CgpBCULGxW4mVs2ErXyGk2WcmayNRjCu2Lzx3S8zZ8CuDO-KDdgYy2Py8I/exec';
let currentRound = null;
let selectedPlayers = [];

document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
});

async function loadLeaderboard() {
  const res = await fetch(API_URL);
  const data = await res.json();
  const players = data.players.slice(1);
  const scores = data.scores.slice(1);

  const leaderboard = {};

  scores.forEach(row => {
    const pid = row[0];
    const player = players.find(p => p[0] === pid);
    if (!player) return;
    const name = player[1];
    const strokes = row.slice(3).filter(v => v !== '').reduce((a, b) => a + Number(b), 0);
    if (!leaderboard[name]) leaderboard[name] = { rounds: 0, total: 0 };
    leaderboard[name].rounds++;
    leaderboard[name].total += strokes;
  });

  let html = `<table>
    <tr><th>Player</th><th>Rounds</th><th>Total</th><th>Avg</th></tr>`;
  for (const [name, stats] of Object.entries(leaderboard)) {
    const avg = (stats.total / stats.rounds).toFixed(1);
    html += `<tr><td>${name}</td><td>${stats.rounds}</td><td>${stats.total}</td><td>${avg}</td></tr>`;
  }
  html += `</table>`;
  document.getElementById('leaderboard-content').innerHTML = html;
}

function showCreateRound() {
  const html = `
    <h3>Create Round</h3>
    <label>Date:</label><input type="date" id="round-date" />
    <label>Holes:</label>
    <select id="round-holes">
      <option value="9">9</option>
      <option value="18">18</option>
    </select>
    <button onclick="createRound()">Create</button>
  `;
  openModal(html);
}

async function createRound() {
  const date = document.getElementById('round-date').value;
  const holes = document.getElementById('round-holes').value;
  if (!date) return alert('Select a date');

  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'addRound', date, holes })
  });
  const round = await res.json();
  currentRound = round.id;
  showPlayerSelection(round.id, holes);
}

async function showPlayerSelection(roundId, holes) {
  const res = await fetch(API_URL);
  const data = await res.json();
  const players = data.players.slice(1);

  let html = `<h3>Select Players</h3>`;
  players.forEach(p => {
    html += `<label><input type="checkbox" value="${p[0]}"> ${p[1]}</label><br>`;
  });
  html += `<button onclick="startRound(${holes})">Start Round</button>`;
  document.getElementById('modal-body').innerHTML = html;
}

function startRound(holes) {
  const checkboxes = document.querySelectorAll('#modal-body input[type="checkbox"]:checked');
  if (checkboxes.length === 0) return alert('Select at least one player');

  selectedPlayers = Array.from(checkboxes).map(cb => cb.value);

  let html = `<h3>Scorecard</h3><table><tr><th>Hole</th>`;
  for (let h = 1; h <= holes; h++) {
    html += `<th>H${h}<br><input type="number" id="par-${h}" placeholder="Par" min="3" max="6"></th>`;
  }
  html += `</tr>`;

  selectedPlayers.forEach(pid => {
    html += `<tr><td>${pid}</td>`;
    for (let h = 1; h <= holes; h++) {
      html += `<td><input type="number" id="score-${pid}-${h}" min="1" max="10"></td>`;
    }
    html += `</tr>`;
  });

  html += `</table><button onclick="submitRoundScores(${holes})">Submit Scores</button>`;
  document.getElementById('modal-body').innerHTML = html;
}

async function submitRoundScores(holes) {
  const pars = [];
  for (let h = 1; h <= holes; h++) {
    const par = document.getElementById(`par-${h}`).value || 4;
    pars.push(par);
  }

  for (const pid of selectedPlayers) {
    const scores = [];
    for (let h = 1; h <= holes; h++) {
      const val = document.getElementById(`score-${pid}-${h}`).value;
      scores.push(val || '');
    }
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submitScores',
        playerId: pid,
        roundId: currentRound,
        pars,
        scores
      })
    });
  }

  closeModal();
  loadLeaderboard();
}

function showAddPlayer() {
  const html = `
    <h3>Add Player</h3>
    <input type="text" id="player-name" placeholder="Player name" />
    <button onclick="addPlayer()">Add</button>
  `;
  openModal(html);
}

async function addPlayer() {
  const name = document.getElementById('player-name').value.trim();
  if (!name) return alert('Enter player name');

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'addPlayer', name })
  });
  closeModal();
  loadLeaderboard();
}

function openModal(content) {
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}
