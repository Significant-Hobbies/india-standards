import type { Client } from "pg";

export type NamedSqlParameters = Record<string, unknown>;

export function bindNamedParameters(
  sql: string,
  parameters: NamedSqlParameters,
) {
  const positions = new Map<string, number>();
  const names: string[] = [];
  const text = sql.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
    let position = positions.get(name);
    if (position === undefined) {
      if (!Object.hasOwn(parameters, name)) {
        throw new Error(`Missing bound SQL parameter: ${name}.`);
      }
      names.push(name);
      position = names.length;
      positions.set(name, position);
    }
    return `$${position}`;
  });

  return {
    text,
    values: names.map((name) => parameters[name]),
  };
}

export class PgDuckDBConnection {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async runAndReadAll(sql: string, parameters: NamedSqlParameters = {}) {
    const query = bindNamedParameters(sql, parameters);
    const result = await this.client.query(query);
    const rows = result.rows as Record<string, unknown>[];

    return {
      getRowObjectsJson() {
        return rows;
      },
    };
  }
}
