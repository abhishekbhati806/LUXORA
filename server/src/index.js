import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { luxoraRateLimit } from './middleware/rateLimit.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import env, { assertConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { ensureIndexes } from './models/index.js';
import routes from './routes/index.js';
import errorHandler, { notFound } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy:
        env.nodeEnv === 'production'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                imgSrc: [
                  "'self'",
                  'data:',
                  'blob:',
                  'https://res.cloudinary.com',
                  'https://*.wikimedia.org',
                ],
                styleSrc: [
                  "'self'",
                  "'unsafe-inline'",
                  'https://fonts.googleapis.com',
                ],
                fontSrc: [
                  "'self'",
                  'https://fonts.gstatic.com',
                ],
                connectSrc: [
                  "'self'",
                  'https://api.cloudinary.com',
                ],
                scriptSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
              },
            }
          : false,

      crossOriginEmbedderPolicy: false,

      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.use(compression());

  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin/curl requests have no Origin header.
        if (
          !origin ||
          env.corsOrigins.includes(origin) ||
          env.nodeEnv === 'development'
        ) {
          return cb(null, true);
        }

        return cb(new Error('Origin not allowed by CORS'));
      },

      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    morgan(env.logFormat, {
      skip: (req) => req.path === '/api/v1/health',
    }),
  );

  // Global quota; auth routes add a second, failure-only limiter on top.
  app.use('/api', luxoraRateLimit());

  // API routes.
  app.use('/api/v1', routes);

  // Locally stored uploads.
  // Fallback when Cloudinary is not configured.
  app.use(
    '/uploads',
    express.static(env.uploads.dir, {
      maxAge: '7d',
      index: false,
    }),
  );

  // ------------------------------------------------------------
  // PRODUCTION FRONTEND
  // ------------------------------------------------------------

  // IMPORTANT:
  // Render starts the server from the project root.
  // Therefore the Vite build is located at:
  //
  // client/dist
  //
  // Using process.cwd() makes the path work correctly on Render.
  const clientDist = path.resolve(process.cwd(), 'client/dist');

  console.log(`[luxora] client dist: ${clientDist}`);
  console.log(
    `[luxora] client index exists: ${fs.existsSync(
      path.join(clientDist, 'index.html'),
    )}`,
  );

  if (
    env.serveClient &&
    fs.existsSync(path.join(clientDist, 'index.html'))
  ) {
    // Serve React/Vite static assets.
    app.use(
      express.static(clientDist, {
        index: false,
        maxAge: '1y',
        immutable: true,
      }),
    );

    // React SPA fallback.
    // API and uploads routes are excluded.
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    // Frontend build not found.
    app.get('/', (_req, res) =>
      res
        .status(200)
        .type('html')
        .send(
          `<main style="font:16px/1.6 ui-sans-serif;padding:48px;max-width:44rem;margin:0 auto">
             <h1 style="font-size:28px;letter-spacing:.12em">LUXORA</h1>
             <p>API is live at <code>/api/v1</code>. The client build was not found — run
             <code>npm run build</code> from the repo root, or start the Vite dev server on
             <code>:5173</code>.</p>
           </main>`,
        ),
    );
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export async function start() {
  assertConfig();

  await connectDatabase();

  await ensureIndexes().catch(() => {});

  const app = createApp();

  const server = app.listen(
    env.port,
    '0.0.0.0',
    () => {
      console.log(
        `[luxora] api on http://0.0.0.0:${env.port} (${env.nodeEnv})`,
      );
    },
  );

  const shutdown = async (signal) => {
    console.log(`[luxora] ${signal} — closing`);

    server.close();

    await disconnectDatabase().catch(() => {});

    process.exit(0);
  };

  ['SIGINT', 'SIGTERM'].forEach((s) =>
    process.on(s, () => shutdown(s)),
  );

  return server;
}

// Only boot when executed directly so tests can import createApp() freely.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  start().catch((err) => {
    console.error('[luxora] failed to start:', err.message);
    process.exit(1);
  });
}

export default createApp;