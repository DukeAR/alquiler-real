import { Pool } from 'pg';
import { serverEnv } from './env';

const pool = new Pool({
    connectionString: serverEnv.databaseUrl,
    ssl: serverEnv.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
    getClient: () => pool.connect(),
};
