/* Lo mínimo que se usa de Cloudflare D1, para poder probar con una base simulada o con SQLite en memoria. */
export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  run(): Promise<unknown>;
  all(): Promise<{ results?: unknown[] }>;
}
export interface Db {
  prepare(sql: string): DbStatement;
  batch(statements: DbStatement[]): Promise<unknown>;
}
