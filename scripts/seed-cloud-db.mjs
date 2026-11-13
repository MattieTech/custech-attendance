/**
 * CUSTECH Cloud Database Seeder
 *
 * Pushes the full authoritative seed store (src/data/custech_store.json)
 * into Vercel KV, Upstash Redis, or Supabase.
 *
 * Usage:
 *   node scripts/seed-cloud-db.mjs
 */

import fs from 'fs';
import path from 'path';

const CLOUD_STORE_KEY = 'custech_attendance_store_v1';

async function seed() {
  console.log('=== CUSTECH Cloud Database Seeder ===\n');

  const storePath = path.join(process.cwd(), 'src', 'data', 'custech_store.json');
  if (!fs.existsSync(storePath)) {
    console.error('Error: Could not find src/data/custech_store.json');
    process.exit(1);
  }

  const raw = fs.readFileSync(storePath, 'utf8');
  const payload = JSON.parse(raw);

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (kvUrl && kvToken) {
    const provider = process.env.KV_REST_API_URL ? 'Vercel KV' : 'Upstash Redis';
    console.log(`Connecting to ${provider} at ${kvUrl}...`);

    const res = await fetch(kvUrl.replace(/\/+$/, ''), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', CLOUD_STORE_KEY, JSON.stringify(payload)]),
    });

    if (res.ok) {
      console.log(`SUCCESS! Seeded ${payload.profiles?.length || 0} profiles, ${payload.students?.length || 0} students to ${provider}.`);
    } else {
      console.error(`Failed to seed ${provider}: Status ${res.status}`);
      const text = await res.text();
      console.error(text);
      process.exit(1);
    }
    return;
  }

  if (supabaseUrl && supabaseKey) {
    console.log(`Connecting to Supabase at ${supabaseUrl}...`);
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/custech_kv_store`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        key: CLOUD_STORE_KEY,
        value: payload,
        updated_at: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      console.log(`SUCCESS! Seeded store to Supabase.`);
    } else {
      console.error(`Failed to seed Supabase: Status ${res.status}`);
      const text = await res.text();
      console.error(text);
      process.exit(1);
    }
    return;
  }

  console.log('No cloud database environment variables detected.');
  console.log('To connect a cloud database on Vercel:');
  console.log('  1. Go to your Vercel Dashboard -> Project (attendancecustech) -> Storage');
  console.log('  2. Click "Create Database" -> select "KV" (or Upstash Redis)');
  console.log('  3. Click "Connect"');
  console.log('\nVercel will automatically provide KV_REST_API_URL and KV_REST_API_TOKEN.');
  console.log('The application will then automatically use the cloud database on all serverless functions!\n');
}

seed().catch((err) => {
  console.error('Fatal error during cloud database seed:', err);
  process.exit(1);
});
