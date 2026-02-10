import { supabase } from '@/integrations/supabase/client';
import type { ParsedMessage } from './chatParser';

export type ToneStyle = 'short' | 'long' | 'calm' | 'romantic' | 'apologetic' | 'flirty' | 'formal';

export interface SuggestionRequest {
  draft: string;
  tone?: ToneStyle;
  recentMessages: ParsedMessage[];
  memorySummary: string;
  styleProfile: string;
  meName: string;
  otherName: string;
}

export interface SuggestionResponse {
  suggestions: string[];
  reasoning?: string;
}

export async function getSuggestions(req: SuggestionRequest): Promise<SuggestionResponse> {
  const recentContext = req.recentMessages.slice(-30).map(m => {
    const role = m.sender === req.meName ? 'Me' : req.otherName;
    return `${role}: ${m.text}`;
  }).join('\n');

  const { data, error } = await supabase.functions.invoke('chat-suggest', {
    body: {
      draft: req.draft,
      tone: req.tone || 'calm',
      recentContext,
      memorySummary: req.memorySummary,
      styleProfile: req.styleProfile,
      meName: req.meName,
      otherName: req.otherName,
    },
  });

  if (error) throw new Error(error.message || 'Failed to get suggestions');
  return data as SuggestionResponse;
}

export async function buildMemoryAndStyle(
  messages: ParsedMessage[],
  meName: string,
  otherName: string
): Promise<{ summary: string; styleProfile: string }> {
  const myMessages = messages.filter(m => m.sender === meName);
  const sampleMessages = messages.slice(-200).map(m => {
    const role = m.sender === meName ? 'Me' : otherName;
    return `${role}: ${m.text}`;
  }).join('\n');

  const myTexts = myMessages.slice(-100).map(m => m.text).join('\n');

  const { data, error } = await supabase.functions.invoke('chat-suggest', {
    body: {
      action: 'build-memory',
      sampleMessages,
      myTexts,
      meName,
      otherName,
    },
  });

  if (error) throw new Error(error.message || 'Failed to build memory');
  return data as { summary: string; styleProfile: string };
}
