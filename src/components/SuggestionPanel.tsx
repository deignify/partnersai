import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSuggestions, type ToneStyle, type SuggestionResponse } from '@/lib/aiService';
import type { ParsedMessage } from '@/lib/chatParser';
import { useToast } from '@/hooks/use-toast';

interface SuggestionPanelProps {
  draft: string;
  messages: ParsedMessage[];
  memorySummary: string;
  styleProfile: string;
  meName: string;
  otherName: string;
  onSelect: (text: string) => void;
}

const TONES: { key: ToneStyle; label: string; emoji: string }[] = [
  { key: 'short', label: 'Short', emoji: '✂️' },
  { key: 'long', label: 'Long', emoji: '📝' },
  { key: 'calm', label: 'Calm', emoji: '😌' },
  { key: 'romantic', label: 'Romantic', emoji: '💕' },
  { key: 'apologetic', label: 'Sorry', emoji: '🙏' },
  { key: 'flirty', label: 'Flirty', emoji: '😏' },
  { key: 'formal', label: 'Formal', emoji: '👔' },
];

const SuggestionPanel = ({ draft, messages, memorySummary, styleProfile, meName, otherName, onSelect }: SuggestionPanelProps) => {
  const [tone, setTone] = useState<ToneStyle>('calm');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionResponse | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchSuggestions = async (selectedTone?: ToneStyle) => {
    const t = selectedTone || tone;
    setTone(t);
    setLoading(true);
    setResult(null);
    try {
      const res = await getSuggestions({
        draft,
        tone: t,
        recentMessages: messages,
        memorySummary,
        styleProfile,
        meName,
        otherName,
      });
      setResult(res);
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message || 'Failed to get suggestions', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Suggestions for Me
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Pick a tone, get reply ideas</p>
      </div>

      <div className="p-3 border-b border-border">
        <div className="flex flex-wrap gap-1.5">
          {TONES.map(t => (
            <button
              key={t.key}
              onClick={() => fetchSuggestions(t.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                ${tone === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-primary/20'}`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Thinking...</span>
          </div>
        )}

        <AnimatePresence>
          {result?.suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group relative p-3 rounded-lg bg-secondary border border-border hover:border-primary/40 cursor-pointer transition-colors"
              onClick={() => onSelect(s)}
            >
              <p className="text-sm pr-8">{s}</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(s, i); }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === i ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {result && !loading && (
          <button
            onClick={() => setShowReason(!showReason)}
            className="text-xs text-primary hover:underline mt-2"
          >
            {showReason ? 'Hide reasoning' : '💡 Why this fits my style'}
          </button>
        )}

        {showReason && result?.reasoning && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground p-3 bg-muted rounded-lg"
          >
            {result.reasoning}
          </motion.p>
        )}

        {!loading && !result && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Pick a tone above to get suggestions
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          ⚠️ AI assistant for your replies only. Never impersonates the other person.
        </p>
      </div>
    </div>
  );
};

export default SuggestionPanel;
