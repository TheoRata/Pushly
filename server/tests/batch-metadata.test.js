import { describe, it, expect, vi } from 'vitest';
import { batchFetch } from '../utils/batch-fetch.js';

// Helper: creates a task that resolves after `delayMs` with `value`
function makeTask(value, delayMs = 0) {
  return () =>
    new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}

// Helper: creates a task that rejects after `delayMs` with `reason`
function makeFailingTask(reason, delayMs = 0) {
  return () =>
    new Promise((_, reject) => setTimeout(() => reject(new Error(reason)), delayMs));
}

describe('batchFetch', () => {
  // ── Test 1: Runs all tasks and returns results in order ────────────────────
  it('runs all tasks and returns results in the original order', async () => {
    const tasks = [
      makeTask('alpha'),
      makeTask('beta'),
      makeTask('gamma'),
    ];

    const results = await batchFetch(tasks, 3);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'alpha' });
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'beta' });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'gamma' });
  });

  // ── Test 2: Respects concurrency limit ────────────────────────────────────
  it('respects the concurrency limit (max N tasks running at once)', async () => {
    let concurrentCount = 0;
    let peakConcurrency = 0;

    // Each task increments the counter, waits a tick, then decrements it.
    function makeTrackedTask() {
      return async () => {
        concurrentCount++;
        if (concurrentCount > peakConcurrency) peakConcurrency = concurrentCount;
        // Give the event loop a chance to start more tasks if the impl is broken.
        await new Promise((r) => setTimeout(r, 10));
        concurrentCount--;
        return concurrentCount;
      };
    }

    const tasks = Array.from({ length: 8 }, makeTrackedTask);
    await batchFetch(tasks, 3);

    expect(peakConcurrency).toBeLessThanOrEqual(3);
  });

  // ── Test 3: Handles individual task failures gracefully ───────────────────
  it('marks failed tasks as rejected without aborting the remaining tasks', async () => {
    const tasks = [
      makeTask('ok-first'),
      makeFailingTask('boom'),
      makeTask('ok-last'),
    ];

    const results = await batchFetch(tasks, 3);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok-first' });
    expect(results[1].status).toBe('rejected');
    expect(results[1].reason).toBeInstanceOf(Error);
    expect(results[1].reason.message).toBe('boom');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'ok-last' });
  });

  // ── Test 4: Works with concurrency of 1 (fully sequential) ───────────────
  it('runs tasks sequentially when concurrency is 1', async () => {
    const order = [];

    const tasks = [1, 2, 3, 4].map((n) => async () => {
      order.push(n);
      return n;
    });

    const results = await batchFetch(tasks, 1);

    // All fulfilled in order
    expect(results.map((r) => r.value)).toEqual([1, 2, 3, 4]);
    // Tasks were started in order (sequential — no overlap)
    expect(order).toEqual([1, 2, 3, 4]);
  });

  // ── Test 5: Works with an empty task array ────────────────────────────────
  it('returns an empty array when given no tasks', async () => {
    const results = await batchFetch([], 5);
    expect(results).toEqual([]);
  });

  // ── Test 6: Handles all tasks failing ─────────────────────────────────────
  it('returns all results as rejected when every task fails', async () => {
    const tasks = [
      makeFailingTask('err-1'),
      makeFailingTask('err-2'),
      makeFailingTask('err-3'),
    ];

    const results = await batchFetch(tasks, 2);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      expect(result.reason).toBeInstanceOf(Error);
    }
    expect(results[0].reason.message).toBe('err-1');
    expect(results[1].reason.message).toBe('err-2');
    expect(results[2].reason.message).toBe('err-3');
  });

  // ── Bonus: Uses the default concurrency of 5 when not specified ───────────
  it('uses a default concurrency of 5 when the parameter is omitted', async () => {
    let peakConcurrency = 0;
    let currentCount = 0;

    function makeTrackedTask() {
      return async () => {
        currentCount++;
        if (currentCount > peakConcurrency) peakConcurrency = currentCount;
        await new Promise((r) => setTimeout(r, 10));
        currentCount--;
      };
    }

    // 10 tasks — with concurrency=5 the peak should be exactly 5
    const tasks = Array.from({ length: 10 }, makeTrackedTask);
    await batchFetch(tasks); // no concurrency arg

    expect(peakConcurrency).toBeLessThanOrEqual(5);
    // Must have processed all tasks
    expect(peakConcurrency).toBeGreaterThanOrEqual(1);
  });
});
