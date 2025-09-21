import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  currentContent: string;
  conversationHistory: Message[];
}

export async function POST(request: NextRequest) {
  try {
    const { message, currentContent, conversationHistory }: ChatRequest = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const provider = process.env.AI_PROVIDER || 'mock';

    let response: string;
    let suggestedEdit: string | null = null;

    switch (provider) {
      case 'anthropic':
        response = await getAnthropicResponse(message, currentContent, conversationHistory);
        break;
      case 'openai':
        response = await getOpenAIResponse(message, currentContent, conversationHistory);
        break;
      case 'google':
        response = await getGoogleResponse(message, currentContent, conversationHistory);
        break;
      default:
        response = getMockResponse(message, currentContent);
    }

    // Check if response suggests an edit
    if (response.toLowerCase().includes('edit') ||
        response.toLowerCase().includes('change') ||
        response.toLowerCase().includes('modify') ||
        response.toLowerCase().includes('replace')) {
      suggestedEdit = response;
    }

    return NextResponse.json({
      response,
      suggestedEdit,
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

async function getAnthropicResponse(message: string, currentContent: string, history: Message[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return getMockResponse(message, currentContent);
  }

  try {
    const systemPrompt = `You are an AI assistant helping with markdown content editing.
Current document content:
\`\`\`markdown
${currentContent}
\`\`\`

You can help users:
1. Edit and improve their content
2. Answer questions about their document
3. Suggest structural changes
4. Fix grammar and style issues

When suggesting edits, be specific and actionable. If the user asks for edits, provide clear instructions on what should be changed.`;

    const messages = [
      ...history.map(h => ({
        role: h.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: h.content
      })),
      { role: 'user' as const, content: message }
    ];

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages
    });

    return response.content[0].type === 'text' ? response.content[0].text : getMockResponse(message, currentContent);
  } catch (error) {
    console.error('Anthropic API error:', error);
    return getMockResponse(message, currentContent);
  }
}

async function getOpenAIResponse(message: string, currentContent: string, history: Message[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getMockResponse(message, currentContent);
  }

  try {
    const systemMessage = `You are an AI assistant helping with markdown content editing.
Current document content:
\`\`\`markdown
${currentContent}
\`\`\`

You can help users edit and improve their content, answer questions, and suggest changes.`;

    const messages = [
      { role: 'system', content: systemMessage },
      ...history.map(h => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return getMockResponse(message, currentContent);
  }
}

async function getGoogleResponse(message: string, currentContent: string, history: Message[]): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return getMockResponse(message, currentContent);
  }

  try {
    const prompt = `You are an AI assistant helping with markdown content editing.
Current document content:
\`\`\`markdown
${currentContent}
\`\`\`

Conversation history:
${history.map(h => `${h.sender}: ${h.content}`).join('\n')}

User: ${message}

Please respond helpfully to assist with editing and improving their content.`;

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
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Google AI API error:', error);
    return getMockResponse(message, currentContent);
  }
}

function getMockResponse(message: string, currentContent: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('edit') || lowerMessage.includes('change') || lowerMessage.includes('improve')) {
    return `I'd be happy to help edit your content! Based on your current document, I suggest:

1. Adding more descriptive headings
2. Including examples where relevant
3. Improving the flow between sections

Would you like me to apply these changes to your document?`;
  }

  if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
    const lines = currentContent.split('\n').filter(line => line.trim());
    const wordCount = currentContent.split(' ').length;
    return `Your document contains ${lines.length} lines and approximately ${wordCount} words. It appears to be about AI-powered markdown editing with features like real-time preview and AI assistance.`;
  }

  if (lowerMessage.includes('question') || lowerMessage.includes('?')) {
    return "I'm here to help with your markdown content! You can ask me to edit, improve, or answer questions about your document. What would you like me to help with?";
  }

  return `Thanks for your message! I can help you edit and improve your markdown content. Try asking me to:
- "Improve this section"
- "Make it more professional"
- "Add more examples"
- "Fix grammar and style"

What would you like me to help with?`;
}