import { NextRequest, NextResponse } from 'next/server';
import { generatePracticeQuestions } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookmarks, count = 5 } = body;

    if (!bookmarks || !Array.isArray(bookmarks) || bookmarks.length === 0) {
      return NextResponse.json(
        { error: 'Bookmarks are required' },
        { status: 400 }
      );
    }

    const questions = await generatePracticeQuestions(bookmarks, count);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating practice test:', error);
    return NextResponse.json(
      { error: 'Failed to generate practice test' },
      { status: 500 }
    );
  }
}
