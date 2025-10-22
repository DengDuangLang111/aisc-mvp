import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface StudyGuideRequest {
  question: string;
  subject?: string;
  currentLevel?: string; // e.g., "high school", "college"
}

export interface StudyGuideResponse {
  explanation: string;
  concepts: string[];
  hints: string[];
  relatedTopics: string[];
}

export async function generateStudyGuide(
  request: StudyGuideRequest
): Promise<StudyGuideResponse> {
  const systemPrompt = `You are an AI study assistant for StudyLock. Your role is to help students understand concepts WITHOUT providing direct answers to their homework questions.

Rules:
1. NEVER solve the problem directly
2. Explain the underlying concepts and methods
3. Provide hints and guide thinking
4. Break down complex problems into steps
5. Encourage independent problem-solving
6. Use analogies and examples from different contexts`;

  const userPrompt = `Subject: ${request.subject || 'General'}
Level: ${request.currentLevel || 'High School'}
Question/Topic: ${request.question}

Please provide a study guide that helps the student understand the concepts needed to solve this, without giving the direct answer.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const response = completion.choices[0].message.content || '';

  // Parse the response (simplified - you may want more sophisticated parsing)
  return {
    explanation: response,
    concepts: extractConcepts(response),
    hints: extractHints(response),
    relatedTopics: extractRelatedTopics(response),
  };
}

export async function generatePracticeQuestions(
  bookmarks: Array<{ question: string; concept?: string; subject?: string }>,
  count: number = 5
): Promise<string[]> {
  const systemPrompt = `You are an AI tutor generating practice questions based on student's difficulty areas. Create similar but not identical questions that test the same concepts.`;

  const bookmarkSummary = bookmarks
    .map((b, i) => `${i + 1}. ${b.concept || 'Unknown concept'}: ${b.question}`)
    .join('\n');

  const userPrompt = `Based on these questions the student found difficult:

${bookmarkSummary}

Generate ${count} new practice questions that test similar concepts but are not identical. Return only the questions, numbered 1-${count}.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 1500,
  });

  const response = completion.choices[0].message.content || '';
  return response
    .split('\n')
    .filter((line) => /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim());
}

// Helper functions to extract structured data from AI response
function extractConcepts(text: string): string[] {
  // Simple extraction - look for concept-related keywords
  const conceptRegex = /(?:concept|topic|principle)s?:\s*([^.\n]+)/gi;
  const matches = Array.from(text.matchAll(conceptRegex));
  return matches.map((m) => m[1].trim()).slice(0, 5);
}

function extractHints(text: string): string[] {
  // Look for hint-related content
  const hintRegex = /(?:hint|tip|remember):\s*([^.\n]+)/gi;
  const matches = Array.from(text.matchAll(hintRegex));
  return matches.map((m) => m[1].trim()).slice(0, 5);
}

function extractRelatedTopics(text: string): string[] {
  // Look for related topics
  const topicRegex = /(?:related|similar|also|see):\s*([^.\n]+)/gi;
  const matches = Array.from(text.matchAll(topicRegex));
  return matches.map((m) => m[1].trim()).slice(0, 5);
}

export { openai };
