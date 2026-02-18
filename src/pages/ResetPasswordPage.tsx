import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircleHeart, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for recovery token (Supabase puts type=recovery in hash)
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'At least 6 characters required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
      setTimeout(() => navigate('/auth'), 2500);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 z-10"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary glow-primary">
            <MessageCircleHeart className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">
            Partner<span className="gradient-text">AI</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {done ? 'Password updated! Redirecting...' : 'Create your new password'}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <p className="text-sm text-center text-muted-foreground">Your password has been updated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-primary border-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Remember your password?{' '}
          <button onClick={() => navigate('/auth')} className="text-primary font-medium">Sign In</button>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
