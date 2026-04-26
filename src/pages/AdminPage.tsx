import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Crown, MessageCircleHeart, Loader2,
  Shield, Trash2, UserPlus, UserMinus, RefreshCw, Plus,
  Ticket, Edit2, X, Check, ChevronDown, ChevronUp,
  Search, Download, FileText, IndianRupee, TrendingUp,
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
  plan_duration: string;
  subscription_status: string;
  current_period_end: string | null;
  roles: string[];
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  valid_from: string;
  valid_until: string | null;
  plan_duration: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  totalMessages: number;
  totalPromos: number;
  mrr?: number;
  arr?: number;
  totalRevenue?: number;
  newUsers7d?: number;
  newUsers30d?: number;
}

type Tab = 'users' | 'promos' | 'audit';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
}

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'pro' | 'free' | 'admin'>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Promo form state
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    max_uses: '',
    valid_until: '',
    plan_duration: 'month',
    is_active: true,
  });

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const apiCall = useCallback(async (action: string, method = 'GET', body?: any) => {
    const token = await getToken();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=${action}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      const [usersRes, statsRes, promosRes] = await Promise.all([
        apiCall('users'),
        apiCall('stats'),
        apiCall('promo-codes'),
      ]);
      setUsers(usersRes.users);
      setStats(statsRes);
      setPromos(promosRes.promos);
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
    if (!authLoading && !user) navigate('/login');
    else if (user) loadData();
  }, [authLoading, user, navigate, loadData]);

  // Lazy-load audit log when tab opens
  useEffect(() => {
    if (activeTab !== 'audit' || auditLogs.length > 0) return;
    setAuditLoading(true);
    apiCall('audit-log')
      .then(res => setAuditLogs(res.logs || []))
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  }, [activeTab, auditLogs.length, apiCall]);

  // Filtered users
  const filteredUsers = users.filter(u => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || u.email?.toLowerCase().includes(q);
    const matchesPlan =
      planFilter === 'all' ? true :
      planFilter === 'admin' ? u.roles.includes('admin') :
      u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) {
      toast({ title: 'Nothing to export', variant: 'destructive' });
      return;
    }
    const cols = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportUsers = () => exportCSV(
    filteredUsers.map(u => ({
      email: u.email, plan: u.plan, plan_duration: u.plan_duration,
      status: u.subscription_status, period_end: u.current_period_end,
      roles: u.roles.join('|'), joined: u.created_at, last_sign_in: u.last_sign_in_at,
    })),
    `users-${new Date().toISOString().slice(0, 10)}.csv`
  );

  const handleExportPayments = async () => {
    try {
      const res = await apiCall('payments');
      exportCSV(
        (res.payments || []).map((p: any) => ({
          email: p.email, amount: p.amount, currency: p.currency,
          plan: p.plan, plan_duration: p.plan_duration, status: p.status,
          promo_code: p.promo_code, razorpay_order_id: p.razorpay_order_id,
          razorpay_payment_id: p.razorpay_payment_id, created_at: p.created_at,
        })),
        `payments-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleAction = async (action: string, body: any, loadingKey: string) => {
    setActionLoading(loadingKey);
    try {
      await apiCall(action, 'POST', body);
      toast({ title: 'Success', description: 'Action completed' });
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const resetPromoForm = () => {
    setPromoForm({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', valid_until: '', plan_duration: 'month', is_active: true });
    setEditingPromo(null);
    setShowPromoForm(false);
  };

  const handleSavePromo = async () => {
    if (!promoForm.code || !promoForm.discount_value) {
      toast({ title: 'Missing fields', description: 'Code and discount value are required', variant: 'destructive' });
      return;
    }
    setActionLoading('save-promo');
    try {
      if (editingPromo) {
        await apiCall('update-promo', 'POST', {
          promoId: editingPromo.id,
          code: promoForm.code,
          discount_type: promoForm.discount_type,
          discount_value: Number(promoForm.discount_value),
          max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
          valid_until: promoForm.valid_until || null,
          plan_duration: promoForm.plan_duration,
          is_active: promoForm.is_active,
        });
      } else {
        await apiCall('create-promo', 'POST', {
          code: promoForm.code,
          discount_type: promoForm.discount_type,
          discount_value: Number(promoForm.discount_value),
          max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
          valid_until: promoForm.valid_until || null,
          plan_duration: promoForm.plan_duration,
          is_active: promoForm.is_active,
        });
      }
      toast({ title: editingPromo ? 'Promo updated' : 'Promo created' });
      resetPromoForm();
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const startEditPromo = (p: PromoCode) => {
    setEditingPromo(p);
    setPromoForm({
      code: p.code,
      discount_type: p.discount_type as 'percentage' | 'fixed',
      discount_value: String(p.discount_value),
      max_uses: p.max_uses ? String(p.max_uses) : '',
      valid_until: p.valid_until ? p.valid_until.split('T')[0] : '',
      plan_duration: p.plan_duration,
      is_active: p.is_active,
    });
    setShowPromoForm(true);
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Admin Dashboard</h1>
        <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Stats */}
        {stats && (
          <div className="space-y-3">
            {/* Revenue cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'MRR', value: `₹${(stats.mrr ?? 0).toLocaleString()}`, icon: IndianRupee, accent: true },
                { label: 'ARR', value: `₹${(stats.arr ?? 0).toLocaleString()}`, icon: TrendingUp, accent: true },
                { label: 'Total Revenue', value: `₹${(stats.totalRevenue ?? 0).toLocaleString()}`, icon: IndianRupee },
              ].map(({ label, value, icon: Icon, accent }) => (
                <div key={label} className={`p-3.5 rounded-2xl border space-y-1 ${accent ? 'bg-gradient-to-br from-primary/10 to-card border-primary/20' : 'bg-card border-border/30'}`}>
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>
            {/* Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Users', value: stats.totalUsers, icon: Users, sub: stats.newUsers7d != null ? `+${stats.newUsers7d} (7d)` : null },
                { label: 'Pro', value: stats.proUsers, icon: Crown, sub: null },
                { label: 'Free', value: stats.freeUsers, icon: Users, sub: null },
                { label: 'Messages', value: stats.totalMessages, icon: MessageCircleHeart, sub: null },
                { label: 'Promos', value: stats.totalPromos, icon: Ticket, sub: null },
              ].map(({ label, value, icon: Icon, sub }) => (
                <div key={label} className="p-3 rounded-2xl bg-card border border-border/30 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                  <p className="text-xl font-bold">{value.toLocaleString()}</p>
                  {sub && <p className="text-[9px] text-primary/70">{sub}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 border border-border/20">
          {(['users', 'promos', 'audit'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all ${activeTab === tab ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab === 'users' ? '👥 Users' : tab === 'promos' ? '🎟️ Promo Codes' : '📝 Audit'}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <section className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by email…"
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/40 border border-border/30 text-xs outline-none focus:border-primary/50"
                />
              </div>
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value as any)}
                className="h-8 px-2 rounded-lg bg-secondary/40 border border-border/30 text-xs outline-none focus:border-primary/50"
              >
                <option value="all">All</option>
                <option value="pro">Pro</option>
                <option value="free">Free</option>
                <option value="admin">Admins</option>
              </select>
              <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={handleExportUsers}>
                <Download className="w-3 h-3" /> Users CSV
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={handleExportPayments}>
                <FileText className="w-3 h-3" /> Payments CSV
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground px-1">
              Showing {filteredUsers.length} of {users.length}
            </p>
            <div className="space-y-2">
              {filteredUsers.length === 0 && (
                <div className="rounded-2xl bg-card border border-border/30 p-8 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users match your filters</p>
                </div>
              )}
              {filteredUsers.map(u => {
                const isExpanded = expandedUser === u.id;
                return (
                  <div key={u.id} className="rounded-2xl bg-card border border-border/30 overflow-hidden">
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
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
                            {u.plan === 'pro' ? `👑 Pro (${u.plan_duration})` : 'Free'}
                          </span>
                          {u.roles.includes('admin') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Admin</span>
                          )}
                          {u.current_period_end && u.plan === 'pro' && (
                            <span className="text-[10px] text-muted-foreground/50">
                              Expires {new Date(u.current_period_end).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-muted-foreground">Joined:</span>{' '}
                                <span>{new Date(u.created_at).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last login:</span>{' '}
                                <span>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}</span>
                              </div>
                            </div>

                            {/* Subscription management */}
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold text-muted-foreground">Subscription</p>
                              <div className="flex flex-wrap gap-2">
                                {u.plan !== 'pro' ? (
                                  <>
                                    {['week', 'month', 'year'].map(dur => (
                                      <Button
                                        key={dur}
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[11px] gap-1"
                                        disabled={actionLoading === `upgrade-${u.id}-${dur}`}
                                        onClick={() => handleAction('update-subscription', { userId: u.id, plan: 'pro', status: 'active', duration: dur }, `upgrade-${u.id}-${dur}`)}
                                      >
                                        {actionLoading === `upgrade-${u.id}-${dur}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                                        Pro ({dur})
                                      </Button>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] gap-1"
                                      disabled={actionLoading === `downgrade-${u.id}`}
                                      onClick={() => handleAction('update-subscription', { userId: u.id, plan: 'free', status: 'active', duration: 'month' }, `downgrade-${u.id}`)}
                                    >
                                      Downgrade to Free
                                    </Button>
                                    {/* Change duration */}
                                    {['week', 'month', 'year'].filter(d => d !== u.plan_duration).map(dur => (
                                      <Button
                                        key={dur}
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[11px] gap-1"
                                        disabled={actionLoading === `change-dur-${u.id}-${dur}`}
                                        onClick={() => handleAction('update-subscription', { userId: u.id, plan: 'pro', status: 'active', duration: dur }, `change-dur-${u.id}-${dur}`)}
                                      >
                                        Switch to {dur}
                                      </Button>
                                    ))}
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1 text-destructive border-destructive/20"
                                  disabled={actionLoading === `delete-sub-${u.id}`}
                                  onClick={() => handleAction('delete-subscription', { userId: u.id }, `delete-sub-${u.id}`)}
                                >
                                  Delete Sub
                                </Button>
                              </div>
                            </div>

                            {/* Admin / Data actions */}
                            <div className="flex flex-wrap gap-2">
                              {!u.roles.includes('admin') ? (
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                                  disabled={actionLoading === `add-admin-${u.id}`}
                                  onClick={() => handleAction('add-admin', { userId: u.id }, `add-admin-${u.id}`)}>
                                  <UserPlus className="w-3 h-3" /> Make Admin
                                </Button>
                              ) : u.id !== user?.id ? (
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-destructive"
                                  disabled={actionLoading === `remove-admin-${u.id}`}
                                  onClick={() => handleAction('remove-admin', { userId: u.id }, `remove-admin-${u.id}`)}>
                                  <UserMinus className="w-3 h-3" /> Remove Admin
                                </Button>
                              ) : null}
                              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-destructive border-destructive/20"
                                disabled={actionLoading === `delete-data-${u.id}`}
                                onClick={() => { if (confirm(`Delete all data for ${u.email}?`)) handleAction('delete-user-data', { userId: u.id }, `delete-data-${u.id}`); }}>
                                <Trash2 className="w-3 h-3" /> Delete Data
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Promo Codes Tab */}
        {activeTab === 'promos' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Promo Codes ({promos.length})
              </p>
              <Button size="sm" className="h-8 text-xs gap-1 gradient-primary border-0" onClick={() => { resetPromoForm(); setShowPromoForm(true); }}>
                <Plus className="w-3 h-3" /> Create
              </Button>
            </div>

            {/* Promo Form */}
            <AnimatePresence>
              {showPromoForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl bg-card border border-primary/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{editingPromo ? 'Edit Promo' : 'New Promo Code'}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetPromoForm}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] text-muted-foreground mb-1 block">Code</label>
                        <input
                          value={promoForm.code}
                          onChange={e => setPromoForm(p => ({ ...p, code: e.target.value }))}
                          placeholder="e.g. WELCOME50"
                          className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Type</label>
                        <select
                          value={promoForm.discount_type}
                          onChange={e => setPromoForm(p => ({ ...p, discount_type: e.target.value as any }))}
                          className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">
                          {promoForm.discount_type === 'percentage' ? 'Discount %' : 'Amount ₹'}
                        </label>
                        <input
                          type="number"
                          value={promoForm.discount_value}
                          onChange={e => setPromoForm(p => ({ ...p, discount_value: e.target.value }))}
                          placeholder={promoForm.discount_type === 'percentage' ? '50' : '100'}
                          className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Max Uses</label>
                        <input
                          type="number"
                          value={promoForm.max_uses}
                          onChange={e => setPromoForm(p => ({ ...p, max_uses: e.target.value }))}
                          placeholder="Unlimited"
                          className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Duration</label>
                        <select
                          value={promoForm.plan_duration}
                          onChange={e => setPromoForm(p => ({ ...p, plan_duration: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50"
                        >
                          <option value="week">1 Week</option>
                          <option value="month">1 Month</option>
                          <option value="year">1 Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Expires On</label>
                        <input
                          type="date"
                          value={promoForm.valid_until}
                          onChange={e => setPromoForm(p => ({ ...p, valid_until: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={promoForm.is_active}
                            onChange={e => setPromoForm(p => ({ ...p, is_active: e.target.checked }))}
                            className="rounded"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </div>
                    </div>

                    <Button
                      onClick={handleSavePromo}
                      disabled={actionLoading === 'save-promo'}
                      className="w-full h-9 gradient-primary border-0 text-sm gap-1"
                    >
                      {actionLoading === 'save-promo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {editingPromo ? 'Update' : 'Create'} Promo Code
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Promo list */}
            <div className="space-y-2">
              {promos.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No promo codes yet. Create one above!
                </div>
              )}
              {promos.map(p => (
                <div key={p.id} className={`rounded-2xl bg-card border ${p.is_active ? 'border-border/30' : 'border-destructive/20 opacity-60'} p-4 space-y-2`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Ticket className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold font-mono">{p.code}</p>
                        {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Inactive</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {p.discount_type === 'percentage' ? `${p.discount_value}% off` : `₹${p.discount_value} off`}
                        {' • '}Pro for {p.plan_duration}
                        {' • '}{p.times_used}/{p.max_uses || '∞'} used
                        {p.valid_until && ` • Expires ${new Date(p.valid_until).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => startEditPromo(p)}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => handleAction('update-promo', { promoId: p.id, is_active: !p.is_active }, `toggle-${p.id}`)}
                      disabled={actionLoading === `toggle-${p.id}`}
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-destructive border-destructive/20"
                      disabled={actionLoading === `delete-promo-${p.id}`}
                      onClick={() => { if (confirm(`Delete promo ${p.code}?`)) handleAction('delete-promo', { promoId: p.id }, `delete-promo-${p.id}`); }}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Audit Log ({auditLogs.length})
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={() => exportCSV(
                  auditLogs.map(l => ({
                    created_at: l.created_at, action: l.action,
                    admin_id: l.admin_id, target_user_id: l.target_user_id ?? '',
                    details: l.details ? JSON.stringify(l.details) : '',
                  })),
                  `audit-${new Date().toISOString().slice(0, 10)}.csv`
                )}
              >
                <Download className="w-3 h-3" /> Export
              </Button>
            </div>
            {auditLoading ? (
              <div className="rounded-2xl bg-card border border-border/30 p-8 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="rounded-2xl bg-card border border-border/30 p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No admin actions recorded yet</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-primary">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.target_user_id && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        target: <span className="font-mono">{log.target_user_id}</span>
                      </p>
                    )}
                    {log.details && (
                      <p className="text-[10px] text-muted-foreground/70 font-mono truncate">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </motion.div>
    </div>
  );
};

export default AdminPage;
