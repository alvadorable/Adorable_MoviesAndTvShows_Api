# Yozora — Anime Movies & Shows

A dark, moon-lit browser for anime movies and TV shows, built on top of [TMDB](https://www.themoviedb.org/) (The Movie Database) for the Third Party API Top 3 Challenge.

Since TMDB doesn't have a dedicated "anime" category, Yozora filters results by the shared Animation genre plus original language = Japanese, to approximate an anime-only feed.

## Features

- **Discover view** — browse anime TV shows or anime movies, sorted by popularity
- **Top Rated** — combined highest-rated anime shows and movies
- **Search** — look up any title, filtered down to anime results only
- **Detail modal** — click any poster for a synopsis, genres, rating, and runtime/season count

## Running it locally

1. Clone this repo.
2. Copy `config.js.example` to a new file named `config.js`.
3. Sign up for a free TMDB API key at https://www.themoviedb.org/settings/api and paste it into `config.js`:
   ```js
   const TMDB_API_KEY = "your_key_here";
   ```
4. Open `index.html` in your browser (no build step or server required).

## API key handling

`config.js` holds the TMDB API key and is listed in `.gitignore`, so it's never committed to this repository. Only `config.js.example`, a placeholder version, is tracked in git. Anyone running this project locally needs to create their own `config.js` with their own free key, as described above.

## Built with

- Vanilla HTML/CSS/JavaScript
- [TMDB API](https://www.themoviedb.org/documentation/api)

This product uses the TMDB API but is not endorsed or certified by TMDB.
