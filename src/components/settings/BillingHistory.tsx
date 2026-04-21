import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  plan_duration: string;
  status: string;
  promo_code: string | null;
  created_at: string;
}

const BillingHistory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setItems(data || []));
  }, [user]);

  if (items === null) {
    return (
      <div className="rounded-2xl bg-card border border-border/30 p-6 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/30 p-6 text-center">
        <Receipt className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No payments yet</p>
      </div>
    );
  }

  const symbol = (c: string) => c === 'INR' ? '₹' : c === 'USD' ? '$' : c;

  return (
    <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
      {items.map(p => (
        <div key={p.id} className="p-3.5 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${p.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {symbol(p.currency)}{p.amount} • {p.plan} ({p.plan_duration})
            </p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(p.created_at), 'd MMM yyyy, h:mm a')}
              {p.promo_code && <span className="ml-1.5 text-primary">• {p.promo_code}</span>}
            </p>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${p.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
            {p.status}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BillingHistory;