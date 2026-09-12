import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

let listenerAttached = false;

/**
 * Single shared connection. Retries briefly on boot so `npm run dev` survives a
 * mongod that is still warming up, then fails loudly (a silent fake connection
 * would let the app serve empty data and hide an outage).
 */
export async function connectDatabase({ retries = 6, delayMs = 1500 } = {}) {
  if (!listenerAttached) {
    listenerAttached = true;
    mongoose.connection.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[db] error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      if (env.nodeEnv !== 'test') console.warn('[db] disconnected');
    });
  }

  let attempt = 0;
  for (;;) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 4000,
        maxPoolSize: 20,
        autoIndex: env.nodeEnv !== 'production',
      });
      console.log(`[db] connected → ${mongoose.connection.name}`);
      return mongoose.connection;
    } catch (err) {
      attempt += 1;
      if (attempt > retries) {
        throw new Error(
          `Could not connect to MongoDB at ${env.mongoUri} after ${retries} attempts.\n` +
            'Start a local instance with `npm run db` (see scripts/dev-mongo.sh) or set MONGO_URI.\n' +
            `Last error: ${err.message}`,
        );
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}

export function dbState() {
  // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
}
