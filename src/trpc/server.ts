import "server-only";

import { headers } from "next/headers";
import { createHydrationHelpers } from "node_modules/.pnpm/@trpc+react-query@11.7.2_@tanstack+react-query@5.90.10_react@19.2.0__@trpc+client@11.7._4c8c2afb40f1bad63fcfbe2029c1f10e/node_modules/@trpc/react-query/dist/rsc";
import { cache } from "react";

import { type AppRouter, createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
