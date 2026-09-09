let data = JSON.parse(localStorage.getItem('myGamerUnifiedData')) || {
  sections: [],
  games: []
};

let selectedPlatformFilter = 'ALL';
let draggedSectionId = null;
let draggedGameId = null;
let toastTimeout = null;

function saveData() {
  localStorage.setItem('myGamerUnifiedData', JSON.stringify(data));
  render();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  toastMsg.innerText = message;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function setPlatformFilter(platform, btnElement) {
  selectedPlatformFilter = platform;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  render();
}

function addSection() {
  const input = document.getElementById('sectionInput');
  const title = input.value.trim();
  if (!title) return;

  data.sections.push({
    id: Date.now(),
    title: title
  });

  input.value = '';
  saveData();
}

function deleteSection(sectionId) {
  if (!confirm('¿Eliminar esta categoría y todos sus juegos?')) return;
  data.sections = data.sections.filter(sec => sec.id !== sectionId);
  data.games = data.games.filter(g => g.sectionId !== sectionId);
  saveData();
}

/* --- EDICIÓN EN LÍNEA DEL TÍTULO DE CATEGORÍA --- */
function makeSectionTitleEditable(element, sectionId) {
  const section = data.sections.find(s => s.id === sectionId);
  if (!section) return;

  if (element.tagName === 'INPUT') return;

  const currentTitle = section.title;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.className = 'edit-title-input';

  element.replaceWith(input);
  input.focus();
  input.select();

  let isSaved = false;

  const saveEdit = () => {
    if (isSaved) return;
    isSaved = true;
    const newTitle = input.value.trim();

    if (newTitle && newTitle !== currentTitle) {
      section.title = newTitle;
      saveData();
    } else {
      render();
    }
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      isSaved = true;
      render();
    }
  });
}

function addGame(sectionId) {
  const input = document.getElementById(`input-${sectionId}`);
  const platformSelect = document.getElementById(`platform-${sectionId}`);
  const gameTitle = input.value.trim();
  if (!gameTitle) return;

  // VALIDACIÓN DE JUEGO DUPLICADO
  const normalizedTitle = gameTitle.toLowerCase();
  const existingGame = data.games.find(g => g.title.toLowerCase() === normalizedTitle);

  if (existingGame) {
    const targetSection = data.sections.find(s => s.id === existingGame.sectionId);
    const locationName = existingGame.completed ? "Completados" : (targetSection ? targetSection.title : "otra categoría");
    
    showToast(`El juego "${existingGame.title}" ya existe en "${locationName}".`);
    return;
  }

  data.games.push({
    id: Date.now(),
    sectionId: sectionId,
    title: gameTitle,
    platform: platformSelect.value,
    completed: false
  });

  saveData();
}

function toggleGame(gameId) {
  const game = data.games.find(g => g.id === gameId);
  if (game) {
    game.completed = !game.completed;
    saveData();
  }
}

function editGameTitle(gameId) {
  const game = data.games.find(g => g.id === gameId);
  if (!game) return;

  const newTitle = prompt('Editar nombre del juego:', game.title);
  if (newTitle && newTitle.trim() !== '') {
    const normalizedTitle = newTitle.trim().toLowerCase();
    
    const duplicate = data.games.find(g => g.id !== gameId && g.title.toLowerCase() === normalizedTitle);
    if (duplicate) {
      showToast(`Ya existe otro juego con el nombre "${duplicate.title}".`);
      return;
    }

    game.title = newTitle.trim();
    saveData();
  }
}

function deleteGame(gameId) {
  data.games = data.games.filter(g => g.id !== gameId);
  saveData();
}

/* --- DRAG & DROP --- */
function handleSectionDragStart(e, sectionId) {
  draggedSectionId = sectionId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleSectionDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedSectionId = null;
  document.querySelectorAll('.section-card').forEach(card => card.classList.remove('drag-over'));
}

function handleSectionDragOver(e) {
  if (draggedSectionId === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleSectionDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleSectionDrop(e, targetSectionId) {
  e.preventDefault();
  if (draggedSectionId === null || draggedSectionId === targetSectionId) return;

  const fromIndex = data.sections.findIndex(s => s.id === draggedSectionId);
  const toIndex = data.sections.findIndex(s => s.id === targetSectionId);

  if (fromIndex !== -1 && toIndex !== -1) {
    const [movedSection] = data.sections.splice(fromIndex, 1);
    data.sections.splice(toIndex, 0, movedSection);
    saveData();
  }
}

function handleGameDragStart(e, gameId) {
  e.stopPropagation();
  draggedGameId = gameId;
  e.target.classList.add('dragging-game');
  e.dataTransfer.effectAllowed = 'move';
}

function handleGameDragEnd(e) {
  e.target.classList.remove('dragging-game');
  draggedGameId = null;
  document.querySelectorAll('.game-list').forEach(list => list.classList.remove('drag-over-list'));
}

function handleGameListDragOver(e) {
  if (draggedGameId === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over-list');
}

function handleGameListDragLeave(e) {
  e.currentTarget.classList.remove('drag-over-list');
}

function handleGameListDrop(e, targetSectionId) {
  e.preventDefault();
  e.stopPropagation();
  if (draggedGameId === null) return;

  const game = data.games.find(g => g.id === draggedGameId);
  if (game && game.sectionId !== targetSectionId) {
    game.sectionId = targetSectionId;
    saveData();
  }
}

/* --- RESPALDO JSON --- */
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `gamer_tracker_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.sections && parsed.games) {
        data = parsed;
        saveData();
        alert('¡Datos importados con éxito!');
      } else {
        alert('El archivo JSON no tiene la estructura correcta.');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON.');
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

/* --- RENDER --- */
function render() {
  const boardsGrid = document.getElementById('boardsGrid');
  boardsGrid.innerHTML = '';
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

  // 1. Renderizar Categorías
  data.sections.forEach(sec => {
    let pendingGames = data.games.filter(g => g.sectionId === sec.id && !g.completed);

    if (searchTerm) {
      pendingGames = pendingGames.filter(g => g.title.toLowerCase().includes(searchTerm));
    }

    if (selectedPlatformFilter !== 'ALL') {
      pendingGames = pendingGames.filter(g => g.platform === selectedPlatformFilter);
    }

    const sectionCard = document.createElement('div');
    sectionCard.className = 'section-card';
    sectionCard.draggable = true;

    sectionCard.addEventListener('dragstart', (e) => handleSectionDragStart(e, sec.id));
    sectionCard.addEventListener('dragend', handleSectionDragEnd);
    sectionCard.addEventListener('dragover', handleSectionDragOver);
    sectionCard.addEventListener('dragleave', handleSectionDragLeave);
    sectionCard.addEventListener('drop', (e) => handleSectionDrop(e, sec.id));

    sectionCard.innerHTML = `
      <div class="section-header">
        <div class="title-wrapper">
          <h2 class="section-title" title="Doble clic para editar aquí mismo" ondblclick="makeSectionTitleEditable(this, ${sec.id})">${escapeHtml(sec.title)}</h2>
          <span class="badge-count">${pendingGames.length}</span>
        </div>
        <button class="delete-btn" onclick="deleteSection(${sec.id})" title="Eliminar categoría">✕</button>
      </div>

      <div class="add-game-form">
        <input type="text" id="input-${sec.id}" placeholder="Juego..." onkeypress="handleGameKeypress(event, ${sec.id})" />
        <select id="platform-${sec.id}">
          <option value="">Plataforma</option>
          <option value="PC">PC</option>
          <option value="PlayStation">PlayStation</option>
          <option value="Xbox">Xbox</option>
          <option value="Switch">Switch</option>
        </select>
        <button onclick="addGame(${sec.id})">+ Añadir</button>
      </div>

      <div class="game-list" id="games-${sec.id}"></div>
    `;

    boardsGrid.appendChild(sectionCard);

    const gamesListEl = document.getElementById(`games-${sec.id}`);
    gamesListEl.addEventListener('dragover', handleGameListDragOver);
    gamesListEl.addEventListener('dragleave', handleGameListDragLeave);
    gamesListEl.addEventListener('drop', (e) => handleGameListDrop(e, sec.id));

    if (pendingGames.length === 0) {
      gamesListEl.innerHTML = `<div class="empty-msg">${(searchTerm || selectedPlatformFilter !== 'ALL') ? 'Sin juegos con este filtro.' : 'Arrastra un juego aquí o añade uno.'}</div>`;
    } else {
      pendingGames.forEach(game => {
        gamesListEl.appendChild(createGameElement(game, false));
      });
    }
  });

  // 2. Renderizar Completados
  let completedGames = data.games.filter(g => g.completed);
  if (searchTerm) {
    completedGames = completedGames.filter(g => g.title.toLowerCase().includes(searchTerm));
  }
  if (selectedPlatformFilter !== 'ALL') {
    completedGames = completedGames.filter(g => g.platform === selectedPlatformFilter);
  }

  const totalGames = data.games.length;
  const totalCompleted = data.games.filter(g => g.completed).length;
  const progressPercent = totalGames > 0 ? Math.round((totalCompleted / totalGames) * 100) : 0;

  const completedCard = document.createElement('div');
  completedCard.className = 'section-card global-completed';

  completedCard.innerHTML = `
    <div class="section-header">
      <div class="title-wrapper">
        <h2 class="section-title">🏆 Completados</h2>
        <span class="badge-count">${completedGames.length}</span>
      </div>
    </div>
    <div class="progress-bar-container" title="${progressPercent}% del total completado">
      <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
    </div>
    <div class="game-list" id="completedContainer" style="margin-top: 15px;"></div>
  `;

  boardsGrid.appendChild(completedCard);

  const completedContainer = document.getElementById('completedContainer');

  if (completedGames.length === 0) {
    completedContainer.innerHTML = `<div class="empty-msg">${(searchTerm || selectedPlatformFilter !== 'ALL') ? 'Sin completados con este filtro.' : 'Aún no has completado juegos.'}</div>`;
  } else {
    completedGames.forEach(game => {
      const originalSec = data.sections.find(s => s.id === game.sectionId);
      const sectionName = originalSec ? originalSec.title : "General";
      completedContainer.appendChild(createGameElement(game, true, sectionName));
    });
  }
}

function createGameElement(game, isCompleted, sectionName = '') {
  const gameEl = document.createElement('div');
  gameEl.className = `game-item ${isCompleted ? 'completed' : ''}`;

  if (!isCompleted) {
    gameEl.draggable = true;
    gameEl.addEventListener('dragstart', (e) => handleGameDragStart(e, game.id));
    gameEl.addEventListener('dragend', handleGameDragEnd);
  }

  const originBadgeHtml = isCompleted ? `<span class="origin-badge">${escapeHtml(sectionName)}</span>` : '';
  const platformBadgeHtml = game.platform ? `<span class="platform-badge ${game.platform}">${escapeHtml(game.platform)}</span>` : '';

  gameEl.innerHTML = `
    <label class="game-info">
      <span class="checkbox-container">
        <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleGame(${game.id})">
        <span class="custom-checkmark"></span>
      </span>
      <div class="game-title-wrapper">
        <span class="game-title" title="Doble clic para editar: ${escapeHtml(game.title)}" ondblclick="editGameTitle(${game.id})">${escapeHtml(game.title)}</span>
        ${platformBadgeHtml}
      </div>
      ${originBadgeHtml}
    </label>
    <button class="delete-btn" onclick="deleteGame(${game.id})" title="Eliminar juego">✕</button>
  `;
  return gameEl;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function handleGameKeypress(event, sectionId) {
  if (event.key === 'Enter') addGame(sectionId);
}

document.getElementById('sectionInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') addSection();
});

// Inicializar la aplicación
render();