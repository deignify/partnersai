import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return null;

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure? This will delete your chat partner, all messages, and uploaded data. This cannot be undone.')) return;
    setDeleting(true);
    try {
      // Delete in order: messages -> imported_chats -> sessions (cascade handles it but be explicit)
      await supabase.from('chat_messages').delete().eq('user_id', user!.id);
      await supabase.from('imported_chats').delete().eq('user_id', user!.id);
      await supabase.from('chat_sessions').delete().eq('user_id', user!.id);
      toast({ title: 'All data deleted', description: 'Everything wiped clean 💨' });
      navigate('/');
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
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Account info */}
        <div className="p-4 rounded-xl bg-card border border-border/30 space-y-1">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium">{user?.email}</p>
        </div>

        {/* Delete data */}
        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          className="w-full p-4 rounded-xl bg-card border border-destructive/20 flex items-center gap-3 hover:bg-destructive/5 transition-colors text-left"
        >
          {deleting ? <Loader2 className="w-5 h-5 text-destructive animate-spin" /> : <Trash2 className="w-5 h-5 text-destructive" />}
          <div>
            <p className="text-sm font-medium text-destructive">Delete All Data</p>
            <p className="text-xs text-muted-foreground">Remove your partner, messages, and uploaded chats</p>
          </div>
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full p-4 rounded-xl bg-card border border-border/30 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Sign Out</p>
            <p className="text-xs text-muted-foreground">Log out of your account</p>
          </div>
        </button>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
