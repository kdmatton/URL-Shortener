# URL Shortener

**Live:** [https://urls-shrink.netlify.app](https://urls-shrink.netlify.app)

A REST API that shortens URLs, built with Node.js and Express. Includes JWT authentication, a Redis cache for fast redirects, and rate limiting backed by a Redis token-bucket to prevent abuse. There is also alot of cool low level system design techniques implemented in this project for example: reverse mapping in cache to prevent duplicated stores. So please go through this project and look at in line documentation! 

> **Note:** The live deployment may be offline to avoid cloud infrastructure costs (Cloud SQL). The code is fully functional and can be run locally. If you want a live deployment, create cloud instance and then make sure you go into cloud run and set variable name accordingly with the DB.config

---

## Features

- Shorten any `http`/`https` URL to a 6-character alphanumeric code
- Fast redirects via a Redis cache-aside layer (1-hour TTL, falls back to PostgreSQL)
- JWT auth with short-lived access tokens (15 min) and rotating refresh tokens (7 days, stored in an HTTP-only cookie)
- SSRF protection — private/loopback addresses are blocked at the handler level
- Rate limiting:
  - **Shorten:** token-bucket per user (5 tokens, refills 1 per 30 s) via a Redis Lua script
  - **Login / Register:** 5 requests per hour via `express-rate-limit`
- CI/CD pipeline via GitHub Actions (tests → Docker build → push to Google Artifact Registry)

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Runtime     | Node.js 22, Express 5                         |
| Database    | PostgreSQL (via `pg`)                         |
| Cache       | Redis 6                                       |
| Auth        | JSON Web Tokens (`jsonwebtoken`), bcrypt       |
| Cloud       | Google Cloud Run, Cloud SQL, Artifact Registry |
| CI/CD       | GitHub Actions                                |
| Tests       | Jest, supertest                               |

---

## API Reference

All endpoints accept and return JSON.

### Auth

| Method | Path             | Auth required | Description                                      |
|--------|------------------|---------------|--------------------------------------------------|
| POST   | `/auth/register` | No            | Create a new account                             |
| POST   | `/auth/login`    | No            | Log in and receive an access token               |
| POST   | `/auth/refresh`  | No (cookie)   | Exchange a refresh token for a new access token  |
| POST   | `/auth/logout`   | No (cookie)   | Invalidate the current refresh token             |

**Register / Login body:**
```json
{ "email": "user@example.com", "password": "SecurePass1!" }
```

Password requirements: minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character (`@$!%*?&#`).

**Login response:**
```json
{ "accessToken": "<jwt>" }
```
The refresh token is set as an HTTP-only cookie automatically.

---

### URLs

| Method | Path         | Auth required | Description                         |
|--------|--------------|---------------|-------------------------------------|
| POST   | `/shorten`   | Yes (Bearer)  | Shorten a URL                       |
| GET    | `/:code`     | No            | Redirect to the original URL        |

**Shorten body:**
```json
{ "url": "https://example.com/some/long/path" }
```

**Shorten response (`201`):**
```json
{ "shortUrl": "http://localhost:8000/aB3xYz", "code": "aB3xYz" }
```

Set the `Authorization` header as `Bearer <accessToken>` for protected routes. If the access token is expired the middleware will attempt a silent refresh using the cookie and inject a fresh `accessToken` field into the response body.

---

## Running Locally

### Prerequisites

- Node.js 22+
- PostgreSQL
- Redis

### 1. Clone and install

```bash
git clone https://github.com/kdmatton/URL-Shortener.git
cd URL-Shortener/src
npm install
```

### 2. Configure environment

Create a `.env` file inside `src/`:

```env
# Server
PORT=8000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=urlshortener

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET= enter a long string 
JWT_REFRESH_SECRET= enter a long string
```

### 3. Set up the database

Run the schema against your PostgreSQL instance:

```sql
CREATE TABLE users (
    UserID   SERIAL PRIMARY KEY,
    email    TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(UserID) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE urls (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

### 4. Start the server

```bash
npm start
```

The API will be available at `http://localhost:8000`.

---

## Tests

```bash
cd src
npm test
```

Jest runs the full suite (auth, URL, and middleware tests) against mocked dependencies.

---

## Deployment Architecture

When deployed, the project uses:

- **Google Cloud Run** — containerised Node.js app, auto-scaled, receives traffic behind Google's load balancer (`trust proxy 1` is set so rate limiting sees the real client IP)
- **Google Cloud SQL (PostgreSQL)** — managed database connected via the Cloud SQL connector (no open ports)
- **Redis** (external managed instance) — cache and rate-limit store
- **Google Artifact Registry** — stores Docker images tagged by Git commit SHA

The CI/CD pipeline (`.github/workflows/deploy.yml`) runs on every push to `main`: tests must pass before the image is built and pushed.
