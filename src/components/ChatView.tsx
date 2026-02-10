import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MessageCircleHeart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { streamPartnerReply } from '@/lib/aiService';
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

const ChatView = ({ sessionId, importedMessages, meName, otherName, memorySummary, partnerStyle, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
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

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    const chatHistory = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add placeholder assistant message
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      await streamPartnerReply({
        message: text,
        chatHistory: chatHistory.slice(-20), // last 20 messages for context
        recentContext: buildRecentContext(),
        memorySummary,
        partnerStyle,
        meName,
        otherName,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
          );
        },
        onDone: () => {
          setLoading(false);
        },
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: 'connection lost 😢 try again?' } : m)
      );
      setLoading(false);
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
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border/40 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0 glow-primary">
            <MessageCircleHeart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold">{otherName}</h2>
            <p className="text-[11px] text-primary/80">
              {loading ? 'typing...' : 'online'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.03) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.03) 0%, transparent 50%)`,
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center glow-primary">
              <MessageCircleHeart className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[240px]">
              Say hi to <span className="text-primary font-semibold">{otherName}</span> 💕
              <br />
              <span className="text-xs">They'll reply just like the real thing</span>
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isMe = msg.role === 'user';
            const showTime = i === 0 || 
              (msg.timestamp.getTime() - messages[i-1].timestamp.getTime()) > 300000; // 5 min gap

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground">
                      {format(msg.timestamp, 'h:mm a')}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2 text-[14px] leading-relaxed shadow-sm
                      ${isMe
                        ? 'bg-chat-me text-chat-me-foreground rounded-2xl rounded-br-md'
                        : 'bg-chat-ai text-chat-ai-foreground rounded-2xl rounded-bl-md border border-border/20'
                      }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.content && (
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-chat-me-foreground/40' : 'text-chat-ai-foreground/40'}`}>
                        {format(msg.timestamp, 'h:mm a')}
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-chat-ai border border-border/20 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="px-3 py-3 bg-chat-composer border-t border-border/30 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-secondary/50 rounded-2xl px-4 py-2.5 border border-border/30 focus-within:border-primary/30 transition-colors">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherName}...`}
              rows={1}
              className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/50 max-h-[120px]"
              style={{ minHeight: '22px' }}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!draft.trim() || loading}
            size="icon"
            className="rounded-full shrink-0 gradient-primary border-0 h-10 w-10 shadow-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
