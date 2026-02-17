#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- 1. Installing Frontend Dependencies ---"
cd frontend
npm install

echo "--- 2. Building Frontend ---"
npm run build
cd ..

echo "--- 3. Installing Backend Dependencies ---"
cd backend
npm install

echo "--- 4. Generating Prisma Client (Postgres) ---"
cp prisma/schema.postgres.prisma prisma/schema.prisma
npx prisma generate
echo "--- 4.1 Pushing Schema to DB (Postgres) ---"
npx prisma db push --accept-data-loss

echo "--- 5. Building Backend ---"
npm run build
cd ..

echo "--- Build Complete! ---"
