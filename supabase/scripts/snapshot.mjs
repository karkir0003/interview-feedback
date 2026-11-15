#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';

// Extract Supabase URL from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl && !process.env.DATABASE_URL) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or DATABASE_URL in your .env file.');
  process.exit(1);
}

// Derive project ref from URL or explicit override
let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef && supabaseUrl) {
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    console.error('❌ Error: Unable to parse project ref from URL:', supabaseUrl);
    process.exit(1);
  }
}

const targetFile = path.resolve('supabase/seed.sql');

if (process.env.DATABASE_URL) {
  console.log('📦 Exporting public data snapshot using DATABASE_URL...');
  try {
    execSync(
      `supabase db dump --db-url "${process.env.DATABASE_URL}" --data-only --schema public -f "${targetFile}"`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Snapshot successfully saved to ${targetFile}!`);
    console.log(`💡 Run 'npm run db:clone' to spin up your local Supabase clone with this data.`);
  } catch {
    console.error('\n❌ Failed to export snapshot via DATABASE_URL.');
    process.exit(1);
  }
} else {
  console.log(`📦 Exporting public data snapshot for project: ${projectRef}...`);
  try {
    // Ensure the project is linked
    try {
      execSync(`supabase link --project-ref "${projectRef}"`, { stdio: 'inherit' });
    } catch {
      // If already linked or requires login, continue to attempt dump
    }

    execSync(`supabase db dump --linked --data-only --schema public -f "${targetFile}"`, {
      stdio: 'inherit',
    });
    console.log(`✅ Snapshot successfully saved to ${targetFile}!`);
    console.log(`💡 Run 'npm run db:clone' to spin up your local Supabase clone with this data.`);
  } catch {
    console.error('\n❌ Failed to export database snapshot.');
    console.error('👉 Make sure you are logged in via `supabase login` and enter your database password if prompted.');
    console.error('👉 Tip: You can also set `DATABASE_URL` in your .env to dump directly without CLI linking.');
    process.exit(1);
  }
}
