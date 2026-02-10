import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { streamPartnerReply, fetchReplySuggestions } from '@/lib/aiService';
import type { ParsedMessage } from '@/lib/chatParser';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ChatViewProps {
  sessionId: string;
  importedMessages: ParsedMessage[];
  meName: string;
  otherName: string;
  memorySummary: string;
  partnerStyle: string;
  onBack: () => void;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TYPING_DELAY_MIN = 800;
const TYPING_DELAY_MAX = 2500;

function randomDelay() {
  return TYPING_DELAY_MIN + Math.random() * (TYPING_DELAY_MAX - TYPING_DELAY_MIN);
}

const ChatView = ({ sessionId, importedMessages, meName, otherName, memorySummary, partnerStyle, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const buildRecentContext = useCallback(() => {
    return importedMessages.slice(-40).map(m => {
      const role = m.sender === meName ? meName : otherName;
      return `${role}: ${m.text}`;
    }).join('\n');
  }, [importedMessages, meName, otherName]);

  // Fetch suggestions after AI reply
  const loadSuggestions = useCallback(async (lastAiMessage: string) => {
    const replies = await fetchReplySuggestions(lastAiMessage, memorySummary, partnerStyle, meName, otherName);
    setSuggestions(replies.slice(0, 3));
  }, [memorySummary, partnerStyle, meName, otherName]);

  const sendMessage = async (text?: string) => {
    const msgText = (text || draft).trim();
    if (!msgText || loading) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msgText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    setSuggestions([]);
    setLoading(true);
    setTyping(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    const chatHistory = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Realistic typing delay before showing response
    await new Promise(r => setTimeout(r, randomDelay()));

    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      await streamPartnerReply({
        message: msgText,
        chatHistory: chatHistory.slice(-20),
        recentContext: buildRecentContext(),
        memorySummary,
        partnerStyle,
        meName,
        otherName,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setTyping(false);
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
          );
        },
        onDone: () => {
          setLoading(false);
          setTyping(false);
          if (assistantContent) loadSuggestions(assistantContent);
        },
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: '😢 try again?' } : m)
      );
      setLoading(false);
      setTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const initial = otherName.charAt(0).toUpperCase();

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-lg mx-auto">
      {/* WhatsApp-style Header */}
      <div className="flex items-center gap-2 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-card border-b border-border/30 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0 text-sm font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="flex-1 min-w-0 ml-1">
          <h2 className="text-sm font-semibold truncate">{otherName}</h2>
          <p className="text-[11px] text-muted-foreground">
            {typing ? 'typing...' : 'online'}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.04) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.03) 0%, transparent 50%)`,
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {initial}
            </div>
            <p className="text-sm text-muted-foreground">
              Say something to <span className="text-primary font-semibold">{otherName}</span> 💕
            </p>
            <p className="text-[11px] text-muted-foreground/60">They'll text back just like the real thing</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isMe = msg.role === 'user';
            const showTime = i === 0 || 
              (msg.timestamp.getTime() - messages[i-1].timestamp.getTime()) > 300000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="flex justify-center my-2">
                    <span className="px-3 py-0.5 rounded-full bg-muted/60 text-[10px] text-muted-foreground">
                      {format(msg.timestamp, 'h:mm a')}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-0.5`}
                >
                  <div
                    className={`max-w-[78%] px-3 py-1.5 text-[14px] leading-relaxed relative
                      ${isMe
                        ? 'bg-chat-me text-chat-me-foreground rounded-xl rounded-br-sm'
                        : 'bg-chat-ai text-chat-ai-foreground rounded-xl rounded-bl-sm border border-border/15'
                      }`}
                  >
                    {/* Partner name label */}
                    {!isMe && (i === 0 || messages[i-1]?.role === 'user') && (
                      <p className="text-[11px] font-semibold text-primary mb-0.5">{otherName}</p>
                    )}
                    <div className="flex items-end gap-2">
                      <p className="whitespace-pre-wrap break-words flex-1">{msg.content || '\u00A0'}</p>
                      {msg.content && (
                        <span className={`text-[10px] shrink-0 leading-none pb-0.5 ${isMe ? 'text-chat-me-foreground/35' : 'text-chat-ai-foreground/35'}`}>
                          {format(msg.timestamp, 'h:mm')}
                          {isMe && <span className="ml-0.5">✓✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-0.5"
          >
            <div className="bg-chat-ai border border-border/15 rounded-xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Reply Suggestions */}
      {suggestions.length > 0 && !loading && (
        <div className="px-3 py-1.5 flex gap-2 overflow-x-auto border-t border-border/20 bg-card/50 shrink-0">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 rounded-full text-xs border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 whitespace-nowrap transition-colors shrink-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-chat-composer border-t border-border/20 shrink-0">
        <div className="flex items-end gap-2.5">
          <div className="flex-1 min-w-0 bg-secondary/40 rounded-3xl px-4 py-2.5 border border-border/20 focus-within:border-primary/30 transition-colors">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/40 max-h-[120px]"
              style={{ minHeight: '20px' }}
            />
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={!draft.trim() || loading}
            size="icon"
            className="rounded-full shrink-0 gradient-primary border-0 h-10 w-10 shadow-md flex-none"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
