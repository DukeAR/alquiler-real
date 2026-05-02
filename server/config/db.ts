import { Pool } from 'pg';
import { serverEnv } from './env';

const pool = new Pool({
    connectionString: serverEnv.databaseUrl,
    ssl: serverEnv.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

let queryCount = 0;
let totalQueryDurationMs = 0;

const formatQueryPreview = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 160);

const shouldLogQueries = !serverEnv.isTest;

const query = async (text: string, params?: any[]) => {
    const startedAt = Date.now();

    try {
        const result = await pool.query(text, params);
        const durationMs = Date.now() - startedAt;

        queryCount += 1;
        totalQueryDurationMs += durationMs;

        if (shouldLogQueries) {
            console.log(`[DB] #${queryCount} ${durationMs}ms rows=${result.rowCount ?? result.rows?.length ?? 0} ${formatQueryPreview(text)}`);
        }

        return result;
    } catch (error) {
        const durationMs = Date.now() - startedAt;

        queryCount += 1;
        totalQueryDurationMs += durationMs;

        if (shouldLogQueries) {
            console.error(`[DB] #${queryCount} ${durationMs}ms ERROR ${formatQueryPreview(text)}`);
        }

        throw error;
    }
};

export const db = {
    query,
    getClient: () => pool.connect(),
    getStats: () => ({
        queryCount,
        totalQueryDurationMs,
    }),
};
