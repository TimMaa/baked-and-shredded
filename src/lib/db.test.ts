import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Matches the DB_NAME constant in ./db.
const DB_NAME = "baked-and-shredded";

async function loadDb() {
  // db.ts memoizes its IndexedDB connection in a module-level singleton
  // (`dbPromise`). Reset the module registry so each test gets a fresh
  // singleton, paired with deleting the underlying fake-indexeddb database
  // in afterEach so tests don't see state left behind by earlier tests.
  vi.resetModules();
  return import("./db");
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error as Error);
    req.onblocked = () => resolve();
  });
}

let db: Awaited<ReturnType<typeof loadDb>>;

beforeEach(async () => {
  db = await loadDb();
});

afterEach(async () => {
  const conn = await db.getDb();
  conn.close();
  await deleteDatabase();
});

describe("createSession", () => {
  it("does not create a second Active Session for the same workout", async () => {
    const first = await db.createSession(1, 10);
    expect(first.status).toBe("created");

    const second = await db.createSession(1, 10);
    expect(second.status).toBe("conflict");
    if (second.status !== "conflict") throw new Error("expected conflict");
    expect(second.session.workoutId).toBe(1);
    expect(second.session.totalSetsPlanned).toBe(10);
    expect(second.session.completedAt).toBeNull();

    const all = await db.getAllSessions();
    expect(all).toHaveLength(1);
  });

  it("does not create a second Active Session for a different workout", async () => {
    const first = await db.createSession(1, 10);
    if (first.status !== "created") throw new Error("expected created");

    const second = await db.createSession(2, 5);
    expect(second.status).toBe("conflict");
    if (second.status !== "conflict") throw new Error("expected conflict");
    expect(second.session.id).toBe(first.sessionId);
    expect(second.session.workoutId).toBe(1);

    const all = await db.getAllSessions();
    expect(all).toHaveLength(1);
    expect(all[0].workoutId).toBe(1);
  });

  it("allows starting a new session once the Active Session completes", async () => {
    const first = await db.createSession(1, 10);
    if (first.status !== "created") throw new Error("expected created");
    await db.completeSession(first.sessionId, 10);

    const second = await db.createSession(2, 5);
    expect(second.status).toBe("created");

    const all = await db.getAllSessions();
    expect(all).toHaveLength(2);
  });
});
