import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DailyLoveNoteProps {
  sessionId: string;
  otherName: string;
  memorySummary: string;
  partnerStyle: string;
  meName: string;
}

const DailyLoveNote = ({ sessionId, otherName, memorySummary, partnerStyle, meName }: DailyLoveNoteProps) => {
  const { user } = useAuth();
  const [note, setNote] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrGenerate = async () => {
      // Check if we already have a note for today
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from('love_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .maybeSingle();

      if (existing?.content) {
        setNote(existing.content);
        setLoading(false);
        return;
      }

      // Generate a new love note
      try {
        const { data, error } = await supabase.functions.invoke('chat-suggest', {
          body: {
            action: 'love-note',
            memorySummary,
            partnerStyle,
            meName,
            otherName,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });

        if (error || !data?.note) {
          setLoading(false);
          return;
        }

        setNote(data.note);

        // Save to DB
        await supabase.from('love_notes').insert({
          user_id: user.id,
          session_id: sessionId,
          content: data.note,
          note_type: new Date().getHours() < 12 ? 'morning' : 'evening',
        });
      } catch {
        // silently fail
      }
      setLoading(false);
    };

    fetchOrGenerate();
  }, [user, sessionId]);

  if (loading || !note || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="mx-3 mb-2 mt-1"
      >
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 border border-primary/20 p-4 backdrop-blur-sm">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/60 flex items-center justify-center hover:bg-background/80 transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
              <Heart className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'} Love Note from {otherName}
                </p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{note}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyLoveNote;
