// constants
const ORDER_KEY = "globalOrderNumber";
const ORDER_LOCK_KEY = "globalOrderLock";
const ORDER_START = 115;

/**
 * Simple synchronous incrementer.
 * First call (when localStorage key missing or invalid) returns 300.
 * Next call returns 301, then 302, ...
 */
export function getNextOrderNumber() {
  const raw = localStorage.getItem(ORDER_KEY);
  let next;
  if (!raw || isNaN(parseInt(raw, 10))) {
    next = ORDER_START;
  } else {
    next = parseInt(raw, 10) + 1;
  }
  localStorage.setItem(ORDER_KEY, String(next));
  // 🔹 Create mirrored number
  const reversed = next.toString().split("").reverse().join("");
  const mirrored = reversed + next;

  return mirrored; // now returns mirrored form
  }

/**
 * Optional: try to acquire a short lock to reduce collisions across tabs.
 * This is best-effort (localStorage isn't truly atomic), but helps.
 * Usage: const orderNumber = await getNextOrderNumberWithLock();
 */
export async function getNextOrderNumberWithLock(retries = 6, waitMs = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const now = Date.now();
      const lockId = `${now}_${Math.random()}`;
      const lockRaw = localStorage.getItem(ORDER_LOCK_KEY);

      if (!lockRaw) {
        // try to take lock
        localStorage.setItem(
          ORDER_LOCK_KEY,
          JSON.stringify({ owner: lockId, ts: now })
        );
        // verify we actually own it
        const check = JSON.parse(localStorage.getItem(ORDER_LOCK_KEY) || "{}");
        if (check.owner === lockId) {
          // got lock -> increment safely
          try {
            const num = getNextOrderNumber();
            return num;
          } finally {
            localStorage.removeItem(ORDER_LOCK_KEY);
          }
        }
      } else {
        // if lock is old, steal it
        const parsed = JSON.parse(lockRaw);
        if (now - (parsed.ts || 0) > 3000) {
          // expired -> overwrite
          localStorage.setItem(
            ORDER_LOCK_KEY,
            JSON.stringify({ owner: lockId, ts: now })
          );
          const check = JSON.parse(localStorage.getItem(ORDER_LOCK_KEY) || "{}");
          if (check.owner === lockId) {
            try {
              const num = getNextOrderNumber();
              return num;
            } finally {
              localStorage.removeItem(ORDER_LOCK_KEY);
            }
          }
        }
      }
    } catch (e) {
      // ignore and retry
      console.warn("order lock attempt failed", e);
    }

    // wait before retry
    await new Promise((r) => setTimeout(r, waitMs));
  }

  // fallback: if all lock attempts failed, just increment without lock
  return getNextOrderNumber();
}
