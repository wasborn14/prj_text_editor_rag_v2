import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ApplyEditRequest {
  originalContent: string;
  editInstructions: string;
}

export async function POST(request: NextRequest) {
  try {
    const { originalContent, editInstructions }: ApplyEditRequest = await request.json();

    if (!originalContent || !editInstructions) {
      return NextResponse.json(
        { error: 'Original content and edit instructions are required' },
        { status: 400 }
      );
    }

    const provider = process.env.AI_PROVIDER || 'mock';

    let editedContent: string;

    switch (provider) {
      case 'anthropic':
        editedContent = await getAnthropicEdit(originalContent, editInstructions);
        break;
      case 'openai':
        editedContent = await getOpenAIEdit(originalContent, editInstructions);
        break;
      case 'google':
        editedContent = await getGoogleEdit(originalContent, editInstructions);
        break;
      default:
        editedContent = getMockEdit(originalContent, editInstructions);
    }

    return NextResponse.json({
      editedContent,
    });

  } catch (error) {
    console.error('Error in apply-edit API:', error);
    return NextResponse.json(
      { error: 'Failed to apply edit' },
      { status: 500 }
    );
  }
}

async function getAnthropicEdit(originalContent: string, editInstructions: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return getMockEdit(originalContent, editInstructions);
  }

  try {
    const prompt = `Please apply the following edit instructions to the given markdown content. Return only the edited markdown content, with no additional explanation or formatting.

Original content:
\`\`\`markdown
${originalContent}
\`\`\`

Edit instructions: ${editInstructions}

Edited content:`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : originalContent;
    return cleanEditedContent(content);
  } catch (error) {
    console.error('Anthropic API error:', error);
    return getMockEdit(originalContent, editInstructions);
  }
}

async function getOpenAIEdit(originalContent: string, editInstructions: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getMockEdit(originalContent, editInstructions);
  }

  try {
    const prompt = `Apply the following edit instructions to the markdown content. Return only the edited content:

Original content:
\`\`\`markdown
${originalContent}
\`\`\`

Edit instructions: ${editInstructions}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return cleanEditedContent(data.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return getMockEdit(originalContent, editInstructions);
  }
}

async function getGoogleEdit(originalContent: string, editInstructions: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return getMockEdit(originalContent, editInstructions);
  }

  try {
    const prompt = `Apply these edit instructions to the markdown content and return only the edited content:

Original:
${originalContent}

Instructions: ${editInstructions}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    return cleanEditedContent(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('Google AI API error:', error);
    return getMockEdit(originalContent, editInstructions);
  }
}

function getMockEdit(originalContent: string, editInstructions: string): string {
  // Simple mock edit that adds a note about the requested edit
  const lines = originalContent.split('\n');
  const editNote = `\n> **Note**: Applied edit - ${editInstructions}\n`;

  // Insert the note after the first heading if found, otherwise at the beginning
  const firstHeadingIndex = lines.findIndex(line => line.startsWith('#'));
  if (firstHeadingIndex >= 0) {
    lines.splice(firstHeadingIndex + 1, 0, editNote);
  } else {
    lines.unshift(editNote);
  }

  return lines.join('\n');
}

function cleanEditedContent(content: string): string {
  // Remove markdown code blocks if they wrap the entire content
  const codeBlockRegex = /^```markdown\n([\s\S]*)\n```$/;
  const match = content.match(codeBlockRegex);
  if (match) {
    return match[1].trim();
  }

  // Remove other common wrapper patterns
  const cleanContent = content
    .replace(/^```\n([\s\S]*)\n```$/, '$1')
    .replace(/^```markdown\n([\s\S]*)```$/, '$1')
    .trim();

  return cleanContent;
}