/**
 * Utilities for parsing AI responses and detecting markdown content
 */

export interface ParsedAIResponse {
  hasMarkdownContent: boolean;
  extractedMarkdown: string | null;
  originalResponse: string;
}

/**
 * Parses AI response to detect and extract markdown content
 */
export function parseAIResponse(response: string): ParsedAIResponse {
  const originalResponse = response;

  // Check for markdown code blocks
  const markdownBlockRegex = /```markdown\n([\s\S]*?)```/g;
  const markdownMatch = markdownBlockRegex.exec(response);

  if (markdownMatch) {
    return {
      hasMarkdownContent: true,
      extractedMarkdown: markdownMatch[1].trim(),
      originalResponse
    };
  }

  // Check for generic code blocks that might contain markdown
  const codeBlockRegex = /```\n([\s\S]*?)```/g;
  const codeMatch = codeBlockRegex.exec(response);

  if (codeMatch) {
    const content = codeMatch[1].trim();
    // Simple heuristic: if it starts with # or contains markdown-like syntax
    if (isLikelyMarkdown(content)) {
      return {
        hasMarkdownContent: true,
        extractedMarkdown: content,
        originalResponse
      };
    }
  }

  // Check if the entire response looks like markdown content
  if (isLikelyMarkdown(response) && !response.toLowerCase().includes('i suggest') && !response.toLowerCase().includes('here is')) {
    return {
      hasMarkdownContent: true,
      extractedMarkdown: response.trim(),
      originalResponse
    };
  }

  return {
    hasMarkdownContent: false,
    extractedMarkdown: null,
    originalResponse
  };
}

/**
 * Heuristic to determine if text looks like markdown content
 */
function isLikelyMarkdown(text: string): boolean {
  const markdownIndicators = [
    /^#+\s/m,           // Headers
    /^\s*[-*+]\s/m,     // Bullet lists
    /^\s*\d+\.\s/m,     // Numbered lists
    /\*\*.*\*\*/,       // Bold text
    /\*.*\*/,           // Italic text
    /`.*`/,             // Inline code
    /^\s*>/m,           // Blockquotes
    /^\s*\|.*\|/m,      // Tables
  ];

  return markdownIndicators.some(regex => regex.test(text));
}

/**
 * Extracts the first markdown content found in AI response
 */
export function extractFirstMarkdown(response: string): string | null {
  const parsed = parseAIResponse(response);
  return parsed.extractedMarkdown;
}

/**
 * Checks if AI response suggests content editing
 */
export function isEditSuggestion(response: string): boolean {
  const editKeywords = [
    'edit', 'change', 'modify', 'replace', 'update', 'improve',
    'rewrite', 'revise', 'fix', 'correct', 'enhance'
  ];

  const lowerResponse = response.toLowerCase();
  return editKeywords.some(keyword => lowerResponse.includes(keyword)) &&
         parseAIResponse(response).hasMarkdownContent;
}