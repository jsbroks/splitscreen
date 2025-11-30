import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { adminRouter } from "./routers/admin";
import { creatorsRouter } from "./routers/creators";
import { tagsRouter } from "./routers/tags";
import { transcodeQueueRouter } from "./routers/transcode-queue";
import { typesenseRouter } from "./routers/typesense";
import { usersRouter } from "./routers/users";
import { videosRouter } from "./routers/videos";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  videos: videosRouter,
  creators: creatorsRouter,
  tags: tagsRouter,
  users: usersRouter,
  typesense: typesenseRouter,
  admin: adminRouter,
  transcodeQueue: transcodeQueueRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
