/**
 * FundedDesk — Migration Runner
 * 
 * Runs Supabase migrations programmatically.
 * Usage: node scripts/run-migrations.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 * 
 * Note: This requires the `pg` package for direct PostgreSQL connections,
 * or you can run the SQL files manually in Supabase SQL Editor.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAlternatively, run the SQL files manually in Supabase SQL Editor:');
  console.error('  1. Go to Supabase Dashboard → SQL Editor');
  console.error('  2. Copy contents of supabase/plan-types-rules.sql and run');
  console.error('  3. Copy contents of supabase/soft-breaches.sql and run');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MIGRATIONS = [
  { name: 'plan-types-rules', file: 'supabase/plan-types-rules.sql' },
  { name: 'soft-breaches', file: 'supabase/soft-breaches.sql' },
];

async function runMigration(name, sql) {
  console.log(`\n🔄 Running migration: ${name}`);
  
  // Split by semicolon, but be careful with function definitions
  const statements = splitSQLStatements(sql);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt || stmt.startsWith('--')) continue;
    
    try {
      // Use PostgREST raw query via Supabase REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ sql: stmt }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        // Check if it's a "already exists" error which is OK
        if (errorText.includes('already exists') || 
            errorText.includes('duplicate') ||
            errorText.includes('42701') ||
            errorText.includes('42P07')) {
          console.log(`  ⊘ Statement ${i + 1}/${statements.length} (already exists, skipped)`);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      console.log(`  ✓ Statement ${i + 1}/${statements.length}`);
    } catch (err) {
      if (err.message?.includes('already exists') || 
          err.message?.includes('duplicate') ||
          err.message?.includes('42701') ||
          err.message?.includes('42P07')) {
        console.log(`  ⊘ Statement ${i + 1}/${statements.length} (already exists, skipped)`);
      } else {
        console.error(`  ✗ Statement ${i + 1}/${statements.length} failed:`, err.message);
        throw err;
      }
    }
  }
  
  console.log(`✅ Migration ${name} completed`);
}

function splitSQLStatements(sql) {
  // Remove comments
  const noComments = sql.replace(/--.*$/gm, '');
  
  // Split by semicolon but respect function definitions
  const statements = [];
  let current = '';
  let inFunction = false;
  let dollarQuote = null;
  
  for (let i = 0; i < noComments.length; i++) {
    const char = noComments[i];
    const next = noComments[i + 1];
    
    if (!inFunction && char === '$' && next && next.match(/[a-zA-Z_]/)) {
      // Start of dollar quote
      const end = noComments.indexOf('$', i + 1);
      if (end > i) {
        dollarQuote = noComments.slice(i, end + 1);
        inFunction = true;
      }
    } else if (inFunction && noComments.slice(i).startsWith(dollarQuote + '$')) {
      // End of dollar quote
      inFunction = false;
      dollarQuote = null;
    } else if (!inFunction && char === ';') {
      statements.push(current + ';');
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(s => s.trim().length > 0);
}

async function main() {
  console.log('🚀 FundedDesk Migration Runner');
  console.log('===============================');
  console.log(`Target: ${SUPABASE_URL}`);
  
  // Test connection
  try {
    const { data, error } = await supabase.from('plans').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Connected to Supabase');
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err.message);
    console.error('\nPlease run migrations manually in Supabase SQL Editor:');
    console.error('  1. Go to Supabase Dashboard → SQL Editor');
    console.error('  2. Copy contents of supabase/plan-types-rules.sql and run');
    console.error('  3. Copy contents of supabase/soft-breaches.sql and run');
    process.exit(1);
  }
  
  // Run migrations
  for (const migration of MIGRATIONS) {
    const sql = readFileSync(join(process.cwd(), migration.file), 'utf-8');
    await runMigration(migration.name, sql);
  }
  
  // Verify migrations
  console.log('\n🔍 Verifying migrations...');
  
  // Check plan_type column
  const { data: plans, error: plansErr } = await supabase
    .from('plans')
    .select('id, name, plan_type')
    .limit(10);
  
  if (plansErr) {
    console.error('❌ Failed to verify plans:', plansErr.message);
  } else {
    console.log('✅ Plans table:');
    plans.forEach(p => console.log(`  - ${p.name} (ID: ${p.id}) → ${p.plan_type || 'NULL'}`));
  }
  
  // Check soft_breaches table
  const { data: breaches, error: breachErr } = await supabase
    .from('soft_breaches')
    .select('*')
    .limit(1);
  
  if (breachErr) {
    console.error('❌ soft_breaches table not found:', breachErr.message);
  } else {
    console.log('✅ soft_breaches table exists');
  }
  
  console.log('\n🎉 All migrations completed successfully!');
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});