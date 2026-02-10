import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Shield, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { parseWhatsAppChat, type ParseResult } from '@/lib/chatParser';
import { deleteAllData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface LandingPageProps {
  onParsed: (result: ParseResult) => void;
}

const LandingPage = ({ onParsed }: LandingPageProps) => {
  const [consent, setConsent] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (!consent) {
      toast({ title: 'Consent required', description: 'Please check the consent box first.', variant: 'destructive' });
      return;
    }
    if (!file.name.endsWith('.txt')) {
      toast({ title: 'Invalid file', description: 'Please upload a .txt WhatsApp export.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      const result = parseWhatsAppChat(text);
      if (result.messages.length === 0) {
        toast({ title: 'No messages found', description: 'Could not parse any messages from this file.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      onParsed(result);
    } catch {
      toast({ title: 'Parse error', description: 'Failed to read the file.', variant: 'destructive' });
    }
    setLoading(false);
  }, [consent, onParsed, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleDeleteAll = async () => {
    await deleteAllData();
    toast({ title: 'All data deleted', description: 'All local data has been removed.' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            ChatAssist
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Your AI Writing Assistant</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Upload your WhatsApp chat export and get AI-powered reply suggestions that match your style.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          onClick={() => {
            if (!consent) {
              toast({ title: 'Consent required', description: 'Check the consent box first.', variant: 'destructive' });
              return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt';
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium">
            {loading ? 'Parsing chat...' : 'Drop your WhatsApp .txt export here'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(c) => setConsent(c === true)}
            className="mt-0.5"
          />
          <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
            <Shield className="w-3.5 h-3.5 inline mr-1 text-primary" />
            I own this chat export and I have permission to use it. Data stays on my device.
          </label>
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete All Data
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
