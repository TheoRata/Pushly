/**
 * Runs async tasks with controlled concurrency.
 *
 * Mirrors the Promise.allSettled shape so callers get a uniform result
 * regardless of whether individual tasks succeed or fail.
 *
 * @param {Array<() => Promise<any>>} tasks - Array of zero-argument async functions.
 * @param {number} concurrency - Max number of tasks to run at the same time (default 5).
 * @returns {Promise<Array<{status: 'fulfilled'|'rejected', value?: any, reason?: any}>>}
 *   One entry per task, in the same order as the input array.
 */
export async function batchFetch(tasks, concurrency = 5) {
  if (tasks.length === 0) return [];

  const results = new Array(tasks.length);
  let nextIndex = 0;

  // Each "worker" pulls the next available task until all are consumed.
  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        const value = await tasks[index]();
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  // Start exactly `concurrency` workers (or fewer if there aren't enough tasks).
  const workerCount = Math.min(concurrency, tasks.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
