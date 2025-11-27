import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./server/db";

const migrationsFolder = "./drizzle";

const dbMigrations = async () => {
  console.log("* Running db migration script...");
  console.log("Migrations folder", migrationsFolder);
  const migrations = readMigrationFiles({ migrationsFolder });
  console.log("Migrations count", migrations.length);
  await drizzleMigrate(db, { migrationsFolder });
  console.log("Migration scripts finished\n");
};

const typesenseMigrations = async () => {};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.NODE_ENV === "production") {
    await dbMigrations();
  }

  await typesenseMigrations();
}
