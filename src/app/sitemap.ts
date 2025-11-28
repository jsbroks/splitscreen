import type { MetadataRoute } from "next";
import { db, desc, eq } from "~/server/db";
import * as schema from "~/server/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitscreen.com";

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/upload`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Legal pages
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/dmca`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/guidelines`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Get all approved videos
  const videos = await db
    .select({
      id: schema.video.id,
      updatedAt: schema.video.updatedAt,
    })
    .from(schema.video)
    .where(eq(schema.video.status, "approved"))
    .orderBy(desc(schema.video.createdAt))
    .limit(5000); // Limit to prevent extremely large sitemaps

  const videoRoutes: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${baseUrl}/video/${video.id}`,
    lastModified: video.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Get all creators
  const creators = await db
    .select({
      username: schema.creator.username,
    })
    .from(schema.creator)
    .limit(1000); // Limit to prevent extremely large sitemaps

  const creatorRoutes: MetadataRoute.Sitemap = creators.map((creator) => ({
    url: `${baseUrl}/creator/${creator.username}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...videoRoutes, ...creatorRoutes];
}
