import { pgTable, text } from "drizzle-orm/pg-core";

export const star = pgTable("star", {
  id: text("id").primaryKey(),
  aliases: text("aliases").array().notNull(),
  name: text("name").notNull(),
  image: text("image"),
});

export const modelLinks = pgTable("star_link", {
  id: text("id").primaryKey(),
  starId: text("star_id")
    .references(() => star.id, { onDelete: "cascade" })
    .notNull(),
  link: text("link").notNull(),
});
