#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const env = { ...process.env };
const provider = (env.DATABASE_PROVIDER ?? '').toLowerCase();
const hasUrl = typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.trim().length > 0;

if (!hasUrl) {
  if (provider === 'sqlite') {
    env.DATABASE_URL = 'file:./dev.db';
  } else {
    env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  }
  console.log('DATABASE_URL not set; using placeholder for prisma generate');
}

const schemaArgs = provider === 'sqlite' ? ['--schema', 'prisma/schema.sqlite.prisma'] : [];

console.log('Running prisma generate');
const result = spawnSync('pnpm', ['exec', 'prisma', 'generate', ...schemaArgs], {
  stdio: 'inherit',
  env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
