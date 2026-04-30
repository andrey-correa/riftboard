/**
 * Lightweight structured logger. In production, swap for pino or similar.
 * Outputs JSON-shaped lines for easy ingest.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: Level =
  (process.env.LOG_LEVEL as Level) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  const payload = JSON.stringify(line);
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) =>
    emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    emit('error', msg, meta),
};
