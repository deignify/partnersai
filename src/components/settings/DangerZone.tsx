import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Trash2, Download, LogOut, Loader2, AlertTriangle } from 'lucide-react';

const DangerZone = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profile, sessions, messages, imported, moods, payments, notes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id),
        supabase.from('chat_sessions').select('*').eq('user_id', user.id),
        supabase.from('chat_messages').select('*').eq('user_id', user.id),
        supabase.from('imported_chats').select('*').eq('user_id', user.id),
        supabase.from('mood_entries').select('*').eq('user_id', user.id),
        supabase.from('payment_history').select('*').eq('user_id', user.id),
        supabase.from('love_notes').select('*').eq('user_id', user.id),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email, created_at: user.created_at },
        profile: profile.data,
        chat_sessions: sessions.data,
        chat_messages: messages.data,
        imported_chats: imported.data,
        mood_entries: moods.data,
        payment_history: payments.data,
        love_notes: notes.data,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partnerai-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data exported 📦', description: 'Saved to your downloads.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      toast({ title: 'Export failed', description: msg, variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleDeleteAllChats = async () => {
    if (!user) return;
    if (!confirm('Delete all chat data? This removes your partner, messages, and uploaded chats. Cannot be undone.')) return;
    setDeletingAll(true);
    try {
      await Promise.all([
        supabase.from('chat_messages').delete().eq('user_id', user.id),
        supabase.from('imported_chats').delete().eq('user_id', user.id),
        supabase.from('mood_entries').delete().eq('user_id', user.id),
        supabase.from('love_notes').delete().eq('user_id', user.id),
      ]);
      await supabase.from('chat_sessions').delete().eq('user_id', user.id);
      toast({ title: 'Chat data deleted 💨' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
    setDeletingAll(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmText = prompt('This permanently deletes your account and ALL data. Type DELETE to confirm:');
    if (confirmText !== 'DELETE') {
      toast({ title: 'Cancelled', description: 'Account not deleted.' });
      return;
    }
    setDeletingAccount(true);
    try {
      // Wipe all user data first (user_subscriptions and roles cascade through admin)
      await Promise.all([
        supabase.from('chat_messages').delete().eq('user_id', user.id),
        supabase.from('imported_chats').delete().eq('user_id', user.id),
        supabase.from('mood_entries').delete().eq('user_id', user.id),
        supabase.from('love_notes').delete().eq('user_id', user.id),
        supabase.from('message_reactions').delete().eq('user_id', user.id),
        supabase.from('daily_usage').delete().eq('user_id', user.id),
      ]);
      await supabase.from('chat_sessions').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      // Sign out — the auth.users row remains; admin can finalize hard delete from /admin
      await signOut();
      toast({ title: 'Account data wiped', description: 'You have been signed out. Contact support to fully remove the login.' });
      navigate('/login');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
    setDeletingAccount(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="rounded-2xl bg-card border border-destructive/15 overflow-hidden divide-y divide-border/20">
      <Action
        icon={exporting ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Download className="w-5 h-5 text-primary" />}
        title="Download my data"
        desc="Export everything as JSON (GDPR-compliant)"
        onClick={handleExport}
        disabled={exporting}
      />
      <Action
        icon={deletingAll ? <Loader2 className="w-5 h-5 text-destructive animate-spin" /> : <Trash2 className="w-5 h-5 text-destructive" />}
        title="Delete chat data"
        desc="Remove partner, messages & uploaded chats"
        onClick={handleDeleteAllChats}
        disabled={deletingAll}
        destructive
      />
      <Action
        icon={deletingAccount ? <Loader2 className="w-5 h-5 text-destructive animate-spin" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}
        title="Delete my account"
        desc="Permanently wipe all your data and sign out"
        onClick={handleDeleteAccount}
        disabled={deletingAccount}
        destructive
      />
      <Action
        icon={<LogOut className="w-5 h-5 text-muted-foreground" />}
        title="Sign out"
        desc="Log out of your account"
        onClick={handleSignOut}
      />
    </div>
  );
};

const Action = ({ icon, title, desc, onClick, disabled, destructive }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full p-4 flex items-center gap-3 transition-colors text-left disabled:opacity-50 ${destructive ? 'hover:bg-destructive/5' : 'hover:bg-secondary/30'}`}
  >
    <div className="shrink-0">{icon}</div>
    <div>
      <p className={`text-sm font-medium ${destructive ? 'text-destructive' : ''}`}>{title}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
  </button>
);

export default DangerZone;