// ========================================================
// STICKY NOTES TASK BOARD - INTERACTIVE CONTROLLER
// ========================================================

const STORAGE_KEY = "sticky_notes_list";
const THEME_KEY = "sticky_notes_theme";

// DOM Elements
const formEl = document.getElementById("taskForm");
const inputEl = document.getElementById("taskInput");
const notesContainerEl = document.getElementById("notesContainer");
const emptyStateEl = document.getElementById("emptyState");
const taskCountBadge = document.getElementById("taskCountBadge");
const rearrangeBtn = document.getElementById("rearrangeBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeNameLabel = document.getElementById("themeNameLabel");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const colorDots = document.querySelectorAll(".color-palette .color-dot");

// Available Pastel Colors
const COLORS = ["yellow", "peach", "pink", "mint", "sky", "lavender"];
let selectedColor = "yellow";

// Board Themes
const THEMES = [
  { id: "theme-cork", label: "Cork" },
  { id: "theme-slate", label: "Slate" },
  { id: "theme-grid", label: "Grid" },
  { id: "theme-wood", label: "Wood" },
];
let currentThemeIndex = 0;

// Notes State Array
let notes = [];

// ========================================================
// INITIALIZATION
// ========================================================
function init() {
  loadTheme();
  loadNotes();
  setupEventListeners();
  updateUI();
}

// Load & normalize saved notes from localStorage
function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("list");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        notes = parsed.map((item, idx) => {
          // Compatibility with older simple { name, checked } format
          const name = typeof item === "string" ? item : item.name || "Untitled Note";
          const checked = typeof item === "object" && !!item.checked;
          const color = item.color || COLORS[idx % COLORS.length];
          const rotation = item.rotation !== undefined ? item.rotation : getRandomRotation();
          const id = item.id || `note_${Date.now()}_${idx}`;
          const createdAt = item.createdAt || "Pinned";
          const x = typeof item.x === "number" ? item.x : null;
          const y = typeof item.y === "number" ? item.y : null;

          return { id, name, checked, color, rotation, x, y, createdAt };
        });
      }
    }
  } catch (err) {
    console.error("Failed to load notes from localStorage", err);
    notes = [];
  }

  // Render initial notes
  notesContainerEl.innerHTML = "";
  notes.forEach((note) => {
    createNoteElement(note);
  });
}

// Load theme preference
function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    const idx = THEMES.findIndex((t) => t.id === savedTheme);
    if (idx !== -1) currentThemeIndex = idx;
  }
  applyTheme();
}

function applyTheme() {
  const theme = THEMES[currentThemeIndex];
  THEMES.forEach((t) => document.body.classList.remove(t.id));
  document.body.classList.add(theme.id);
  if (themeNameLabel) {
    themeNameLabel.innerText = theme.label;
  }
  localStorage.setItem(THEME_KEY, theme.id);
}

// ========================================================
// EVENT LISTENERS
// ========================================================
function setupEventListeners() {
  // Form submission to create new note
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    addNewNoteFromInput();
  });

  // Color picker dot selection
  colorDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      colorDots.forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
      selectedColor = dot.dataset.color || "yellow";
      inputEl.focus();
    });
  });

  // Rearrange / Align to grid button
  rearrangeBtn.addEventListener("click", () => {
    resetAllPositionsToGrid();
  });

  // Theme switcher button
  themeToggleBtn.addEventListener("click", () => {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    applyTheme();
  });

  // Clear completed notes
  clearCompletedBtn.addEventListener("click", () => {
    clearCompletedNotes();
  });
}

// ========================================================
// NOTE CREATION & RENDERING
// ========================================================
function addNewNoteFromInput() {
  const text = inputEl.value.trim();
  if (!text) {
    inputEl.focus();
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: text,
    checked: false,
    color: selectedColor,
    rotation: getRandomRotation(),
    x: null,
    y: null,
    createdAt: timeStr,
  };

  notes.push(newNote);
  createNoteElement(newNote);
  saveNotes();
  updateUI();

  // Reset input and cycle color for delightful variety
  inputEl.value = "";
  cycleNextColor();
}

function createNoteElement(note) {
  const noteEl = document.createElement("div");
  noteEl.className = `sticky-note color-${note.color} ${note.checked ? "checked" : ""}`;
  noteEl.id = note.id;
  noteEl.style.setProperty("--rotation", `${note.rotation}deg`);

  // Random tape rotation for realism
  const tapeRot = (Math.random() * 4 - 2).toFixed(1);
  noteEl.style.setProperty("--tape-rot", `${tapeRot}deg`);

  // If note has saved absolute position, apply it
  if (note.x !== null && note.y !== null) {
    noteEl.classList.add("is-free-floating");
    noteEl.style.left = `${note.x}px`;
    noteEl.style.top = `${note.y}px`;
  }

  noteEl.innerHTML = `
    <div class="note-header">
      <div class="note-pin">
        <i class="fas fa-thumbtack"></i>
      </div>
      <span class="note-date">${note.createdAt || "Today"}</span>
    </div>

    <div class="note-body">
      <p class="note-text">${escapeHtml(note.name)}</p>
    </div>

    <span class="checked-stamp">DONE</span>

    <div class="note-footer">
      <button type="button" class="note-btn btn-check" title="${note.checked ? 'Mark as active' : 'Mark as done'}" aria-label="Toggle completed">
        <i class="fas fa-check"></i>
      </button>
      <button type="button" class="note-btn btn-delete" title="Delete sticky note" aria-label="Delete note">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `;

  // Attach button events
  const checkBtn = noteEl.querySelector(".btn-check");
  const deleteBtn = noteEl.querySelector(".btn-delete");

  checkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNoteChecked(note.id, noteEl);
  });

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteNoteWithAnimation(note.id, noteEl);
  });

  // Enable drag-and-drop to attach notes anywhere on the screen!
  enableDragAndDrop(noteEl, note);

  notesContainerEl.appendChild(noteEl);
  return noteEl;
}

// ========================================================
// DRAG & DROP ENGINE (ATTACH NOTES ANYWHERE ON SCREEN)
// ========================================================
let highestZIndex = 100;

function enableDragAndDrop(element, noteData) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let hasMoved = false;

  element.addEventListener("pointerdown", (e) => {
    // Ignore button clicks
    if (e.target.closest(".note-btn")) return;

    isDragging = true;
    hasMoved = false;
    highestZIndex += 1;
    element.style.zIndex = highestZIndex;
    element.setPointerCapture(e.pointerId);

    // Get current bounding client rect relative to canvas
    const canvasRect = notesContainerEl.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;

    initialLeft = elemRect.left - canvasRect.left;
    initialTop = elemRect.top - canvasRect.top;

    element.classList.add("is-dragging");
  });

  element.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasMoved = true;
    }

    if (hasMoved) {
      if (!element.classList.contains("is-free-floating")) {
        element.classList.add("is-free-floating");
      }

      // Calculate bounded new coordinates
      const newX = Math.max(10, initialLeft + deltaX);
      const newY = Math.max(10, initialTop + deltaY);

      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;
    }
  });

  const stopDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    element.classList.remove("is-dragging");

    try {
      element.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (hasMoved) {
      const canvasRect = notesContainerEl.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      const finalX = Math.round(elemRect.left - canvasRect.left);
      const finalY = Math.round(elemRect.top - canvasRect.top);

      noteData.x = finalX;
      noteData.y = finalY;
      saveNotes();
    }
  };

  element.addEventListener("pointerup", stopDrag);
  element.addEventListener("pointercancel", stopDrag);
}

// Reset all dragged notes back to organized grid layout
function resetAllPositionsToGrid() {
  notes.forEach((note) => {
    note.x = null;
    note.y = null;
  });

  const noteEls = document.querySelectorAll(".sticky-note");
  noteEls.forEach((el) => {
    el.classList.remove("is-free-floating");
    el.style.left = "";
    el.style.top = "";
    el.style.position = "";
    el.style.zIndex = "";
  });

  saveNotes();
}

// ========================================================
// NOTE ACTIONS (CHECK, DELETE, CLEAR)
// ========================================================
function toggleNoteChecked(id, noteEl) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  note.checked = !note.checked;
  noteEl.classList.toggle("checked", note.checked);

  const checkBtn = noteEl.querySelector(".btn-check");
  if (checkBtn) {
    checkBtn.title = note.checked ? "Mark as active" : "Mark as done";
  }

  saveNotes();
  updateUI();
}

function deleteNoteWithAnimation(id, noteEl) {
  noteEl.style.animation = "crumpleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards";

  setTimeout(() => {
    noteEl.remove();
    notes = notes.filter((n) => n.id !== id);
    saveNotes();
    updateUI();
  }, 280);
}

function clearCompletedNotes() {
  const completedNotes = notes.filter((n) => n.checked);
  if (completedNotes.length === 0) return;

  completedNotes.forEach((n) => {
    const el = document.getElementById(n.id);
    if (el) {
      el.style.animation = "crumpleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      setTimeout(() => el.remove(), 280);
    }
  });

  setTimeout(() => {
    notes = notes.filter((n) => !n.checked);
    saveNotes();
    updateUI();
  }, 290);
}

// ========================================================
// HELPERS & STORAGE
// ========================================================
function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    // Also save in old format key for backward compatibility
    localStorage.setItem(
      "list",
      JSON.stringify(
        notes.map((n) => ({
          name: n.name,
          checked: n.checked,
        }))
      )
    );
  } catch (err) {
    console.error("Failed to save to localStorage", err);
  }
}

function updateUI() {
  // Update badge count
  const total = notes.length;
  const completed = notes.filter((n) => n.checked).length;

  if (taskCountBadge) {
    if (total === 0) {
      taskCountBadge.innerText = "0 Notes";
    } else if (completed > 0) {
      taskCountBadge.innerText = `${total} Notes (${completed} Done)`;
    } else {
      taskCountBadge.innerText = `${total} ${total === 1 ? "Note" : "Notes"}`;
    }
  }

  // Toggle empty state
  if (emptyStateEl) {
    if (total === 0) {
      emptyStateEl.classList.remove("hidden");
    } else {
      emptyStateEl.classList.add("hidden");
    }
  }
}

function cycleNextColor() {
  const currentIndex = COLORS.indexOf(selectedColor);
  const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
  selectedColor = nextColor;

  colorDots.forEach((d) => {
    if (d.dataset.color === nextColor) {
      d.classList.add("active");
    } else {
      d.classList.remove("active");
    }
  });
}

function getRandomRotation() {
  // Returns rotation angle between -2.5 and +2.5 degrees
  return (Math.random() * 5 - 2.5).toFixed(1);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", init);
