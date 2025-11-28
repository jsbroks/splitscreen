import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { creatorsRouter } from "./routers/creators";
import { tagsRouter } from "./routers/tags";
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
