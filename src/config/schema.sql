CREATE TABLE Users (
    UserID   SERIAL PRIMARY KEY,
    Email    VARCHAR(255),
    Password VARCHAR(255)
);

CREATE TABLE refresh_tokens (
    token_id   SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE urls (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW()
);
