import { useState, useCallback } from 'react';
import LandingPage from '@/components/LandingPage';
import ParticipantMapping from '@/components/ParticipantMapping';
import ChatView from '@/components/ChatView';
import type { ParseResult, ParsedMessage } from '@/lib/chatParser';
import { saveSession, saveMessages } from '@/lib/storage';

type Screen = 'landing' | 'mapping' | 'chat';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [meName, setMeName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [messages, setMessages] = useState<ParsedMessage[]>([]);

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

    await saveSession({
      id,
      title: `${me} & ${other}`,
      createdAt: new Date(),
      meParticipant: me,
      otherParticipant: other,
    });
    await saveMessages(id, parseResult!.messages);
    setScreen('chat');
  }, [parseResult]);

  if (screen === 'mapping' && parseResult) {
    return <ParticipantMapping parseResult={parseResult} onMapped={handleMapped} />;
  }

  if (screen === 'chat' && sessionId) {
    return (
      <ChatView
        sessionId={sessionId}
        messages={messages}
        meName={meName}
        otherName={otherName}
        onBack={() => setScreen('landing')}
      />
    );
  }

  return <LandingPage onParsed={handleParsed} />;
};

export default Index;
