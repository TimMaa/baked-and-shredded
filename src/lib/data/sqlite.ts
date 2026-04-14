import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import {
  APP_DATABASE_NAME,
  APP_DATABASE_UPGRADES,
  APP_DATABASE_VERSION,
} from '$lib/data/sqliteMigrations';

type QueryRow = Record<string, unknown>;

export type DatabaseInitState = 'idle' | 'initializing' | 'ready' | 'error' | 'unsupported';

export type DatabaseRuntimeStatus = {
  state: DatabaseInitState;
  errorMessage: string | null;
  isNativePlatform: boolean;
  platform: string;
};

const sqlite = new SQLiteConnection(CapacitorSQLite);

let connectionPromise: Promise<SQLiteDBConnection | null> | null = null;
let databaseState: DatabaseInitState = 'idle';
let databaseErrorMessage: string | null = null;

export function getDatabaseRuntimeStatus(): DatabaseRuntimeStatus {
  return {
    state: databaseState,
    errorMessage: databaseErrorMessage,
    isNativePlatform: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}

async function createOrRetrieveConnection() {
  await sqlite.addUpgradeStatement(APP_DATABASE_NAME, APP_DATABASE_UPGRADES);

  const consistency = await sqlite.checkConnectionsConsistency();
  const hasConnection = (await sqlite.isConnection(APP_DATABASE_NAME, false)).result === true;

  if (consistency.result && hasConnection) {
    return sqlite.retrieveConnection(APP_DATABASE_NAME, false);
  }

  return sqlite.createConnection(APP_DATABASE_NAME, false, 'no-encryption', APP_DATABASE_VERSION, false);
}

async function openNativeDatabase() {
  const connection = await createOrRetrieveConnection();
  const isOpen = await connection.isDBOpen();

  if (!isOpen.result) {
    await connection.open();
  }

  await connection.execute('PRAGMA foreign_keys = ON;');
  return connection;
}

export async function initializeAppDatabase() {
  if (!Capacitor.isNativePlatform()) {
    databaseState = 'unsupported';
    databaseErrorMessage = null;
    return null;
  }

  if (!connectionPromise) {
    databaseState = 'initializing';
    databaseErrorMessage = null;
    connectionPromise = openNativeDatabase()
      .then((connection) => {
        databaseState = 'ready';
        return connection;
      })
      .catch((error: unknown) => {
        connectionPromise = null;
        databaseState = 'error';
        databaseErrorMessage = error instanceof Error ? error.message : 'Failed to initialize local SQLite database.';
        throw error;
      });
  }

  return connectionPromise;
}

export async function closeAppDatabase() {
  if (!Capacitor.isNativePlatform()) {
    databaseState = 'unsupported';
    return;
  }

  if (!connectionPromise) {
    return;
  }

  const connection = await connectionPromise;
  if (!connection) {
    return;
  }

  const isOpen = await connection.isDBOpen();
  if (isOpen.result) {
    await connection.close();
  }

  await sqlite.closeConnection(APP_DATABASE_NAME, false);
  connectionPromise = null;
  databaseState = 'idle';
  databaseErrorMessage = null;
}

export async function getCurrentDatabaseVersion() {
  const connection = await initializeAppDatabase();

  if (!connection) {
    return null;
  }

  const result = await connection.query('PRAGMA user_version;');
  const firstRow = result.values?.[0] as { user_version?: number } | undefined;
  return typeof firstRow?.user_version === 'number' ? firstRow.user_version : APP_DATABASE_VERSION;
}

export async function getAppDatabase() {
  const connection = await initializeAppDatabase();

  if (!connection) {
    throw new Error('Local SQLite is only available in the Android app runtime.');
  }

  return connection;
}

export async function queryRows<T extends QueryRow>(statement: string, values: unknown[] = []) {
  const connection = await getAppDatabase();
  const result = await connection.query(statement, values as any[]);
  return (result.values ?? []) as T[];
}

export async function queryFirstRow<T extends QueryRow>(statement: string, values: unknown[] = []) {
  const rows = await queryRows<T>(statement, values);
  return rows[0] ?? null;
}

export async function runStatement(statement: string, values: unknown[] = [], returnMode = 'no') {
  const connection = await getAppDatabase();
  return connection.run(statement, values as any[], false, returnMode);
}