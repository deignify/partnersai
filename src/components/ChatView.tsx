import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, X, Sparkles, ArrowLeft, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SuggestionPanel from './SuggestionPanel';
import type { ParsedMessage } from '@/lib/chatParser';
import { maskSensitiveInfo } from '@/lib/chatParser';
import { saveNewMessage, getNewMessages, updateSessionSummary } from '@/lib/storage';
import { buildMemoryAndStyle } from '@/lib/aiService';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

interface ChatViewProps {
  sessionId: string;
  messages: ParsedMessage[];
  meName: string;
  otherName: string;
  onBack: () => void;
}

function formatDateSep(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

const ChatView = ({ sessionId, messages: imported, meName, otherName, onBack }: ChatViewProps) => {
  const [newMessages, setNewMessages] = useState<ParsedMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [maskInfo, setMaskInfo] = useState(false);
  const [memorySummary, setMemorySummary] = useState('');
  const [styleProfile, setStyleProfile] = useState('');
  const [memoryLoading, setMemoryLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const allMessages = useMemo(() => [...imported, ...newMessages], [imported, newMessages]);

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return allMessages;
    const q = search.toLowerCase();
    return allMessages.filter(m => m.text.toLowerCase().includes(q));
  }, [allMessages, search]);

  useEffect(() => {
    (async () => {
      const saved = await getNewMessages(sessionId);
      setNewMessages(saved);
    })();
  }, [sessionId]);

  useEffect(() => {
    (async () => {
      try {
        const { summary, styleProfile: sp } = await buildMemoryAndStyle(imported, meName, otherName);
        setMemorySummary(summary);
        setStyleProfile(sp);
        await updateSessionSummary(sessionId, summary, sp);
      } catch (e: any) {
        toast({ title: 'Memory Error', description: e.message, variant: 'destructive' });
        setMemorySummary('General conversation');
        setStyleProfile('Default writing style');
      }
      setMemoryLoading(false);
    })();
  }, [sessionId, imported, meName, otherName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const msg: ParsedMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sender: meName,
      text: draft.trim(),
      isSystem: false,
    };
    setNewMessages(prev => [...prev, msg]);
    await saveNewMessage(sessionId, msg);
    setDraft('');
  };

  const displayText = (text: string) => maskInfo ? maskSensitiveInfo(text) : text;

  return (
    <div className="h-screen flex">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{otherName}</h2>
            <p className="text-xs text-muted-foreground">{allMessages.length} messages</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMaskInfo(!maskInfo)}
              className={maskInfo ? 'text-primary' : ''}
              title="Mask sensitive info"
            >
              <EyeOff className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPanel(!showPanel)}
              className={showPanel ? 'text-primary' : ''}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <button onClick={() => { setSearch(''); setShowSearch(false); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--chat-system) / 0.3) 0%, transparent 100%)' }}>
          {filteredMessages.map((msg, i) => {
            const isMe = msg.sender === meName;
            const showDate = i === 0 || !isSameDay(msg.timestamp, filteredMessages[i - 1].timestamp);
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-full bg-chat-date text-[11px] text-muted-foreground font-medium">
                      {formatDateSep(msg.timestamp)}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed
                      ${isMe
                        ? 'bg-chat-me text-chat-me-foreground rounded-tr-sm'
                        : 'bg-chat-other text-chat-other-foreground rounded-tl-sm'
                      }`}
                  >
                    {!isMe && (
                      <p className="text-[11px] font-semibold text-primary mb-0.5">{msg.sender}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{displayText(msg.text)}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-chat-me-foreground/60' : 'text-chat-other-foreground/50'} text-right`}>
                      {format(msg.timestamp, 'h:mm a')}
                    </p>
                  </div>
                </motion.div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="p-3 bg-chat-composer border-t border-border">
          {memoryLoading && (
            <p className="text-[10px] text-primary mb-2 animate-pulse">🧠 Building conversation memory...</p>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-secondary rounded-xl px-4 py-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message..."
                rows={1}
                className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground max-h-24"
                style={{ minHeight: '20px' }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!draft.trim()}
              size="icon"
              className="rounded-full shrink-0 bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      {showPanel && (
        <div className="w-80 hidden md:flex flex-col">
          <SuggestionPanel
            draft={draft}
            messages={allMessages}
            memorySummary={memorySummary}
            styleProfile={styleProfile}
            meName={meName}
            otherName={otherName}
            onSelect={setDraft}
          />
        </div>
      )}
    </div>
  );
};

export default ChatView;
