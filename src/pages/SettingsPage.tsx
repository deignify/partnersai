import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, LogOut, Loader2, MessageCircleHeart, User, Heart, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; messageCount: number; createdAt: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Load partner info
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('partner_name, created_at, id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (session) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        setPartnerInfo({
          name: session.partner_name,
          messageCount: count || 0,
          createdAt: new Date(session.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        });
      }
    };
    load();
  }, [user]);

  if (authLoading || !user) return null;

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure? This will delete your chat partner, all messages, and uploaded data. This cannot be undone.')) return;
    setDeleting(true);
    try {
      await supabase.from('chat_messages').delete().eq('user_id', user!.id);
      await supabase.from('imported_chats').delete().eq('user_id', user!.id);
      await supabase.from('chat_sessions').delete().eq('user_id', user!.id);
      setPartnerInfo(null);
      toast({ title: 'All data deleted', description: 'Everything wiped clean 💨' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setDeleting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Account Section */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Account</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-[11px] text-muted-foreground">Signed in via {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Partner Section */}
        {partnerInfo && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Your Partner</p>
            <div className="rounded-2xl bg-card border border-border/30 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{partnerInfo.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {partnerInfo.messageCount} messages • Since {partnerInfo.createdAt}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Info */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">How it works</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
            {[
              { icon: Clock, title: 'Time-Aware', desc: 'AI adapts to morning, evening & night moods' },
              { icon: Heart, title: 'Emotion Detection', desc: 'Understands your feelings and responds naturally' },
              { icon: MessageCircleHeart, title: 'Style Mimicry', desc: 'Learns exact texting patterns from your chat' },
              { icon: Shield, title: 'Private & Secure', desc: 'Your data is encrypted and only yours' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-destructive/70 uppercase tracking-wider px-1">Danger Zone</p>
          <div className="rounded-2xl bg-card border border-destructive/15 overflow-hidden divide-y divide-border/20">
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="w-full p-4 flex items-center gap-3 hover:bg-destructive/5 transition-colors text-left"
            >
              {deleting ? (
                <Loader2 className="w-5 h-5 text-destructive animate-spin shrink-0" />
              ) : (
                <Trash2 className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-destructive">Delete All Data</p>
                <p className="text-[11px] text-muted-foreground">Remove partner, messages & uploaded chats</p>
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Sign Out</p>
                <p className="text-[11px] text-muted-foreground">Log out of your account</p>
              </div>
            </button>
          </div>
        </section>

        {/* App info */}
        <div className="text-center pt-4 pb-6">
          <p className="text-[11px] text-muted-foreground/40">PartnerAI v1.0 • Made with 💕</p>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
