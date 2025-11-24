import { createTRPCRouter, publicProcedure } from "../trpc";

export const videosRouter = createTRPCRouter({
  getLatest: publicProcedure.query(async () => {
    return [];
  }),
});
