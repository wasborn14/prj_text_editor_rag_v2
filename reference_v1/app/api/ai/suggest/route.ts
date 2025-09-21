import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const aiProvider = process.env.AI_PROVIDER || 'mock';

    if (aiProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      const suggestions = await getClaudeSuggestions(content);
      return NextResponse.json(suggestions);
    } else {
      // Fallback to mock suggestions
      const suggestions = generateMockSuggestions(content);
      return NextResponse.json(suggestions);
    }
  } catch (error) {
    console.error('Error in AI suggest API:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

async function getClaudeSuggestions(content: string) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Please improve the following Markdown content. Focus on:
1. Grammar and clarity
2. Better structure and formatting
3. More engaging language
4. Professional tone

Original content:
---
${content}
---

Please respond with ONLY the improved markdown content, no explanations or additional text.`
      }]
    });

    const suggestedContent = message.content[0].type === 'text' ? message.content[0].text : content;

    return {
      suggestedContent,
      summary: 'AI-powered improvements for clarity, grammar, structure, and engagement.',
      changes: [
        'Improved grammar and sentence structure',
        'Enhanced clarity and readability',
        'Better formatting and organization',
        'More professional and engaging tone'
      ]
    };
  } catch (error) {
    console.error('Claude API error:', error);
    // Fallback to mock if API fails
    return generateMockSuggestions(content);
  }
}

function generateMockSuggestions(content: string): any {
  // Simulate processing time
  const lines = content.split('\n');
  const improvedLines = lines.map(line => {
    // Mock improvements
    let improved = line;

    // Improve headings
    if (line.startsWith('#')) {
      improved = line.replace(/^(#+)\s+(.+)$/, (match, hashes, text) => {
        const capitalizedText = text
          .split(' ')
          .map((word: string) => {
            if (word.length > 3) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.toLowerCase();
          })
          .join(' ');
        return `${hashes} ${capitalizedText}`;
      });
    }

    // Add punctuation to list items if missing
    if (line.startsWith('- ') && !line.match(/[.!?]$/)) {
      improved = line + '.';
    }

    // Improve common phrases
    improved = improved
      .replace(/\bvery\s+/gi, '')
      .replace(/\bthing(s)?\b/gi, 'item$1')
      .replace(/\bgood\b/gi, 'excellent')
      .replace(/\bbad\b/gi, 'poor')
      .replace(/\bnice\b/gi, 'pleasant');

    // Fix double spaces
    improved = improved.replace(/\s+/g, ' ');

    return improved;
  });

  // Add some new suggestions
  const suggestedContent = improvedLines.join('\n') + '\n\n## Additional Suggestions\n\n- Consider adding more detailed examples.\n- Include relevant links or references.\n- Add a conclusion section to summarize key points.';

  return {
    suggestedContent,
    summary: 'Improved formatting, fixed capitalization, enhanced word choices, and added suggestions for additional content.',
    changes: [
      'Improved heading capitalization',
      'Added missing punctuation to list items',
      'Replaced weak adjectives with stronger alternatives',
      'Fixed spacing issues',
      'Added suggestions for additional sections'
    ]
  };
}