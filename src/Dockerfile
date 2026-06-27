# ─────────────────────────────────────────────
# Stage: production image
# Base: node:22-alpine (small, official Node image)
# ─────────────────────────────────────────────

FROM node:22-alpine

# Set the working directory inside the container.
# All subsequent commands run relative to this path.
WORKDIR /app

# Copy dependency manifests before copying source code.
# Docker caches each layer — if package.json hasn't changed,
# the npm install step is skipped on future builds (faster CI).
COPY package.json package-lock.json ./

# Install only production dependencies.
# --omit=dev excludes jest, supertest, etc. from the image.
# npm ci installs the exact versions locked in package-lock.json.
RUN npm ci --omit=dev

# Copy the rest of the backend source code into the container.
COPY . .

# Document that the app listens on port 8000.
# This is metadata only — it does not open the port.
# Cloud Run reads this to know which port to route traffic to.
EXPOSE 8000

# Start the server.
CMD ["node", "server.js"]
