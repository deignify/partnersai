import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageCircleHeart, BarChart3, Settings, ArrowRight, X } from 'lucide-react';

const STORAGE_KEY = 'partnerai.onboarding.v1';

const STEPS = [
  {
    icon: MessageCircleHeart,
    title: 'Chat anytime',
    body: 'Your partner\'s AI twin replies in their voice — pet names, emojis and all.',
  },
  {
    icon: Sparkles,
    title: 'Smart suggestions',
    body: 'Tap a chip to use a context-aware reply. Saves typing on busy days.',
  },
  {
    icon: BarChart3,
    title: 'Track the vibe',
    body: 'Insights show mood trends, streaks and rituals from your conversations.',
  },
  {
    icon: Settings,
    title: 'You\'re in control',
    body: 'Re-upload chats, change theme, export data or delete everything any time.',
  },
];

interface Props { onDone?: () => void }

const OnboardingTour = ({ onDone }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
    onDone?.();
  };

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={close}
      >
        <motion.div
          key={step}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl bg-card border border-border/40 shadow-2xl shadow-primary/10 p-6 relative"
        >
          <button
            onClick={close}
            className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-secondary/40 flex items-center justify-center text-muted-foreground"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-2xl gradient-primary glow-primary flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" />
          </div>

          <h2 className="text-lg font-bold mb-1.5">{s.title}</h2>
          <p className="text-sm text-muted-foreground mb-5">{s.body}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-6 gradient-primary' : 'w-1.5 bg-border/50'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => isLast ? close() : setStep(s => s + 1)}
              className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              {isLast ? 'Get started' : 'Next'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;