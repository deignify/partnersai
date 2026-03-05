import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, LogOut, Loader2, MessageCircleHeart, User, Heart, Clock, Shield, Crown, Ticket, Check, ChevronRight, KeyRound, RefreshCw, Sun, Moon, Monitor, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from 'next-themes';

const SettingsPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; messageCount: number; createdAt: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { plan, messagesUsedToday, maxMessages, refreshUsage } = useSubscription();

  // Upgrade state
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount_type?: string; discount_value?: number; plan_duration?: string; promo_id?: string; error?: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const priceDisplay = currency === 'INR' ? { symbol: '₹', amount: '499' } : { symbol: '$', amount: '9' };

  const isFreePromo = promoResult?.valid && (
    (promoResult.discount_type === 'percentage' && (promoResult.discount_value ?? 0) >= 100) ||
    (promoResult.discount_type === 'fixed' && (promoResult.discount_value ?? 0) >= 499)
  );

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

  const { theme, setTheme } = useTheme();

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

  const handleChangePassword = async () => {
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Password reset link sent! 📧', description: `Check ${user.email} for the reset link.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setResetLoading(false);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=validate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: promoCode }),
      });
      const result = await res.json();
      setPromoResult(result);
      if (result.valid) {
        toast({ title: '🎉 Promo applied!', description: `${result.discount_type === 'percentage' ? `${result.discount_value}% off` : `${priceDisplay.symbol}${result.discount_value} off`} — Pro for ${result.plan_duration}` });
      } else {
        toast({ title: 'Invalid code', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not validate promo', variant: 'destructive' });
    }
    setPromoLoading(false);
  };

  const handleUpgrade = async () => {
    setPaymentLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      if (promoResult?.valid && isFreePromo) {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=redeem-promo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ promoId: promoResult.promo_id }),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: '🎉 Welcome to Pro!', description: `Unlocked for ${result.plan_duration}!` });
          refreshUsage();
          setPromoCode('');
          setPromoResult(null);
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setPaymentLoading(false);
        return;
      }

      const body: any = { plan: 'pro', currency };
      if (promoResult?.valid && promoResult.promo_id) body.promoId = promoResult.promo_id;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const order = await res.json();
      if (order.error) throw new Error(order.error);

      const desc = promoResult?.valid
        ? `Pro Plan — ${promoResult.discount_type === 'percentage' ? `${promoResult.discount_value}% off` : `${priceDisplay.symbol}${promoResult.discount_value} off`}`
        : 'Pro Plan - Monthly';

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'PartnerAI',
        description: desc,
        order_id: order.order_id,
        handler: async (response: any) => {
          const verifyRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const result = await verifyRes.json();
          if (result.success) {
            toast({ title: '🎉 Welcome to Pro!', description: 'Unlimited messages unlocked!' });
            refreshUsage();
            setPromoCode('');
            setPromoResult(null);
          } else {
            toast({ title: 'Verification failed', description: result.error, variant: 'destructive' });
          }
        },
        prefill: { email: user.email },
        theme: { color: '#7c3aed' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast({ title: 'Payment error', description: e.message, variant: 'destructive' });
    }
    setPaymentLoading(false);
  };

  const userInitial = (user.email?.charAt(0) || 'U').toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background p-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Account Section */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Account</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
            <div className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center shrink-0 text-lg font-bold text-primary-foreground shadow-md shadow-primary/20">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  Signed in via {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email'}
                </p>
              </div>
            </div>

            {/* Change password */}
            <button
              onClick={handleChangePassword}
              disabled={resetLoading}
              className="w-full p-3.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
            >
              {resetLoading ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              ) : (
                <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">Change Password</p>
                <p className="text-[10px] text-muted-foreground">Sends a reset link to your email</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            </button>
          </div>
        </section>

        {/* Theme Section */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Appearance</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden p-4">
            <p className="text-sm font-medium mb-3">Theme</p>
            <div className="flex gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    theme === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border/30 hover:border-primary/30 hover:bg-secondary/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${theme === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-[11px] font-medium ${theme === value ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>


        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Subscription</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${plan === 'pro' ? 'gradient-primary shadow-md shadow-primary/20' : 'bg-secondary/60'}`}>
                <Crown className={`w-5 h-5 ${plan === 'pro' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{plan === 'pro' ? 'Pro Plan ✨' : 'Free Plan'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {plan === 'pro' ? 'Unlimited messages' : `${messagesUsedToday}/${maxMessages} messages used today`}
                </p>
              </div>
            </div>

            {/* Usage bar for free */}
            {plan === 'free' && (
              <div className="px-4 pb-3">
                <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((messagesUsedToday / maxMessages) * 100, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full gradient-primary"
                  />
                </div>
              </div>
            )}

            {/* Upgrade UI inline */}
            {plan === 'free' && (
              <div className="border-t border-border/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Upgrade to Pro — {priceDisplay.symbol}{priceDisplay.amount}/mo</p>
                  <div className="flex items-center bg-secondary/40 rounded-full p-0.5 border border-border/30">
                    <button
                      onClick={() => setCurrency('INR')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${currency === 'INR' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      ₹ INR
                    </button>
                    <button
                      onClick={() => setCurrency('USD')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${currency === 'USD' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      $ USD
                    </button>
                  </div>
                </div>

                <ul className="space-y-1.5">
                  {['Unlimited AI messages', 'Advanced emotion AI', 'Re-upload & refresh chat', 'Priority support'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                    placeholder="Promo code"
                    className="flex-1 h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-xs outline-none focus:border-primary/50 uppercase placeholder:normal-case"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-[11px] gap-1 shrink-0"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoCode.trim()}
                  >
                    {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ticket className="w-3 h-3" />}
                    Apply
                  </Button>
                </div>

                {promoResult?.valid && (
                  <div className="flex items-center gap-2 text-[11px] text-primary bg-primary/5 rounded-lg px-3 py-2 border border-primary/20">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>{promoResult.discount_type === 'percentage' ? `${promoResult.discount_value}% off` : `${priceDisplay.symbol}${promoResult.discount_value} off`} • Pro for {promoResult.plan_duration}</span>
                  </div>
                )}

                <Button
                  className="w-full h-10 rounded-xl gradient-primary border-0 gap-2 text-xs font-semibold shadow-lg shadow-primary/20"
                  onClick={handleUpgrade}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                  ) : promoResult?.valid && isFreePromo ? (
                    <><Ticket className="w-3.5 h-3.5" /> Redeem & Activate Pro</>
                  ) : promoResult?.valid ? (
                    <><Crown className="w-3.5 h-3.5" /> Pay Discounted Price</>
                  ) : (
                    <><Crown className="w-3.5 h-3.5" /> Upgrade to Pro</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Quick Actions</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
            <button
              onClick={() => navigate('/chat')}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircleHeart className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Open Chat</p>
                <p className="text-[11px] text-muted-foreground">Continue chatting with your partner's AI twin</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </button>

            <button
              onClick={() => navigate('/insights')}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Relationship Insights</p>
                <p className="text-[11px] text-muted-foreground">Mood trends, activity & emotion breakdown</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </button>

            {partnerInfo && (
              <button
                onClick={async () => {
                  if (!confirm('This will delete your current partner data so you can upload a new chat. Continue?')) return;
                  await supabase.from('chat_messages').delete().eq('user_id', user!.id);
                  await supabase.from('imported_chats').delete().eq('user_id', user!.id);
                  await supabase.from('chat_sessions').delete().eq('user_id', user!.id);
                  setPartnerInfo(null);
                  toast({ title: 'Ready for re-upload!', description: 'Navigate to chat to upload a new chat.' });
                  navigate('/chat');
                }}
                className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Re-upload Chat</p>
                  <p className="text-[11px] text-muted-foreground">Delete current data & upload new chat</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </button>
            )}
          </div>
        </section>

        {/* Partner Section */}
        {partnerInfo && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Your Partner</p>
            <div className="rounded-2xl bg-card border border-border/30 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg font-bold text-primary">
                  {partnerInfo.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{partnerInfo.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {partnerInfo.messageCount} messages • Since {partnerInfo.createdAt}
                  </p>
                </div>
                <Heart className="w-4 h-4 text-primary/50 shrink-0" />
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

        {/* Legal Links */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Legal</p>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
            {[
              { label: 'Privacy Policy', path: '/privacy' },
              { label: 'Terms of Service', path: '/terms' },
              { label: 'Refund Policy', path: '/refund' },
              { label: 'Contact Support', path: '/contact' },
            ].map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors text-left"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </button>
            ))}
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
