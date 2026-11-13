/**
 * CUSTECH Academic Presence Portal - Cloud Database Persistence Engine
 *
 * Provides serverless-safe persistent storage across Vercel lambda instances.
 * Supported backends:
 * 1. Vercel KV / Upstash Redis via native REST API (zero npm dependencies, instant cold starts)
 * 2. Supabase PostgREST API
 *
 * If no cloud credentials are provided (e.g. during local development),
 * the system seamlessly falls back to the local `src/data/custech_store.json` file.
 */

const CLOUD_STORE_KEY = 'custech_attendance_store_v1';

export interface CloudStorageConfig {
  provider: 'vercel-kv' | 'upstash-redis' | 'supabase' | 'none';
  endpoint?: string;
  token?: string;
}

/**
 * Detects the configured cloud database provider from environment variables.
 */
export function getCloudStorageConfig(): CloudStorageConfig {
  // 1. Vercel KV (automatically injected when connecting KV in Vercel Storage)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      provider: 'vercel-kv',
      endpoint: process.env.KV_REST_API_URL.replace(/\/+$/, ''),
      token: process.env.KV_REST_API_TOKEN,
    };
  }

  // 2. Upstash Redis (direct free account from upstash.com)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      provider: 'upstash-redis',
      endpoint: process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, ''),
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
  }

  // 3. Supabase REST API
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    return {
      provider: 'supabase',
      endpoint: process.env.SUPABASE_URL.replace(/\/+$/, ''),
      token: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    };
  }

  return { provider: 'none' };
}

export function isCloudConfigured(): boolean {
  return getCloudStorageConfig().provider !== 'none';
}

/**
 * Save data payload to the cloud database.
 */
export async function saveToCloud(payload: Record<string, unknown>): Promise<boolean> {
  const config = getCloudStorageConfig();
  if (config.provider === 'none' || !config.endpoint || !config.token) {
    return false;
  }

  const serialized = JSON.stringify(payload);

  try {
    if (config.provider === 'vercel-kv' || config.provider === 'upstash-redis') {
      // Standard Upstash / Vercel KV REST command array
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', CLOUD_STORE_KEY, serialized]),
        // Do not cache cloud database writes
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`[CloudDB:${config.provider}] Write failed with status ${response.status}`);
        return false;
      }
      return true;
    }

    if (config.provider === 'supabase') {
      const response = await fetch(`${config.endpoint}/rest/v1/custech_kv_store`, {
        method: 'POST',
        headers: {
          apikey: config.token,
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          key: CLOUD_STORE_KEY,
          value: payload,
          updated_at: new Date().toISOString(),
        }),
        cache: 'no-store',
      });

      return response.ok;
    }

    return false;
  } catch (err) {
    console.error(`[CloudDB:${config.provider}] Error writing to cloud database:`, err);
    return false;
  }
}

/**
 * Load data payload from the cloud database.
 */
export async function loadFromCloud(): Promise<Record<string, unknown> | null> {
  const config = getCloudStorageConfig();
  if (config.provider === 'none' || !config.endpoint || !config.token) {
    return null;
  }

  try {
    if (config.provider === 'vercel-kv' || config.provider === 'upstash-redis') {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', CLOUD_STORE_KEY]),
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`[CloudDB:${config.provider}] Read failed with status ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data || data.result === null || data.result === undefined) {
        return null;
      }

      if (typeof data.result === 'string') {
        try {
          return JSON.parse(data.result);
        } catch {
          return null;
        }
      }

      if (typeof data.result === 'object') {
        return data.result as Record<string, unknown>;
      }

      return null;
    }

    if (config.provider === 'supabase') {
      const response = await fetch(
        `${config.endpoint}/rest/v1/custech_kv_store?key=eq.${encodeURIComponent(CLOUD_STORE_KEY)}&select=value`,
        {
          headers: {
            apikey: config.token,
            Authorization: `Bearer ${config.token}`,
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) return null;
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
        return rows[0].value;
      }
      return null;
    }

    return null;
  } catch (err) {
    console.error(`[CloudDB:${config.provider}] Error reading from cloud database:`, err);
    return null;
  }
}
