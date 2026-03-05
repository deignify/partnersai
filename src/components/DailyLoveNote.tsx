import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, Sparkles, ChevronLeft, ChevronRight, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface DailyLoveNoteProps {
  sessionId: string;
  otherName: string;
  memorySummary: string;
  partnerStyle: string;
  meName: string;
}

interface LoveNote {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
}

const noteGradients = [
  'from-pink-500/15 via-rose-400/10 to-pink-300/5',
  'from-violet-500/15 via-purple-400/10 to-fuchsia-300/5',
  'from-amber-500/15 via-orange-400/10 to-yellow-300/5',
  'from-sky-500/15 via-blue-400/10 to-cyan-300/5',
];

const noteIcons = ['💌', '💕', '✨', '🌸', '🦋', '🌙'];

const DailyLoveNote = ({ sessionId, otherName, memorySummary, partnerStyle, meName }: DailyLoveNoteProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-100, 0, 100], [-5, 0, 5]);

  useEffect(() => {
    if (!user) return;
    loadNotes();
  }, [user, sessionId]);

  const loadNotes = async () => {
    if (!user) return;
    // Load recent love notes (last 7 days)
    const { data: existing } = await supabase
      .from('love_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(7);

    if (existing && existing.length > 0) {
      setNotes(existing);
      // Check if we have a note for today
      const today = new Date().toISOString().slice(0, 10);
      const hasToday = existing.some(n => n.created_at.startsWith(today));
      if (!hasToday) {
        await generateNote();
      }
    } else {
      await generateNote();
    }
    setLoading(false);
  };

  const generateNote = async () => {
    if (!user) return;
    setGenerating(true);
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
        setGenerating(false);
        return;
      }

      const noteType = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';

      const { data: saved } = await supabase
        .from('love_notes')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          content: data.note,
          note_type: noteType,
        })
        .select()
        .single();

      if (saved) {
        setNotes(prev => [saved, ...prev]);
        setCurrentIndex(0);
      }
    } catch {
      // silently fail
    }
    setGenerating(false);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 60 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (info.offset.x < -60 && currentIndex < notes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const currentNote = notes[currentIndex];
  const gradientClass = noteGradients[currentIndex % noteGradients.length];
  const icon = noteIcons[currentIndex % noteIcons.length];

  const getTimeLabel = (note: LoveNote) => {
    const type = note.note_type;
    const day = format(new Date(note.created_at), 'MMM d');
    const isToday = note.created_at.startsWith(new Date().toISOString().slice(0, 10));
    return isToday ? `Today's ${type} note` : `${day} — ${type}`;
  };

  if (loading) {
    return (
      <div className="mx-3 mb-2 mt-1">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-primary/10 rounded w-1/3" />
              <div className="h-4 bg-primary/10 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentNote || dismissed) return null;

  return (
    <div className="mx-3 mb-2 mt-1">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentNote.id}
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x, opacity, rotate }}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className={`relative rounded-2xl bg-gradient-to-br ${gradientClass} border border-primary/20 p-4 backdrop-blur-sm overflow-hidden`}>
            {/* Decorative shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
            />

            {/* Close button */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center hover:bg-background/90 transition-colors z-10"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 relative z-[1]">
              <motion.div
                className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/25"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-lg">{icon}</span>
              </motion.div>
              <div className="flex-1 min-w-0 pr-5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    {getTimeLabel(currentNote)}
                  </p>
                </div>
                <p className="text-[13px] text-foreground leading-relaxed font-medium">{currentNote.content}</p>

                {/* Navigation & Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary/10">
                  <div className="flex items-center gap-1">
                    {notes.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                          disabled={currentIndex === 0}
                          className="w-6 h-6 rounded-full bg-background/50 flex items-center justify-center disabled:opacity-30 hover:bg-background/80 transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="text-[9px] text-muted-foreground px-1 tabular-nums">
                          {currentIndex + 1}/{notes.length}
                        </span>
                        <button
                          onClick={() => setCurrentIndex(Math.min(notes.length - 1, currentIndex + 1))}
                          disabled={currentIndex === notes.length - 1}
                          className="w-6 h-6 rounded-full bg-background/50 flex items-center justify-center disabled:opacity-30 hover:bg-background/80 transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={generateNote}
                      disabled={generating}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-[10px] text-primary font-medium"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${generating ? 'animate-spin' : ''}`} />
                      New
                    </button>
                    <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(currentNote.created_at), 'h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DailyLoveNote;
