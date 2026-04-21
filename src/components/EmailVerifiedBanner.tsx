import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Mail, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EmailVerifiedBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [user?.id]);

  if (!user || user.email_confirmed_at || dismissed) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    setResending(false);
    if (error) {
      toast({ title: 'Could not resend', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '📧 Verification email sent', description: `Check ${user.email}` });
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 text-xs">
        <Mail className="w-3.5 h-3.5 shrink-0" />
        <p className="flex-1 min-w-0 truncate">
          Verify your email <span className="font-semibold">{user.email}</span> to secure your account.
        </p>
        <button
          onClick={handleResend}
          disabled={resending}
          className="font-semibold hover:underline shrink-0 disabled:opacity-50 flex items-center gap-1"
        >
          {resending && <Loader2 className="w-3 h-3 animate-spin" />}
          Resend
        </button>
        <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 shrink-0" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default EmailVerifiedBanner;