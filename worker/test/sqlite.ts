/* Ayuda para las pruebas: una base SQLite en memoria con la misma forma que usa el servidor de D1.
   Ejecuta de verdad el SQL de db/schema.sql y el de cada consulta. */
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { Db } from "../src/db.ts";

export function sqliteDb(): { db: Db; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  const statement = (sql: string, args: any[] = []): any => ({
    bind: (...v: unknown[]) => statement(sql, v),
    run: async () => ({ meta: { changes: Number(raw.prepare(sql).run(...args).changes) } }),
    all: async () => ({ results: raw.prepare(sql).all(...args) }),
  });
  const db: Db = {
    prepare: (sql: string) => statement(sql),
    batch: async (list: any[]) => { for (const s of list) await s.run(); return []; },
  };
  return { db, raw };
}
