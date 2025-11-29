import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./server/db";
import { typesense } from "./server/typesense/client";
import { schemas } from "./server/typesense/schemas";

const migrationsFolder = "./drizzle";

const dbMigrations = async () => {
  console.log("* Running db migration script...");
  console.log("Migrations folder", migrationsFolder);
  const migrations = readMigrationFiles({ migrationsFolder });
  console.log("Migrations count", migrations.length);
  await drizzleMigrate(db, { migrationsFolder });
  console.log("Migration scripts finished\n");
};

const typesenseMigrations = async () => {
  for (const schema of schemas) {
    try {
      await typesense.collections().create(schema);
      console.log("Created collection", schema.name);
      // biome-ignore lint/suspicious/noExplicitAny: idk why biome is complaining about this
    } catch (error: any) {
      if (error.name !== "ObjectAlreadyExists") {
        console.error(
          "Error creating collection",
          error.name,
          schema.name,
          error,
        );
      }
    }
  }
  // if (env.OPENAI_API_KEY != null) {
  //   await createNLSearchModel({
  //     id: "gpt-4o-base",
  //     model_name: "openai/gpt-4o",
  //     api_key: env.OPENAI_API_KEY,
  //     max_bytes: 1024 * 1024 * 10,
  //     temperature: 0.1,
  //   });
  // }
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.NODE_ENV === "production") {
    await dbMigrations();
  }

  await typesenseMigrations();
}
