let data = JSON.parse(localStorage.getItem('myGamerUnifiedData')) || {
  sections: [],
  games: [],
  completedCollapsed: false
};

let selectedPlatformFilter = 'ALL';
let draggedSectionId = null;
let draggedGameId = null;
let toastTimeout = null;
let deletedGameCache = null;

function saveData() {
  localStorage.setItem('myGamerUnifiedData', JSON.stringify(data));
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, allowUndo = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  
  if (allowUndo) {
    toastMsg.innerHTML = `${escapeHtml(message)} <button class="toast-undo-btn" onclick="undoDeleteGame()">Deshacer</button>`;
  } else {
    toastMsg.innerText = message;
  }
  
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    deletedGameCache = null;
  }, 4500);
}

function undoDeleteGame() {
  if (deletedGameCache) {
    data.games.push(deletedGameCache.game);
    deletedGameCache = null;
    document.getElementById('toast').classList.remove('show');
    saveData();
    render();
  }
}

function showModal({ title, inputVal, showInput = true, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${escapeHtml(title)}</h3>
      ${showInput ? `<input type="text" id="modalInput" value="${escapeHtml(inputVal || '')}" />` : ''}
      <div class="modal-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancelar</button>
        <button class="btn-primary" id="modalConfirmBtn">Aceptar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputEl = overlay.querySelector('#modalInput');
  if (inputEl) {
    inputEl.focus();
    inputEl.select();
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmAction();
      if (e.key === 'Escape') closeModal();
    });
  }

  const closeModal = () => overlay.remove();
  const confirmAction = () => {
    const val = inputEl ? inputEl.value.trim() : true;
    closeModal();
    onConfirm(val);
  };

  overlay.querySelector('#modalConfirmBtn').addEventListener('click', confirmAction);
  overlay.querySelector('#modalCancelBtn').addEventListener('click', closeModal);
}

function setPlatformFilter(platform, btnElement) {
  if (selectedPlatformFilter === platform) return;
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
    title: title,
    collapsed: false
  });

  input.value = '';
  saveData();
  render();
}

function deleteSection(sectionId) {
  const section = data.sections.find(s => s.id === sectionId);
  if (!section) return;

  showModal({
    title: `¿Eliminar "${section.title}" y sus juegos?`,
    showInput: false,
    onConfirm: () => {
      data.sections = data.sections.filter(sec => sec.id !== sectionId);
      data.games = data.games.filter(g => g.sectionId !== sectionId);
      saveData();
      render();
    }
  });
}

function toggleSectionCollapse(sectionId) {
  const section = data.sections.find(s => s.id === sectionId);
  if (section) {
    section.collapsed = !section.collapsed;
    saveData();
    render();
  }
}

function toggleCompletedCollapse() {
  data.completedCollapsed = !data.completedCollapsed;
  saveData();
  render();
}

function makeSectionTitleEditable(element, sectionId) {
  const section = data.sections.find(s => s.id === sectionId);
  if (!section || element.tagName === 'INPUT') return;

  const currentTitle = section.title;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.style.fontSize = '1.05rem';
  input.style.fontWeight = '700';

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
      render();
    } else {
      render();
    }
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') { isSaved = true; render(); }
  });
}

function handleGameKeypress(e, sectionId) {
  if (e.key === 'Enter') addGame(sectionId);
}

function addGame(sectionId) {
  const input = document.getElementById(`input-${sectionId}`);
  const platformSelect = document.getElementById(`platform-${sectionId}`);
  const gameTitle = input.value.trim();
  if (!gameTitle) return;

  const selectedPlatform = platformSelect ? platformSelect.value : '';
  const normalizedTitle = gameTitle.toLowerCase();
  const existingGame = data.games.find(g => g.title.toLowerCase() === normalizedTitle);

  if (existingGame) {
    const targetSection = data.sections.find(s => s.id === existingGame.sectionId);
    const locationName = existingGame.completed ? "Completados" : (targetSection ? targetSection.title : "otra categoría");
    showToast(`El juego "${existingGame.title}" ya existe en "${locationName}".`);
    return;
  }

  const sectionGames = data.games.filter(g => g.sectionId === sectionId);

  const newGame = {
    id: Date.now(),
    sectionId: sectionId,
    title: gameTitle,
    platform: selectedPlatform,
    completed: false,
    order: sectionGames.length
  };

  data.games.push(newGame);
  saveData();

  input.value = '';
  
  const gamesListEl = document.getElementById(`games-${sectionId}`);
  if (gamesListEl) {
    const emptyMsg = gamesListEl.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();
    
    const gameEl = createGameElement(newGame, false);
    gamesListEl.appendChild(gameEl);

    const card = gamesListEl.closest('.section-card');
    const badge = card.querySelector('.badge-count');
    if (badge) badge.innerText = parseInt(badge.innerText || '0') + 1;
  }
}

function toggleGame(gameId, element) {
  const game = data.games.find(g => g.id === gameId);
  if (!game) return;

  const cardItem = element.closest('.game-item');
  if (cardItem) cardItem.classList.add('fade-out');

  setTimeout(() => {
    game.completed = !game.completed;
    saveData();
    render();
  }, 150);
}

function editGameTitle(gameId) {
  const game = data.games.find(g => g.id === gameId);
  if (!game || game.completed) return;

  showModal({
    title: 'Editar título del juego:',
    inputVal: game.title,
    showInput: true,
    onConfirm: (newTitle) => {
      if (newTitle && newTitle !== game.title) {
        const duplicate = data.games.find(g => g.id !== gameId && g.title.toLowerCase() === newTitle.toLowerCase());
        if (duplicate) {
          showToast(`Ya existe otro juego llamado "${duplicate.title}".`);
          return;
        }
        game.title = newTitle;
        saveData();
        render();
      }
    }
  });
}

function deleteGame(gameId, element) {
  const gameIndex = data.games.findIndex(g => g.id === gameId);
  if (gameIndex === -1) return;

  const cardItem = element.closest('.game-item');
  if (cardItem) cardItem.classList.add('fade-out');

  setTimeout(() => {
    deletedGameCache = { game: data.games[gameIndex] };
    const isCompleted = data.games[gameIndex].completed;

    data.games.splice(gameIndex, 1);
    saveData();
    showToast('Juego eliminado.', true);

    if (cardItem) {
      const listContainer = cardItem.parentElement;
      const card = cardItem.closest('.section-card');
      const badge = card.querySelector('.badge-count');
      
      if (badge) {
        badge.innerText = Math.max(0, parseInt(badge.innerText || '1') - 1);
      }

      cardItem.remove();

      if (listContainer.children.length === 0) {
        listContainer.innerHTML = `<div class="empty-msg">Sin juegos pendientes.</div>`;
      }
    }
  }, 150);
}

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
    render();
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
  if (!game) return;

  game.sectionId = targetSectionId;
  saveData();
  render();
}

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
        render();
        showToast('¡Respaldo cargado exitosamente!');
      } else {
        showToast('Estructura de JSON inválida.');
      }
    } catch (err) {
      showToast('Error al procesar el archivo.');
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

function createGameElement(game, isCompletedSection = false) {
  const gameItem = document.createElement('div');
  gameItem.className = `game-item ${game.completed ? 'completed' : ''}`;
  gameItem.dataset.gameId = game.id;
  gameItem.draggable = !game.completed;

  if (!game.completed) {
    gameItem.addEventListener('dragstart', (e) => handleGameDragStart(e, game.id));
    gameItem.addEventListener('dragend', handleGameDragEnd);
  }

  const platformBadge = game.platform 
    ? `<span class="platform-badge ${escapeHtml(game.platform)}">${escapeHtml(game.platform)}</span>` 
    : '';

  const editBtn = (!game.completed && !isCompletedSection)
    ? `<button class="edit-btn" onclick="editGameTitle(${game.id})" title="Editar">✏️</button>`
    : '';

  gameItem.innerHTML = `
    <div class="game-info">
      <label class="checkbox-container">
        <input type="checkbox" ${game.completed ? 'checked' : ''} onchange="toggleGame(${game.id}, this)">
        <span class="custom-checkmark"></span>
      </label>
      <div class="game-title-wrapper">
        <span class="game-title ${!game.completed ? 'editable' : ''}" ${!game.completed ? `onclick="editGameTitle(${game.id})"` : ''}>${escapeHtml(game.title)}</span>
        ${platformBadge}
      </div>
    </div>
    <div class="game-actions">
      ${editBtn}
      <button class="delete-btn" onclick="deleteGame(${game.id}, this)" title="Eliminar">🗑️</button>
    </div>
  `;

  return gameItem;
}

function render() {
  const boardsGrid = document.getElementById('boardsGrid');
  boardsGrid.innerHTML = '';
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

  data.sections.forEach(sec => {
    let pendingGames = data.games
      .filter(g => g.sectionId === sec.id && !g.completed);

    if (searchTerm) {
      pendingGames = pendingGames.filter(g => g.title.toLowerCase().includes(searchTerm));
    }

    if (selectedPlatformFilter !== 'ALL') {
      pendingGames = pendingGames.filter(g => g.platform === selectedPlatformFilter);
    }

    const isCollapsed = sec.collapsed || false;

    const sectionCard = document.createElement('div');
    sectionCard.className = `section-card ${isCollapsed ? 'collapsed' : ''}`;
    sectionCard.dataset.sectionId = sec.id;
    sectionCard.draggable = true;

    sectionCard.addEventListener('dragstart', (e) => handleSectionDragStart(e, sec.id));
    sectionCard.addEventListener('dragend', handleSectionDragEnd);
    sectionCard.addEventListener('dragover', handleSectionDragOver);
    sectionCard.addEventListener('dragleave', handleSectionDragLeave);
    sectionCard.addEventListener('drop', (e) => handleSectionDrop(e, sec.id));

    sectionCard.innerHTML = `
      <div class="section-header">
        <div class="title-wrapper">
          <button class="collapse-btn" onclick="toggleSectionCollapse(${sec.id})" title="Plegar/Desplegar">▼</button>
          <h2 class="section-title" title="Doble clic para editar" ondblclick="makeSectionTitleEditable(this, ${sec.id})">${escapeHtml(sec.title)}</h2>
          <span class="badge-count">${pendingGames.length}</span>
        </div>
        <button class="delete-btn" onclick="deleteSection(${sec.id})" title="Eliminar categoría">✕</button>
      </div>

      <div class="add-game-form">
        <input type="text" id="input-${sec.id}" placeholder="Título del juego..." onkeypress="handleGameKeypress(event, ${sec.id})" />
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
      gamesListEl.innerHTML = `<div class="empty-msg">${(searchTerm || selectedPlatformFilter !== 'ALL') ? 'Sin coincidencias.' : 'Sin juegos pendientes.'}</div>`;
    } else {
      pendingGames.forEach(game => {
        gamesListEl.appendChild(createGameElement(game, false));
      });
    }
  });

  let completedGames = data.games.filter(g => g.completed);

  if (searchTerm) {
    completedGames = completedGames.filter(g => g.title.toLowerCase().includes(searchTerm));
  }

  if (selectedPlatformFilter !== 'ALL') {
    completedGames = completedGames.filter(g => g.platform === selectedPlatformFilter);
  }

  const isCompletedCollapsed = data.completedCollapsed || false;

  const completedSectionCard = document.createElement('div');
  completedSectionCard.className = `section-card global-completed ${isCompletedCollapsed ? 'collapsed' : ''}`;

  completedSectionCard.innerHTML = `
    <div class="section-header">
      <div class="title-wrapper">
        <button class="collapse-btn" onclick="toggleCompletedCollapse()" title="Plegar/Desplegar">▼</button>
        <h2 class="section-title">🏆 Completados</h2>
        <span class="badge-count">${completedGames.length}</span>
      </div>
    </div>
    <div class="game-list" id="games-completed"></div>
  `;

  boardsGrid.appendChild(completedSectionCard);

  const completedListEl = document.getElementById('games-completed');
  if (completedGames.length === 0) {
    completedListEl.innerHTML = `<div class="empty-msg">No hay juegos completados aún.</div>`;
  } else {
    completedGames.forEach(game => {
      completedListEl.appendChild(createGameElement(game, true));
    });
  }
}

render();
