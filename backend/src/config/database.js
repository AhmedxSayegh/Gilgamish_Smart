import mysql from "mysql2/promise";
export function createDatabase(config) {
  return mysql.createPool({
    ...config.db,
    connectionLimit: 8,
    dateStrings: true,
    timezone: "Z",
    charset: "utf8mb4",
    multipleStatements: false,
  });
}
