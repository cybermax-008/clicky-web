import type { ConversationEntry, ScreenshotResult } from './types';

/**
 * Claude API client with SSE streaming support.
 * Port of ClaudeAPI.swift — uses fetch() with ReadableStream instead of URLSession.
 */

interface ChatRequestOptions {
  workerUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  screenshot: ScreenshotResult;
  userPrompt: string;
  conversationHistory: ConversationEntry[];
}

/**
 * Sends a screenshot + prompt to Claude via the Worker proxy and streams
 * the response text. Returns the full accumulated response text.
 */
export async function streamChatRequest(
  options: ChatRequestOptions,
  onTextChunk?: (accumulatedText: string) => void,
): Promise<string> {
  const { workerUrl, apiKey, model, systemPrompt, screenshot, userPrompt, conversationHistory } = options;

  // Build the messages array with conversation history
  const messages: Array<{ role: string; content: any }> = [];

  // Add conversation history (text only — no screenshots in history)
  for (const entry of conversationHistory) {
    messages.push({ role: 'user', content: entry.userMessage });
    messages.push({ role: 'assistant', content: entry.assistantResponse });
  }

  // Build the current message with screenshot + text
  const screenshotLabel = `screenshot of the current page (image dimensions: ${screenshot.width}x${screenshot.height} pixels)`;
  messages.push({
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: screenshot.mediaType,
          data: screenshot.base64Data,
        },
      },
      {
        type: 'text',
        text: screenshotLabel,
      },
      {
        type: 'text',
        text: userPrompt,
      },
    ],
  });

  const requestBody = {
    model,
    max_tokens: 1024,
    stream: true,
    system: systemPrompt,
    messages,
  };

  const response = await fetch(`${workerUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Clicky-API-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body — streaming not supported');
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const jsonString = line.slice(6);
      if (jsonString === '[DONE]') {
        return accumulatedText;
      }

      try {
        const event = JSON.parse(jsonString);
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta' &&
          event.delta?.text
        ) {
          accumulatedText += event.delta.text;
          onTextChunk?.(accumulatedText);
        }
      } catch {
        // Invalid JSON line — skip
      }
    }
  }

  return accumulatedText;
}
