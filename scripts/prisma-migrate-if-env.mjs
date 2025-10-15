#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const env = { ...process.env };
const hasDatabaseUrl = typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.trim().length > 0;

if (!hasDatabaseUrl) {
  console.log('Skipping prisma migrate deploy: DATABASE_URL not set');
  process.exit(0);
}

const provider = (env.DATABASE_PROVIDER ?? '').toLowerCase();
const url = env.DATABASE_URL;
const isSqlite = provider === 'sqlite' || url.startsWith('file:');
const schemaArgs = isSqlite ? ['--schema', 'prisma/schema.sqlite.prisma'] : [];

console.log('Running prisma migrate deploy');
const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy', ...schemaArgs], {
  stdio: 'inherit',
  env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
