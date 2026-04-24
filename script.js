const targetWords = [
  "ПРОЦЕСС",    // 4th letter: Ц
  "АРХИМЕД",    // 4th letter: И
  "ВОЛОПАС",    // 4th letter: О
  "АПОЛЛОН",    // 4th letter: Л
  "ПУЛКОВО",    // 4th letter: К
  "ТУПОЛЕВ",    // 4th letter: О
  "ДНЕВНИК",    // 4th letter: В
  "ТОЛСТОЙ",    // 4th letter: С
  "ПРАКТИК",    // 4th letter: К
  "ЦИЛИНДР",    // 4th letter: И
  "МОЖАЙСКИЙ"   // 5th letter: Й
];

const clues = [
  "Развитие какого-нибудь явления.",
  "Величайший физик и математик древности.",
  "Созвездие Северного неба с яркой звездой Арктур.",
  "Бог солнца и света, покровитель искусств в Древней Греции.",
  "Место под Ленинградом, где находится главная астрономическая обсерватория Академии наук СССР.",
  "Известный советский авиаконструктор.",
  "Записи, которые ведутся изо дня в день.",
  "Автор фантастической повести «Аэлита».",
  "Работник, который хорошо знает свое дело на практике.",
  "Геометрическое тело, образуемое вращением прямоугольника вокруг одной из его сторон.",
  "Выдающийся русский изобретатель, создатель первого в мире самолета."
];

let state = {
  gridState: {},
  completedColumns: [],
  timeSpent: 0,
  step: 0,
  isSolved: false,
  startTime: null,
  timerInterval: null
};

// UI Elements
const gridContainer = document.getElementById('grid-container');
const questionsList = document.getElementById('questions-list');
const helpBtn = document.getElementById('help-btn');
const helpTooltip = document.getElementById('help-tooltip');
const closeHelpBtn = document.getElementById('close-help-btn');

function initGame() {
  generateQuestions();
  generateGrid();
  setupEventListeners();
  startTimer();
}

function startTimer() {
  if (!state.startTime) {
    state.startTime = Date.now() - (state.timeSpent * 1000);
  }
  if (!state.timerInterval) {
    state.timerInterval = setInterval(() => {
      if (!state.isSolved) {
        state.timeSpent = Math.floor((Date.now() - state.startTime) / 1000);
      }
    }, 1000);
  }
}

function generateQuestions() {
  questionsList.innerHTML = '';
  clues.forEach((clue, index) => {
    const li = document.createElement('li');
    li.textContent = clue;
    li.dataset.colIndex = index;
    li.addEventListener('click', () => focusOnColumn(index));
    questionsList.appendChild(li);
  });
}

function generateGrid() {
  gridContainer.innerHTML = '';
  // Initialize empty grid state if not present
  if (Object.keys(state.gridState).length === 0) {
    targetWords.forEach((word, colIndex) => {
      state.gridState[`col_${colIndex + 1}`] = Array(word.length).fill("");
    });
  }

  targetWords.forEach((word, colIndex) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'grid-column';
    colDiv.dataset.colIndex = colIndex;

    const colHeader = document.createElement('div');
    colHeader.className = 'grid-column-header';
    colHeader.textContent = colIndex + 1;
    colDiv.appendChild(colHeader);

    // Shift the 11th column (index 10) up so the 5th letter aligns with 4th of others
    // We add an invisible cell to cols 0-9 to push them down,
    // so col 11 naturally sits higher relative to the keyword row.
    if (colIndex < 10) {
      const spacer = document.createElement('div');
      spacer.className = 'grid-cell-spacer';
      colDiv.appendChild(spacer);
    }

    for (let rowIndex = 0; rowIndex < word.length; rowIndex++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'grid-cell';
      input.maxLength = 1;
      input.pattern = '[А-Яа-яЁё]';
      input.autocomplete = 'off';
      input.autocorrect = 'off';
      input.spellcheck = false;
      input.dataset.col = colIndex;
      input.dataset.row = rowIndex;

      // Determine if this cell is part of the key word horizontal line
      if (colIndex < 10 && rowIndex === 3) {
        input.classList.add('key-cell');
      } else if (colIndex === 10 && rowIndex === 4) {
        input.classList.add('key-cell');
      }

      // Restore value from state if present
      const savedChar = state.gridState[`col_${colIndex + 1}`][rowIndex] || "";
      if (savedChar) {
        input.value = savedChar;
      }

      // Disable if column is already completed or game is solved
      if (state.completedColumns.includes(colIndex + 1) || state.isSolved) {
        input.disabled = true;
      }

      input.addEventListener('input', handleInput);
      input.addEventListener('keydown', handleKeydown);
      input.addEventListener('focus', handleFocus);

      colDiv.appendChild(input);
    }

    // Validate initially if completed
    if (state.completedColumns.includes(colIndex + 1) || state.isSolved) {
      validateColumn(colIndex, colDiv, true);
    }

    gridContainer.appendChild(colDiv);
  });
}

let gameStartedFired = false;

function handleFocus(e) {
  if (!gameStartedFired) {
    window.parent.postMessage({ type: "rebus:started" }, "*");
    gameStartedFired = true;
  }

  // Highlight question
  const colIndex = e.target.dataset.col;
  document.querySelectorAll('#questions-list li').forEach(li => li.classList.remove('active'));
  document.querySelector(`#questions-list li[data-col-index="${colIndex}"]`).classList.add('active');

  // Select text to allow easy overwrite
  e.target.select();
}

function handleInput(e) {
  const input = e.target;
  const colIndex = parseInt(input.dataset.col);
  const rowIndex = parseInt(input.dataset.row);

  // Filter non-Cyrillic
  input.value = input.value.replace(/[^А-Яа-яЁё]/gi, '').toUpperCase();

  // Update state
  state.gridState[`col_${colIndex + 1}`][rowIndex] = input.value;

  // Reset colors for the column if user changes something in a previously checked (but maybe not fully correct) state
  const colDiv = gridContainer.children[colIndex];
  resetColumnColors(colDiv);

  if (input.value) {
    // Move to the immediately next cell in the column, if it exists and is not disabled
    const nextInput = colDiv.querySelectorAll('input')[rowIndex + 1];
    if (nextInput && !nextInput.disabled) {
      nextInput.focus();
    }
  }

  checkColumnCompletion(colIndex, colDiv);
}

function handleKeydown(e) {
  const input = e.target;
  const colIndex = parseInt(input.dataset.col);
  const rowIndex = parseInt(input.dataset.row);

  if (e.key === 'Backspace' && !input.value) {
    // Move to previous cell
    if (rowIndex > 0) {
      const prevInput = gridContainer.children[colIndex].querySelectorAll('input')[rowIndex - 1];
      if (prevInput && !prevInput.disabled) {
        prevInput.focus();
        prevInput.value = '';
        state.gridState[`col_${colIndex + 1}`][rowIndex - 1] = '';
        resetColumnColors(gridContainer.children[colIndex]);
      }
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextInput = gridContainer.children[colIndex].querySelectorAll('input')[rowIndex + 1];
    if (nextInput && !nextInput.disabled) nextInput.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (rowIndex > 0) {
      const prevInput = gridContainer.children[colIndex].querySelectorAll('input')[rowIndex - 1];
      if (prevInput && !prevInput.disabled) prevInput.focus();
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (colIndex < targetWords.length - 1) {
      const nextColInputs = gridContainer.children[colIndex + 1].querySelectorAll('input');
      if (nextColInputs[Math.min(rowIndex, nextColInputs.length - 1)]) {
        nextColInputs[Math.min(rowIndex, nextColInputs.length - 1)].focus();
      }
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (colIndex > 0) {
      const prevColInputs = gridContainer.children[colIndex - 1].querySelectorAll('input');
      if (prevColInputs[Math.min(rowIndex, prevColInputs.length - 1)]) {
        prevColInputs[Math.min(rowIndex, prevColInputs.length - 1)].focus();
      }
    }
  }
}


function focusOnColumn(colIndex) {
  const inputs = gridContainer.children[colIndex].querySelectorAll('input');
  for (let i = 0; i < inputs.length; i++) {
    if (!inputs[i].value && !inputs[i].disabled) {
      inputs[i].focus();
      return;
    }
  }
  if (inputs.length > 0 && !inputs[0].disabled) {
    inputs[0].focus();
  }
}

function resetColumnColors(colDiv) {
  const inputs = colDiv.querySelectorAll('input');
  inputs.forEach(input => {
    input.classList.remove('correct', 'present', 'absent');
  });
}

function checkColumnCompletion(colIndex, colDiv) {
  const inputs = colDiv.querySelectorAll('input');
  let isComplete = true;
  inputs.forEach(input => {
    if (!input.value) isComplete = false;
  });

  if (isComplete) {
    validateColumn(colIndex, colDiv, false);
  }
}

function validateColumn(colIndex, colDiv, isRestoring) {
  const targetWord = targetWords[colIndex].toUpperCase();
  const inputs = Array.from(colDiv.querySelectorAll('input'));
  let guess = inputs.map(i => i.value.toUpperCase());

  let result = Array(targetWord.length).fill('absent');
  let targetChars = targetWord.split('');

  // Pass 1: Correct
  for (let i = 0; i < targetWord.length; i++) {
    if (guess[i] === targetChars[i]) {
      result[i] = 'correct';
      targetChars[i] = null; // mark as used
    }
  }

  // Pass 2: Present
  for (let i = 0; i < targetWord.length; i++) {
    if (result[i] !== 'correct') {
      const matchIndex = targetChars.indexOf(guess[i]);
      if (matchIndex !== -1) {
        result[i] = 'present';
        targetChars[matchIndex] = null;
      }
    }
  }

  // Apply colors
  let allCorrect = true;
  inputs.forEach((input, i) => {
    input.classList.remove('correct', 'present', 'absent');
    input.classList.add(result[i]);
    if (result[i] !== 'correct') allCorrect = false;
  });

  if (allCorrect && !state.completedColumns.includes(colIndex + 1)) {
    state.completedColumns.push(colIndex + 1);
    inputs.forEach(input => input.disabled = true);

    if (!isRestoring) {
      state.step++; // Dummy step increment on successful column
      reportProgress();
      checkVictory();
    }
  } else if (!allCorrect && !isRestoring) {
      // Allow user to try again: do NOT disable inputs
      state.step++; // Dummy step increment on failed attempt too
      reportProgress();
  }
}

function reportProgress() {
  const currentGameState = {
    step: state.step,
    gridState: state.gridState,
    completedColumns: state.completedColumns,
    timeSpent: state.timeSpent
  };

  window.parent.postMessage({
    type: "rebus:progress",
    data: currentGameState
  }, "*");
}

function checkVictory() {
  if (state.completedColumns.length === targetWords.length) {
    state.isSolved = true;
    clearInterval(state.timerInterval);
    playVictoryAnimation();

    setTimeout(() => {
      window.parent.postMessage({ type: "rebus:solved" }, "*");
    }, 2000);
  }
}

function playVictoryAnimation() {
  // Animate the horizontal word
  const keyCells = document.querySelectorAll('.grid-cell.key-cell');
  gridContainer.classList.add('victory-anim');

  keyCells.forEach((cell, index) => {
    // Stagger animation
    cell.style.animationDelay = `${index * 0.1}s`;
  });
}

function setupEventListeners() {
  helpBtn.addEventListener('click', () => {
    helpTooltip.classList.toggle('hidden');
  });

  closeHelpBtn.addEventListener('click', () => {
    helpTooltip.classList.add('hidden');
  });

  // Iframe messages
  window.addEventListener("message", (event) => {
    const payload = event.data || {};
    if (payload.type !== "rebus:init") return;

    if (payload.solved) {
      state.isSolved = true;
      // Force grid to solution
      targetWords.forEach((word, colIndex) => {
        state.gridState[`col_${colIndex + 1}`] = word.split('');
        if (!state.completedColumns.includes(colIndex + 1)) {
          state.completedColumns.push(colIndex + 1);
        }
      });
      generateGrid();
      playVictoryAnimation();
    } else if (payload.progress) {
      state.gridState = payload.progress.gridState || {};
      state.completedColumns = payload.progress.completedColumns || [];
      state.timeSpent = payload.progress.timeSpent || 0;
      state.step = payload.progress.step || 0;
      generateGrid();
      startTimer();
    } else {
      // Clean start handled by default empty state
      generateGrid();
      startTimer();
    }
  });
}

// Initialize on DOM load if not waiting for init message
// (For local testing. Real environment will send rebus:init)
document.addEventListener('DOMContentLoaded', () => {
  initGame();
});
