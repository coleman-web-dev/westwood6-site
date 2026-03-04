import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const FIELD_PROMPTS: Record<string, string> = {
  hero_headline:
    'Write a welcoming, warm headline (max 8 words) for the hero banner of an HOA community landing page. No quotes.',
  hero_subheadline:
    'Write a short, friendly subheadline (1 sentence, max 20 words) for the hero banner. No quotes.',
  about_title:
    'Write a short section title (2-4 words) for the "About" section of an HOA community page. No quotes.',
  about_body:
    'Write 2-3 short paragraphs (total ~80 words) describing this HOA community. Mention the neighborhood feel, what makes it a great place to live, and community values. Keep it warm and genuine, not corporate. No quotes around the whole text.',
  contact_title:
    'Write a short section title (2-4 words) for the "Contact" section. No quotes.',
  contact_body:
    'Write 1-2 sentences of contact section text for an HOA, mentioning availability for questions or concerns. Keep it welcoming. No quotes.',
  board_members_title:
    'Write a short section title (2-4 words) for the board members section. No quotes.',
  amenities_title:
    'Write a short section title (2-4 words) for the amenities section. No quotes.',
  announcements_title:
    'Write a short section title (2-4 words) for the announcements/updates section. No quotes.',
  footer_text:
    'Write a short footer line (max 15 words) including a copyright notice for the current year. No quotes.',
  faq:
    'Generate 3 common FAQ items for an HOA community website. Return as JSON array: [{"question":"...","answer":"..."}]. Questions should cover dues/assessments, amenity reservations, and board meetings. Keep answers concise (1-2 sentences each). Return ONLY valid JSON, no markdown.',
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI generation is not configured. Add ANTHROPIC_API_KEY to your environment variables.' },
      { status: 503 },
    );
  }

  let body: { field: string; communityName: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { field, communityName } = body;

  if (!field || !communityName) {
    return NextResponse.json(
      { error: 'Missing field or communityName' },
      { status: 400 },
    );
  }

  const fieldPrompt = FIELD_PROMPTS[field];
  if (!fieldPrompt) {
    return NextResponse.json(
      { error: `Unknown field: ${field}` },
      { status: 400 },
    );
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Community name: "${communityName}"\n\n${fieldPrompt}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const text = textBlock ? textBlock.text.trim() : '';

    return NextResponse.json({ text });
  } catch (err) {
    console.error('AI generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate content. Please try again.' },
      { status: 500 },
    );
  }
}
