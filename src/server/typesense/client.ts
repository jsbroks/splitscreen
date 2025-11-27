import { Client } from "typesense";
import { env } from "~/env";

export const typesense = new Client({
  nodes: [
    {
      host: env.TYPESENSE_HOST ?? "localhost",
      port: Number(env.TYPESENSE_PORT ?? "8108"),
      protocol: "http",
    },
  ],
  apiKey: env.TYPESENSE_API_KEY ?? "secret",
  connectionTimeoutSeconds: 2,
});
