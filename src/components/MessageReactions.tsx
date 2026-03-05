import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const REACTION_EMOJIS = ['❤️', '😂', '😢', '🔥', '👍', '😍'];

interface MessageReactionsProps {
  messageId: string;
  reactions: Record<string, number>;
  userReactions: string[];
  isMe: boolean;
}

const MessageReactions = ({ messageId, reactions, userReactions, isMe }: MessageReactionsProps) => {
  const [showPicker, setShowPicker] = useState(false);

  const toggleReaction = async (emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hasReacted = userReactions.includes(emoji);

    if (hasReacted) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setShowPicker(false);
  };

  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {/* Existing reactions */}
      {hasReactions && (
        <div className="flex gap-0.5 flex-wrap">
          {Object.entries(reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition-all
                ${userReactions.includes(emoji)
                  ? 'bg-primary/15 border border-primary/30'
                  : 'bg-muted/50 border border-border/30 hover:bg-muted'
                }`}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100"
        >
          <SmilePlus className="w-3 h-3" />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 4 }}
              className={`absolute bottom-full mb-1 flex gap-0.5 p-1.5 rounded-xl bg-card border border-border/50 shadow-lg z-30 ${isMe ? 'right-0' : 'left-0'}`}
            >
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors text-sm active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessageReactions;
