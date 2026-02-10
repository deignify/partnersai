import { useState, useCallback } from 'react';
import LandingPage from '@/components/LandingPage';
import ParticipantMapping from '@/components/ParticipantMapping';
import ChatView from '@/components/ChatView';
import type { ParseResult, ParsedMessage } from '@/lib/chatParser';
import { saveSession, saveMessages, updateSessionSummary } from '@/lib/storage';
import { buildMemoryAndStyle } from '@/lib/aiService';
import { useToast } from '@/hooks/use-toast';

type Screen = 'landing' | 'mapping' | 'loading' | 'chat';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [meName, setMeName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [memorySummary, setMemorySummary] = useState('');
  const [partnerStyle, setPartnerStyle] = useState('');
  const { toast } = useToast();

  const handleParsed = useCallback((result: ParseResult) => {
    setParseResult(result);
    setScreen('mapping');
  }, []);

  const handleMapped = useCallback(async (me: string, other: string) => {
    const id = crypto.randomUUID();
    setSessionId(id);
    setMeName(me);
    setOtherName(other);
    setMessages(parseResult!.messages);
    setScreen('loading');

    await saveSession({
      id,
      title: `${me} & ${other}`,
      createdAt: new Date(),
      meParticipant: me,
      otherParticipant: other,
    });
    await saveMessages(id, parseResult!.messages);

    try {
      const result = await buildMemoryAndStyle(parseResult!.messages, me, other);
      setMemorySummary(result.summary);
      setPartnerStyle(result.partnerStyle);
      await updateSessionSummary(id, result.summary, result.partnerStyle);
    } catch (e: any) {
      toast({ title: 'Note', description: 'Using basic context mode.' });
      setMemorySummary('A conversation between two partners.');
      setPartnerStyle('Casual, loving texting style with emojis.');
    }
    setScreen('chat');
  }, [parseResult, toast]);

  if (screen === 'mapping' && parseResult) {
    return <ParticipantMapping parseResult={parseResult} onMapped={handleMapped} />;
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-primary glow-primary flex items-center justify-center animate-pulse">
          <span className="text-2xl">💕</span>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Learning how {otherName} texts...</p>
        <p className="text-xs text-muted-foreground/40">Reading chat patterns, pet names, emojis & style</p>
      </div>
    );
  }

  if (screen === 'chat' && sessionId) {
    return (
      <ChatView
        sessionId={sessionId}
        importedMessages={messages}
        meName={meName}
        otherName={otherName}
        memorySummary={memorySummary}
        partnerStyle={partnerStyle}
        onBack={() => setScreen('landing')}
      />
    );
  }

  return <LandingPage onParsed={handleParsed} />;
};

export default Index;
