import { NextRequest, NextResponse } from 'next/server';
import { generateStudyGuide } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, subject, currentLevel } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    const studyGuide = await generateStudyGuide({
      question,
      subject,
      currentLevel,
    });

    return NextResponse.json(studyGuide);
  } catch (error) {
    console.error('Error generating study guide:', error);
    return NextResponse.json(
      { error: 'Failed to generate study guide' },
      { status: 500 }
    );
  }
}
