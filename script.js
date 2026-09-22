// ---------- Config ----------
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const ANIMATION_GENRE_ID = 16; // TMDB's shared "Animation" genre id for movie + tv

// ---------- DOM refs ----------
const grid = document.getElementById("grid");
const statusText = document.getElementById("status-text");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const modalOverlay = document.getElementById("modal-overlay");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// ---------- State ----------
let currentMedia = "tv"; // "tv" | "movie" | "all"
let currentMode = "discover"; // "discover" | "top-rated" | "search"

// ---------- Helpers ----------
function setStatus(text) {
  statusText.textContent = text;
}

function clearGrid() {
  grid.innerHTML = "";
}

function showEmptyState(message, detail) {
  clearGrid();
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `<strong>${message}</strong>${detail ? `<span>${detail}</span>` : ""}`;
  grid.appendChild(div);
}

function buildCard(item, mediaType) {
  const title = item.title || item.name || "Untitled";
  const date = (item.release_date || item.first_air_date || "").slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";

  const card = document.createElement("article");
  card.className = "poster-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `View details for ${title}`);

  if (item.poster_path) {
    const img = document.createElement("img");
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = `${title} poster`;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    const noImg = document.createElement("div");
    noImg.className = "no-image";
    noImg.textContent = "No poster available";
    card.appendChild(noImg);
  }

  const overlay = document.createElement("div");
  overlay.className = "poster-overlay";
  overlay.innerHTML = `
    <p class="poster-title">${title}</p>
    <div class="poster-meta">
      <span>${date || "—"}</span>
      <span class="poster-rating">★ ${rating}</span>
    </div>
  `;
  card.appendChild(overlay);

  const openDetails = () => openModal(item.id, mediaType || item.media_type);
  card.addEventListener("click", openDetails);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetails();
    }
  });

  return card;
}

function renderResults(items, mediaType) {
  clearGrid();

  if (!items || items.length === 0) {
    showEmptyState("No titles found.", "Try a different search or filter.");
    return;
  }

  items
    .filter((item) => item.poster_path || item.title || item.name)
    .forEach((item) => grid.appendChild(buildCard(item, mediaType)));
}

// Anime proxy: TMDB has no dedicated "anime" flag, so a title counts as
// anime here if it's tagged Animation AND its original language is Japanese.
function isAnime(item) {
  const hasAnimationGenre = Array.isArray(item.genre_ids) && item.genre_ids.includes(ANIMATION_GENRE_ID);
  return hasAnimationGenre && item.original_language === "ja";
}

// ---------- API calls ----------
async function fetchFromTMDB(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}

async function loadDiscover(media) {
  setStatus(`Loading anime ${media === "movie" ? "movies" : "shows"}...`);
  try {
    const data = await fetchFromTMDB(`/discover/${media}`, {
      with_genres: ANIMATION_GENRE_ID,
      with_origin_country: "JP",
      sort_by: "popularity.desc",
    });
    renderResults(data.results, media);
    setStatus(`Showing anime ${media === "movie" ? "movies" : "shows"}, sorted by popularity.`);
  } catch (err) {
    showEmptyState("Something went wrong loading the shelf.", err.message);
    setStatus("Failed to load.");
  }
}

async function loadTopRated() {
  setStatus("Loading top rated anime...");
  try {
    const [tvData, movieData] = await Promise.all([
      fetchFromTMDB(`/discover/tv`, {
        with_genres: ANIMATION_GENRE_ID,
        with_origin_country: "JP",
        sort_by: "vote_average.desc",
        "vote_count.gte": 100,
      }),
      fetchFromTMDB(`/discover/movie`, {
        with_genres: ANIMATION_GENRE_ID,
        with_origin_country: "JP",
        sort_by: "vote_average.desc",
        "vote_count.gte": 100,
      }),
    ]);

    const combined = [
      ...tvData.results.map((item) => ({ ...item, media_type: "tv" })),
      ...movieData.results.map((item) => ({ ...item, media_type: "movie" })),
    ]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 20);

    renderResults(combined);
    setStatus("Showing the highest-rated anime, movies and shows combined.");
  } catch (err) {
    showEmptyState("Something went wrong loading top rated anime.", err.message);
    setStatus("Failed to load.");
  }
}

async function loadSearch(query) {
  if (!query.trim()) return;
  setStatus(`Searching anime for "${query}"...`);
  try {
    const data = await fetchFromTMDB(`/search/multi`, { query });
    const filtered = data.results.filter(
      (item) => (item.media_type === "movie" || item.media_type === "tv") && isAnime(item)
    );
    renderResults(filtered);
    setStatus(
      filtered.length
        ? `Showing anime results for "${query}".`
        : `No anime results for "${query}".`
    );
  } catch (err) {
    showEmptyState("Something went wrong searching.", err.message);
    setStatus("Search failed.");
  }
}

// ---------- Modal ----------
async function openModal(id, mediaType) {
  if (!id || !mediaType) return;

  modalBody.innerHTML = "<p>Loading...</p>";
  modalOverlay.hidden = false;
  modalClose.focus();

  try {
    const detail = await fetchFromTMDB(`/${mediaType}/${id}`);
    const title = detail.title || detail.name || "Untitled";
    const date = detail.release_date || detail.first_air_date || "";
    const rating = detail.vote_average ? detail.vote_average.toFixed(1) : "—";
    const runtime = mediaType === "movie"
      ? (detail.runtime ? `${detail.runtime} min` : null)
      : (detail.number_of_seasons ? `${detail.number_of_seasons} season${detail.number_of_seasons > 1 ? "s" : ""}` : null);
    const genres = (detail.genres || []).map((g) => `<span>${g.name}</span>`).join("");
    const posterHtml = detail.poster_path
      ? `<img class="modal-poster" src="${IMG_URL}${detail.poster_path}" alt="${title} poster" />`
      : `<div class="modal-poster no-image">No poster</div>`;

    modalBody.innerHTML = `
      ${posterHtml}
      <div class="modal-info">
        <h2 id="modal-title">${title}</h2>
        <div class="modal-meta">
          <span>${date || "—"}</span>
          ${runtime ? `<span>${runtime}</span>` : ""}
          <span class="modal-rating">★ ${rating}</span>
        </div>
        <div class="modal-genres">${genres}</div>
        <p class="modal-overview">${detail.overview || "No synopsis available."}</p>
      </div>
    `;
  } catch (err) {
    modalBody.innerHTML = `<p>Couldn't load details right now. ${err.message}</p>`;
  }
}

function closeModal() {
  modalOverlay.hidden = true;
  modalBody.innerHTML = "<p>Loading...</p>";
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
});

// ---------- Event listeners ----------
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    currentMode = btn.dataset.mode;
    currentMedia = btn.dataset.media;
    searchInput.value = "";

    if (currentMode === "top-rated") {
      loadTopRated();
    } else {
      loadDiscover(currentMedia);
    }
  });
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  filterButtons.forEach((b) => b.classList.remove("active"));
  loadSearch(searchInput.value);
});

// ---------- Init ----------
loadDiscover(currentMedia);
