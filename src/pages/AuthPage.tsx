import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleHeart, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type Mode = 'signin' | 'signup' | 'forgot';

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'Check your email ✉️', description: 'We sent you a verification link.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/chat', { replace: true });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast({ title: 'Email sent!', description: 'Check your inbox for the password reset link.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm space-y-6 z-10"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <AnimatePresence mode="wait">
            {mode === 'forgot' && (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={() => { setMode('signin'); setForgotSent(false); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </motion.button>
            )}
          </AnimatePresence>

          <motion.div
            key={mode}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary glow-primary"
          >
            <MessageCircleHeart className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">
            Partner<span className="gradient-text">AI</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'Welcome back 💕' : mode === 'signup' ? 'Create your account ✨' : 'Reset your password 🔑'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Forgot Password form */}
          {mode === 'forgot' && (
            <motion.div key="forgot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {forgotSent ? (
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-2">
                  <p className="text-sm font-medium text-primary">📧 Check your inbox!</p>
                  <p className="text-xs text-muted-foreground">We sent a reset link to <strong>{email}</strong>. Click it to create a new password.</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-2">Works for both email & Google-linked accounts.</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center">Enter your email and we'll send you a reset link. Works even if you signed in with Google.</p>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary border-0 text-sm font-semibold shadow-lg shadow-primary/20">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </Button>
                </form>
              )}
            </motion.div>
          )}

          {/* Google + Email Auth */}
          {mode !== 'forgot' && (
            <motion.div key="auth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {/* Google */}
              <Button
                onClick={handleGoogle}
                disabled={loading}
                variant="outline"
                className="w-full h-12 gap-2.5 rounded-xl border-border/50 hover:bg-secondary/40 transition-all text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[11px] text-muted-foreground/60">or use email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    required
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full h-12 pl-10 pr-10 rounded-xl bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {mode === 'signin' && (
                  <div className="text-right">
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary/80 hover:text-primary hover:underline transition-colors">
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary border-0 text-sm font-semibold shadow-lg shadow-primary/20 gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-primary font-semibold hover:underline transition-colors">
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Shield className="w-3 h-3" /> Encrypted
                </span>
                <span className="text-muted-foreground/20">•</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  🔒 Private
                </span>
                <span className="text-muted-foreground/20">•</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  💕 Secure
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legal links */}
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => navigate('/privacy')} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">Privacy</button>
          <span className="text-muted-foreground/20">•</span>
          <button onClick={() => navigate('/terms')} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">Terms</button>
          <span className="text-muted-foreground/20">•</span>
          <button onClick={() => navigate('/contact')} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">Contact</button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
