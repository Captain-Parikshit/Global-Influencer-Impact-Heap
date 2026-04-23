/**
 * Global AI API Rate Limiter
 *
 * Enforces a minimum gap between ALL API calls regardless of which
 * file makes them. Both socialApi.js and groqApi.js import this.
 *
 * We use 1.5s gap to stay safely under most rate limits.
 */

const MIN_GAP_MS = 2200; // 2.2s — safely under 30 RPM (one per 2s)
let lastCallTime = 0;
let queue = Promise.resolve(); // serial queue — one call at a time

/**
 * Wraps any async function so it runs through the rate-limited queue.
 * Calls are serialised and spaced at least MIN_GAP_MS apart.
 *
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export const rateLimited = (fn) => {
  queue = queue.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_GAP_MS - (now - lastCallTime));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallTime = Date.now();
  });

  // Run the actual function after the gap is served
  return queue.then(() => fn());
};
