#!/bin/sh
set -e

echo "🍕 SIST Pizza Backend starting..."

# Wait for database
echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

# Wait for Redis
echo "⏳ Waiting for Redis..."
until nc -z redis 6379; do
  sleep 1
done
echo "✅ Redis is ready"

# Run migrations
echo "📦 Running database migrations..."
npm run migrate || true

# Seed data if needed
echo "🌱 Seeding database..."
npm run seed || true

echo "🚀 Starting server..."
exec npm start
