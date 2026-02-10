import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ParseResult } from '@/lib/chatParser';

interface ParticipantMappingProps {
  parseResult: ParseResult;
  onMapped: (meName: string, otherName: string) => void;
}

const ParticipantMapping = ({ parseResult, onMapped }: ParticipantMappingProps) => {
  const [me, setMe] = useState('');

  const other = parseResult.participants.find(p => p !== me) || '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        <div className="text-center space-y-2">
          <Users className="w-8 h-8 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">Who are you?</h2>
          <p className="text-sm text-muted-foreground">
            Found {parseResult.messages.length} messages between {parseResult.participants.length} participants
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-xs text-muted-foreground space-y-1">
          {parseResult.preview.slice(0, 15).map((line, i) => (
            <p key={i} className="truncate">{line}</p>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Select which participant is you:</p>
          <div className="grid gap-2">
            {parseResult.participants.map((name) => (
              <button
                key={name}
                onClick={() => setMe(name)}
                className={`p-3 rounded-lg border text-left text-sm font-medium transition-colors
                  ${me === name
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-primary/50'
                  }`}
              >
                {name}
                {me === name && <span className="ml-2 text-xs opacity-70">← That's me</span>}
              </button>
            ))}
          </div>
        </div>

        {me && other && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary text-sm">
              <span className="text-muted-foreground">Other participant:</span>{' '}
              <span className="font-medium">{other}</span>
            </div>
            <Button onClick={() => onMapped(me, other)} className="w-full">
              Continue to Chat <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ParticipantMapping;
