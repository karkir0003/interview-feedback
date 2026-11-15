#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Step 1: Starting local Supabase development containers...');
try {
  execSync('supabase start', { stdio: 'inherit' });
} catch {
  console.error('\n❌ Failed to start Supabase.');
  console.error('👉 Ensure Docker Desktop or OrbStack is running on your machine, then try again.');
  process.exit(1);
}

const seedPath = path.resolve('supabase/seed.sql');
const hasSeed = fs.existsSync(seedPath);

if (hasSeed) {
  console.log('\n📦 Step 2: Replaying migrations and applying snapshot (supabase/seed.sql)...');
} else {
  console.log('\n🔄 Step 2: Replaying all migrations from clean slate...');
}

try {
  execSync('supabase db reset', { stdio: 'inherit' });
  console.log('\n======================================================');
  console.log('🎉 Local Supabase Clone is Ready & Running!');
  console.log('======================================================');
  console.log('🌐 Supabase Studio (Web UI): http://127.0.0.1:54323');
  console.log('📬 Inbucket Test Mailbox:    http://127.0.0.1:54324');
  console.log('⚡ API Gateway URL:          http://127.0.0.1:54321');
  console.log('🐘 PostgreSQL Direct:        postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  console.log('======================================================\n');
} catch {
  console.error('\n❌ Failed to reset and seed database.');
  process.exit(1);
}
