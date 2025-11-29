import { relations } from "drizzle-orm";
import { date, pgTable, text } from "drizzle-orm/pg-core";
import { videoCreator } from "./videos";

export const creator = pgTable("creator", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  aliases: text("aliases").array().notNull(),
  image: text("image"),
  birthday: date("birthday"),
});

export const creatorLinks = pgTable("creator_link", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .references(() => creator.id, { onDelete: "cascade" })
    .notNull(),
  link: text("link").notNull(),
});

export const creatorRelations = relations(creator, ({ many }) => ({
  links: many(creatorLinks),
  videos: many(videoCreator),
}));

export const creatorLinksRelations = relations(creatorLinks, ({ one }) => ({
  creator: one(creator, {
    fields: [creatorLinks.creatorId],
    references: [creator.id],
  }),
}));
