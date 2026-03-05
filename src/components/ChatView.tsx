import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Phone, Video, Settings, Sun, Moon, Sunset, Cloud, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { streamPartnerReply, fetchReplySuggestions } from '@/lib/aiService';
import type { ParsedMessage } from '@/lib/chatParser';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import MessageReactions from '@/components/MessageReactions';
import DailyLoveNote from '@/components/DailyLoveNote';
import { useAuth } from '@/contexts/AuthContext';

interface ChatViewProps {
  sessionId: string;
  importedMessages: ParsedMessage[];
  meName: string;
  otherName: string;
  memorySummary: string;
  partnerStyle: string;
  existingMessages?: { role: string; content: string; created_at: string }[];
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

/** Hook that returns stable viewport dimensions for iOS Safari */
function useVisualViewport() {
  const [vp, setVp] = useState({ height: window.innerHeight, offsetTop: 0 });

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      if (vv) {
        setVp({ height: vv.height, offsetTop: vv.offsetTop });
      } else {
        setVp({ height: window.innerHeight, offsetTop: 0 });
      }
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    update();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  return vp;
}

const ChatView = ({ sessionId, importedMessages, meName, otherName, memorySummary, partnerStyle, existingMessages, onBack }: ChatViewProps) => {
  const timeGreeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return { text: 'Good morning', emoji: '☀️', icon: Sun, sub: 'Start your day with a sweet text' };
    if (h >= 12 && h < 17) return { text: 'Good afternoon', emoji: '🌤️', icon: Cloud, sub: 'How about a quick chat?' };
    if (h >= 17 && h < 21) return { text: 'Good evening', emoji: '🌅', icon: Sunset, sub: 'Wind down with a cozy conversation' };
    return { text: 'Late night', emoji: '🌙', icon: Moon, sub: 'Can\'t sleep? Talk to them 💕' };
  }, []);
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    if (existingMessages && existingMessages.length > 0) {
      return existingMessages.map((m, i) => ({
        id: `existing-${i}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
    }
    return [];
  });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const chatNavigate = useNavigate();
  const { canSendMessage, messagesUsedToday, maxMessages, plan, incrementUsage } = useSubscription();
  const { height: vpHeight, offsetTop: vpOffset } = useVisualViewport();
  const { user } = useAuth();

  // Load reactions
  useEffect(() => {
    const loadReactions = async () => {
      const msgIds = messages.map(m => m.id);
      if (msgIds.length === 0) return;

      const { data } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', msgIds);

      if (!data) return;

      const { data: { user } } = await supabase.auth.getUser();
      const rxMap: Record<string, Record<string, number>> = {};
      const urMap: Record<string, string[]> = {};

      for (const r of data) {
        if (!rxMap[r.message_id]) rxMap[r.message_id] = {};
        rxMap[r.message_id][r.emoji] = (rxMap[r.message_id][r.emoji] || 0) + 1;
        if (user && r.user_id === user.id) {
          if (!urMap[r.message_id]) urMap[r.message_id] = [];
          urMap[r.message_id].push(r.emoji);
        }
      }
      setReactions(rxMap);
      setUserReactions(urMap);
    };

    loadReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel('reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        loadReactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messages.length]);

  // Lock body scroll
  useEffect(() => {
    const orig = document.body.style.cssText;
    document.body.style.cssText = 'overflow:hidden;position:fixed;width:100%;height:100%;';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.cssText = orig;
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const buildRecentContext = useCallback(() => {
    return importedMessages.slice(-40).map(m => {
      const role = m.sender === meName ? meName : otherName;
      return `${role}: ${m.text}`;
    }).join('\n');
  }, [importedMessages, meName, otherName]);

  const loadSuggestions = useCallback(async (lastAiMessage: string) => {
    const replies = await fetchReplySuggestions(lastAiMessage, memorySummary, partnerStyle, meName, otherName);
    setSuggestions(replies.slice(0, 3));
  }, [memorySummary, partnerStyle, meName, otherName]);

  const sendMessage = async (text?: string) => {
    const msgText = (text || draft).trim();
    if (!msgText || loading) return;

    if (!canSendMessage) {
      toast({
        title: 'Daily limit reached',
        description: 'Upgrade to Pro for unlimited messages! 💎',
        variant: 'destructive',
      });
      return;
    }

    const allowed = await incrementUsage();
    if (!allowed) {
      toast({ title: 'Daily limit reached', description: 'Upgrade to Pro for unlimited messages!', variant: 'destructive' });
      return;
    }

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

    // Persist user message to DB & track mood
    const userId = (await supabase.auth.getUser()).data.user?.id ?? '';
    supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      content: msgText,
    }).then();

    // Auto-detect mood and save
    supabase.functions.invoke('chat-suggest', {
      body: { action: 'detect-mood', message: msgText },
    }).then(({ data }) => {
      if (data?.label) {
        supabase.from('mood_entries').insert({
          user_id: userId,
          session_id: sessionId,
          mood: data.label,
          score: data.score || 5,
          source: 'auto',
        }).then();
      }
    });

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    // Build chat history WITHOUT the current user message (edge function adds it)
    const chatHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

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
          if (assistantContent) {
            loadSuggestions(assistantContent);
            // Persist assistant message to DB
            supabase.auth.getUser().then(({ data }) => {
              supabase.from('chat_messages').insert({
                session_id: sessionId,
                user_id: data.user?.id ?? '',
                role: 'assistant',
                content: assistantContent,
              }).then();
            });
          }
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
    <div
      className="fixed left-0 right-0 flex flex-col bg-background max-w-lg mx-auto overflow-hidden safe-area-inset"
      style={{ height: `${vpHeight}px`, top: `${vpOffset}px` }}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-2 py-2 bg-card/95 backdrop-blur-md border-b border-border/20 shrink-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0 text-sm font-bold text-primary-foreground">
            {initial}
          </div>
          {/* Online indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
        </div>
        <div className="flex-1 min-w-0 ml-1">
          <h2 className="text-sm font-semibold truncate">{otherName}</h2>
          <p className="text-[11px] text-muted-foreground">
            {typing ? (
              <span className="text-green-500 font-medium">typing...</span>
            ) : 'online'}
          </p>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => chatNavigate('/insights')}>
            <BarChart3 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={onBack}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.04) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.03) 0%, transparent 50%)`,
        }}
      >
        {/* Daily Love Note */}
        {messages.length >= 0 && (
          <DailyLoveNote
            sessionId={sessionId}
            otherName={otherName}
            memorySummary={memorySummary}
            partnerStyle={partnerStyle}
            meName={meName}
          />
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-xl shadow-primary/20">
                {initial}
              </div>
              <motion.div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-3 border-background flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <span className="text-[10px]">✓</span>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <p className="text-xl font-bold">
                {timeGreeting.text} {timeGreeting.emoji}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">{otherName}</span> is waiting to hear from you
              </p>
              <p className="text-[11px] text-muted-foreground/40">{timeGreeting.sub}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-2"
            >
              {['Hey! 👋', 'Miss you 💕', `${timeGreeting.text.toLowerCase()} ☺️`].map((quickMsg, qi) => (
                <button
                  key={qi}
                  onClick={() => sendMessage(quickMsg)}
                  className="px-3 py-1.5 rounded-full text-xs border border-primary/25 text-primary bg-primary/5 hover:bg-primary/15 transition-colors"
                >
                  {quickMsg}
                </button>
              ))}
            </motion.div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isMe = msg.role === 'user';
            const showTime = i === 0 ||
              (msg.timestamp.getTime() - messages[i - 1].timestamp.getTime()) > 300000;

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
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-0.5 group`}
                >
                  <div className="max-w-[78%]">
                    <div
                      className={`px-3 py-1.5 text-[14px] leading-relaxed
                        ${isMe
                          ? 'bg-chat-me text-chat-me-foreground rounded-xl rounded-br-sm'
                          : 'bg-chat-ai text-chat-ai-foreground rounded-xl rounded-bl-sm border border-border/15'
                        }`}
                    >
                      {!isMe && (i === 0 || messages[i - 1]?.role === 'user') && (
                        <p className="text-[11px] font-semibold text-primary mb-0.5">{otherName}</p>
                      )}
                      <div className="flex items-end gap-2">
                        <p className="whitespace-pre-wrap break-words flex-1">{msg.content || '\u00A0'}</p>
                        {msg.content && (
                          <span className={`text-[10px] shrink-0 leading-none pb-0.5 ${isMe ? 'text-chat-me-foreground/35' : 'text-chat-ai-foreground/35'}`}>
                            {format(msg.timestamp, 'h:mm')}
                            {isMe && (
                              <span className="ml-0.5 inline-flex">
                                <span className="text-blue-400">✓✓</span>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.content && (
                      <MessageReactions
                        messageId={msg.id}
                        reactions={reactions[msg.id] || {}}
                        userReactions={userReactions[msg.id] || []}
                        isMe={isMe}
                      />
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-0.5 items-end gap-1.5"
          >
            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0 text-[10px] font-bold text-primary-foreground">
              {initial}
            </div>
            <div className="bg-chat-ai border border-border/15 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <motion.span
                  className="w-2 h-2 bg-primary/60 rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-2 h-2 bg-primary/60 rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="w-2 h-2 bg-primary/60 rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
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

      {/* Usage indicator for free users */}
      {plan === 'free' && (
        <div className="shrink-0 px-4 py-1 bg-card/50 border-t border-border/10 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {messagesUsedToday}/{maxMessages} messages today
          </p>
          {!canSendMessage && (
            <button
              onClick={() => chatNavigate('/settings')}
              className="text-[10px] text-primary font-medium hover:underline active:scale-95 transition-transform"
            >
              Upgrade for unlimited →
            </button>
          )}
        </div>
      )}

      {/* Composer — always at bottom of visual viewport */}
      <div className="shrink-0 bg-chat-composer/95 backdrop-blur-md border-t border-border/20 px-3 py-2 z-20">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0 bg-secondary/40 rounded-3xl px-4 py-2.5 border border-border/20 focus-within:border-primary/30 transition-colors">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={canSendMessage ? "Message..." : "Daily limit reached — Upgrade to Pro"}
              rows={1}
              disabled={!canSendMessage}
              className="w-full bg-transparent text-[16px] outline-none resize-none placeholder:text-muted-foreground/40 max-h-[120px] disabled:opacity-50"
              style={{ minHeight: '22px' }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!draft.trim() || loading || !canSendMessage}
            className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-md disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Send className="w-[18px] h-[18px] text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
