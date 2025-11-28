import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),

    DATABASE_URL: z.string().url(),

    // S3/MinIO server-side configuration
    S3_ENDPOINT: z.string().optional(),
    S3_PUBLIC_URL_BASE: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    TYPESENSE_API_KEY: z.string().optional(),
    TYPESENSE_HOST: z.string().optional(),
    TYPESENSE_PORT: z.string().optional(),
    TYPESENSE_PROTOCOL: z.enum(["http", "https"]).optional(),

    INTERNAL_API_KEY: z.string().default("secret"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    S3_PUBLIC_URL_BASE: process.env.S3_PUBLIC_URL_BASE,

    NODE_ENV: process.env.NODE_ENV,

    TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY,
    TYPESENSE_HOST: process.env.TYPESENSE_HOST,
    TYPESENSE_PORT: process.env.TYPESENSE_PORT,
    TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL,

    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
