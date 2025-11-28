import { createTRPCRouter } from "../../trpc";
import { videoInteractionsRouter } from "./interactions";
import { videoModerationRouter } from "./moderation";
import { videoMutationsRouter } from "./mutations";
import { videoQueriesRouter } from "./queries";

/**
 * Combined videos router
 * Exports all video-related procedures from sub-routers
 */
export const videosRouter = createTRPCRouter({
  ...videoInteractionsRouter._def.procedures,
  ...videoQueriesRouter._def.procedures,
  ...videoMutationsRouter._def.procedures,
  ...videoModerationRouter._def.procedures,
});
