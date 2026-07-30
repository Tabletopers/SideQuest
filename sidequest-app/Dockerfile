FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist/ ./backend/dist/
EXPOSE 3001
ENV HOST=0.0.0.0
ENV PORT=3001
WORKDIR /app/backend
CMD ["node", "server.js"]
