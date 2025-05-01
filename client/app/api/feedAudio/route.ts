import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { user_audio_base64, reference_audio_base64, language, user_email } = await req.json();

    if (!user_email || !user_audio_base64 || !reference_audio_base64) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: user_email },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { email: user_email },
      data: {
        recordedAudios: {
          push: user_audio_base64,
        },
        actualAudios: {
          push: reference_audio_base64,
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Audio data saved successfully' });
  } catch (error) {
    console.error('Feed audio error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
