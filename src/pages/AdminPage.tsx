import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Crown, MessageCircleHeart, Loader2,
  Shield, Trash2, UserPlus, UserMinus, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  plan: string;
  subscription_status: string;
  current_period_end: string | null;
  roles: string[];
}

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  totalMessages: number;
}

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const apiCall = useCallback(async (action: string, method = 'GET', body?: any) => {
    const token = await getToken();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=${action}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'API error');
    }
    return res.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiCall('users'),
        apiCall('stats'),
      ]);
      setUsers(usersRes.users);
      setStats(statsRes);
      setIsAdmin(true);
    } catch (e: any) {
      if (e.message.includes('Forbidden') || e.message.includes('Admin')) {
        setIsAdmin(false);
      } else {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      }
    }
    setLoading(false);
  }, [apiCall, toast]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (user) loadData();
  }, [authLoading, user, navigate, loadData]);

  const handleAction = async (action: string, userId: string, extra?: any) => {
    setActionLoading(`${action}-${userId}`);
    try {
      await apiCall(action, 'POST', { userId, ...extra });
      toast({ title: 'Success', description: `Action completed` });
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  if (authLoading || !user) return null;

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Shield className="w-16 h-16 text-destructive/50" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-sm text-muted-foreground text-center">You don't have admin privileges.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Admin Dashboard</h1>
        <Button variant="ghost" size="icon" onClick={loadData} className="ml-auto">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users },
              { label: 'Pro Users', value: stats.proUsers, icon: Crown },
              { label: 'Free Users', value: stats.freeUsers, icon: Users },
              { label: 'Messages', value: stats.totalMessages, icon: MessageCircleHeart },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-4 rounded-2xl bg-card border border-border/30 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Table */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Users ({users.length})
          </p>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="rounded-2xl bg-card border border-border/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${u.roles.includes('admin') ? 'gradient-primary' : 'bg-secondary/60'}`}>
                    {u.roles.includes('admin') ? (
                      <Shield className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{u.email?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.email}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.plan === 'pro' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        {u.plan === 'pro' ? '👑 Pro' : 'Free'}
                      </span>
                      {u.roles.includes('admin') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Admin</span>
                      )}
                      <span className="text-[10px] text-muted-foreground/50">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {u.plan !== 'pro' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      disabled={actionLoading === `update-subscription-${u.id}`}
                      onClick={() => handleAction('update-subscription', u.id, { plan: 'pro', status: 'active' })}
                    >
                      {actionLoading === `update-subscription-${u.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                      Give Pro
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      disabled={actionLoading === `update-subscription-${u.id}`}
                      onClick={() => handleAction('update-subscription', u.id, { plan: 'free', status: 'active' })}
                    >
                      Remove Pro
                    </Button>
                  )}

                  {!u.roles.includes('admin') ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      disabled={actionLoading === `add-admin-${u.id}`}
                      onClick={() => handleAction('add-admin', u.id)}
                    >
                      <UserPlus className="w-3 h-3" /> Make Admin
                    </Button>
                  ) : u.id !== user?.id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1 text-destructive"
                      disabled={actionLoading === `remove-admin-${u.id}`}
                      onClick={() => handleAction('remove-admin', u.id)}
                    >
                      <UserMinus className="w-3 h-3" /> Remove Admin
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 text-destructive border-destructive/20"
                    disabled={actionLoading === `delete-user-data-${u.id}`}
                    onClick={() => {
                      if (confirm(`Delete all data for ${u.email}?`)) {
                        handleAction('delete-user-data', u.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" /> Delete Data
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
};

export default AdminPage;
