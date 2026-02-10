import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Sparkles, Loader2, MessageCircleHeart, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { ParsedMessage } from '@/lib/chatParser';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface ChatViewProps {
  sessionId: string;
  importedMessages: ParsedMessage[];
  meName: string;
  otherName: string;
  memorySummary: string;
  styleProfile: string;
  onBack: () => void;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const TONE_CHIPS = [
  { key: 'short', label: '✂️ Short' },
  { key: 'romantic', label: '💕 Romantic' },
  { key: 'flirty', label: '😏 Flirty' },
  { key: 'calm', label: '😌 Calm' },
  { key: 'apologetic', label: '🙏 Sorry' },
  { key: 'formal', label: '👔 Formal' },
];

const ChatView = ({ sessionId, importedMessages, meName, otherName, memorySummary, styleProfile, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hey ${meName}! 👋 I've studied your chat history with ${otherName}. I know your vibe now!\n\nJust tell me what you want to say or what's the situation, and I'll suggest replies that sound like *you*. Pick a tone chip below or just type away! 💬`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTone, setActiveTone] = useState<string>('');
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const buildRecentContext = () => {
    return importedMessages.slice(-30).map(m => {
      const role = m.sender === meName ? 'Me' : otherName;
      return `${role}: ${m.text}`;
    }).join('\n');
  };

  const sendMessage = async (userText?: string, tone?: string) => {
    const text = userText || draft.trim();
    if (!text && !tone) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: tone && !text ? `Give me suggestions in ${tone} tone` : text,
    };
    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-suggest', {
        body: {
          draft: text,
          tone: tone || activeTone || 'calm',
          recentContext: buildRecentContext(),
          memorySummary,
          styleProfile,
          meName,
          otherName,
        },
      });

      if (error) throw new Error(error.message);

      const suggestions = data.suggestions || [];
      const reasoning = data.reasoning || '';

      let reply = suggestions.map((s: string, i: number) => `**Option ${i + 1}:** ${s}`).join('\n\n');
      if (reasoning) reply += `\n\n---\n💡 *${reasoning}*`;

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
      }]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '😵 Something went wrong. Try again?',
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border/50 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
            <MessageCircleHeart className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">PartnerAI</h2>
            <p className="text-[11px] text-muted-foreground">Your reply assistant for {otherName}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-chat-me text-chat-me-foreground rounded-2xl rounded-tr-md'
                    : 'bg-chat-ai text-chat-ai-foreground rounded-2xl rounded-tl-md border border-border/30'
                  }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_strong]:text-primary [&_em]:text-muted-foreground [&_hr]:border-border/30 [&_hr]:my-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-chat-ai border border-border/30 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Crafting replies...</span>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Tone chips */}
      <div className="px-4 py-2 border-t border-border/30 bg-chat-composer">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TONE_CHIPS.map(t => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTone(t.key);
                if (!draft.trim()) sendMessage(undefined, t.key);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                ${activeTone === t.key
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/15'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 py-3 bg-chat-composer border-t border-border/30 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-secondary/60 rounded-2xl px-4 py-2.5 border border-border/30">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to say to them?"
              rows={1}
              className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60 max-h-24"
              style={{ minHeight: '20px' }}
            />
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={!draft.trim() || loading}
            size="icon"
            className="rounded-full shrink-0 gradient-primary border-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
