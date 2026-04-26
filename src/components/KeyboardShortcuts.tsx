import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

/**
 * Global keyboard shortcuts.
 *  ?              → show this dialog
 *  g then c       → /chat
 *  g then s       → /settings
 *  g then i       → /insights
 * Ignored when typing in inputs/textareas/contenteditable.
 */
const SHORTCUTS = [
  { keys: '?', desc: 'Show this help' },
  { keys: 'g c', desc: 'Go to Chat' },
  { keys: 'g s', desc: 'Go to Settings' },
  { keys: 'g i', desc: 'Go to Insights' },
  { keys: 'Esc', desc: 'Close dialogs' },
];

const KeyboardShortcuts = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let waitingForG = false;
    let timer: number | undefined;

    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (waitingForG) {
        if (e.key === 'c') navigate('/chat');
        else if (e.key === 's') navigate('/settings');
        else if (e.key === 'i') navigate('/insights');
        waitingForG = false;
        if (timer) window.clearTimeout(timer);
        return;
      }

      if (e.key === 'g') {
        waitingForG = true;
        timer = window.setTimeout(() => { waitingForG = false; }, 1200);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer) window.clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 mt-2">
          {SHORTCUTS.map(s => (
            <li key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-secondary border border-border/40 text-xs font-mono">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcuts;