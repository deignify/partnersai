import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from '@/components/LandingPage';
import ParticipantMapping from '@/components/ParticipantMapping';
import ChatView from '@/components/ChatView';
import type { ParseResult, ParsedMessage } from '@/lib/chatParser';
import { buildMemoryAndStyle } from '@/lib/aiService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Screen = 'landing' | 'mapping' | 'loading' | 'chat';

const ChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('landing');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [meName, setMeName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [importedMessages, setImportedMessages] = useState<ParsedMessage[]>([]);
  const [memorySummary, setMemorySummary] = useState('');
  const [partnerStyle, setPartnerStyle] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [existingMessages, setExistingMessages] = useState<{ role: string; content: string; created_at: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Check for existing session on mount
  useEffect(() => {
    if (!user) return;
    const loadSession = async () => {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (session) {
        setSessionId(session.id);
        setMeName(session.me_name);
        setOtherName(session.partner_name);
        setMemorySummary(session.memory_summary || '');
        setPartnerStyle(session.partner_style || '');

        // Load existing messages
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (msgs) setExistingMessages(msgs);

        // Load imported context
        const { data: imported } = await supabase
          .from('imported_chats')
          .select('recent_context')
          .eq('session_id', session.id)
          .maybeSingle();

        if (imported?.recent_context) {
          // Parse it back into importedMessages format for context
          const lines = imported.recent_context.split('\n');
          setImportedMessages(lines.map((l, i) => {
            const colonIdx = l.indexOf(': ');
            const sender = colonIdx > -1 ? l.slice(0, colonIdx) : '';
            const text = colonIdx > -1 ? l.slice(colonIdx + 2) : l;
            return { sender, text, timestamp: new Date(), id: `imp-${i}`, isSystem: false };
          }));
        }

        setScreen('chat');
      }
    };
    loadSession();
  }, [user]);

  const handleParsed = useCallback((result: ParseResult) => {
    setParseResult(result);
    setScreen('mapping');
  }, []);

  const handleMapped = useCallback(async (me: string, other: string) => {
    if (!user) return;
    setMeName(me);
    setOtherName(other);
    setImportedMessages(parseResult!.messages);
    setScreen('loading');

    try {
      const result = await buildMemoryAndStyle(parseResult!.messages, me, other);
      setMemorySummary(result.summary);
      setPartnerStyle(result.partnerStyle);

      // Save session to DB
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .upsert({
          user_id: user.id,
          partner_name: other,
          me_name: me,
          memory_summary: result.summary,
          partner_style: result.partnerStyle,
          style_profile: result.styleProfile,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      setSessionId(session.id);

      // Save recent context
      const recentContext = parseResult!.messages.slice(-40).map(m => {
        const role = m.sender === me ? me : other;
        return `${role}: ${m.text}`;
      }).join('\n');

      await supabase.from('imported_chats').upsert({
        user_id: user.id,
        session_id: session.id,
        recent_context: recentContext,
      }, { onConflict: 'user_id' });

    } catch (e: any) {
      toast({ title: 'Note', description: 'Using basic context mode.' });
      setMemorySummary('A conversation between two partners.');
      setPartnerStyle('Casual, loving texting style with emojis.');

      // Still create a session
      const { data: session } = await supabase
        .from('chat_sessions')
        .upsert({
          user_id: user!.id,
          partner_name: other,
          me_name: me,
          memory_summary: 'A conversation between two partners.',
          partner_style: 'Casual, loving texting style with emojis.',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (session) setSessionId(session.id);
    }
    setScreen('chat');
  }, [parseResult, user, toast]);

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
        importedMessages={importedMessages}
        meName={meName}
        otherName={otherName}
        memorySummary={memorySummary}
        partnerStyle={partnerStyle}
        existingMessages={existingMessages}
        onBack={() => navigate('/')}
      />
    );
  }

  if (authLoading || !user) return null;

  return <LandingPage onParsed={handleParsed} />;
};

export default ChatPage;
