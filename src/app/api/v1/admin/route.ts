import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";

const makeAdminSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");

    if (!env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "API key authentication is not configured on the server" },
        { status: 500 },
      );
    }

    if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { username } = makeAdminSchema.parse(body);

    // Find user by username
    const user = await db.query.user.findFirst({
      where: eq(schema.user.username, username),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", username },
        { status: 404 },
      );
    }

    // Check if user is already an admin
    if (user.isAdmin) {
      return NextResponse.json({
        message: "User is already an admin",
        userId: user.id,
        username: user.username,
        isAdmin: true,
      });
    }

    // Update user to admin
    await db
      .update(schema.user)
      .set({ isAdmin: true })
      .where(eq(schema.user.id, user.id));

    return NextResponse.json({
      message: "User successfully made admin",
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error making user admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
