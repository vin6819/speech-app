import { PrismaClient } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

enum Role {
  therapist = "therapist",
  patient = "patient",
}

const prisma = new PrismaClient();

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: Role.therapist,
        },
      },
    });

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
