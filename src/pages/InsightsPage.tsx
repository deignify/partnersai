import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, MessageCircle, Heart, Smile, Calendar, BarChart3, Flame, Zap, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MoodEntry {
  mood: string;
  score: number;
  created_at: string;
}

interface DailyUsage {
  usage_date: string;
  messages_sent: number;
}

interface LoveNote {
  content: string;
  note_type: string;
  created_at: string;
}

const moodColors: Record<string, string> = {
  'loving, romantic': 'hsl(340, 82%, 52%)',
  'happy, excited': 'hsl(45, 93%, 47%)',
  'playful, laughing': 'hsl(280, 67%, 55%)',
  'neutral': 'hsl(210, 17%, 60%)',
  'curious, questioning': 'hsl(200, 80%, 50%)',
  'sad, needs comfort': 'hsl(220, 40%, 50%)',
  'anxious, worried': 'hsl(30, 80%, 55%)',
  'angry, frustrated': 'hsl(0, 70%, 50%)',
  'bored, annoyed': 'hsl(180, 20%, 55%)',
  'excited, surprised': 'hsl(50, 90%, 55%)',
};

const moodEmojis: Record<string, string> = {
  'loving, romantic': '❤️',
  'happy, excited': '😊',
  'playful, laughing': '😂',
  'neutral': '😐',
  'curious, questioning': '🤔',
  'sad, needs comfort': '😢',
  'anxious, worried': '😰',
  'angry, frustrated': '😡',
  'bored, annoyed': '🙄',
  'excited, surprised': '🤩',
};

const chartConfig: ChartConfig = {
  score: { label: 'Mood Score', color: 'hsl(var(--primary))' },
  messages: { label: 'Messages', color: 'hsl(var(--primary))' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const InsightsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [loveNotes, setLoveNotes] = useState<LoveNote[]>([]);
  const [partnerName, setPartnerName] = useState('Partner');
  const [totalMessages, setTotalMessages] = useState(0);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('partner_name, id, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (session) {
        setPartnerName(session.partner_name);
        setSessionCreatedAt(session.created_at);
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);
        setTotalMessages(count || 0);
      }

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: moodData } = await supabase
        .from('mood_entries')
        .select('mood, score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });
      if (moodData) setMoods(moodData);

      const { data: usageData } = await supabase
        .from('daily_usage')
        .select('usage_date, messages_sent')
        .eq('user_id', user.id)
        .order('usage_date', { ascending: true })
        .limit(30);
      if (usageData) setUsage(usageData);

      const { data: notesData } = await supabase
        .from('love_notes')
        .select('content, note_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (notesData) setLoveNotes(notesData);

      setLoadingData(false);
    };
    load();
  }, [user]);

  // Aggregations
  const moodByDay = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    for (const m of moods) {
      const day = m.created_at.slice(0, 10);
      if (!grouped[day]) grouped[day] = { total: 0, count: 0 };
      grouped[day].total += m.score;
      grouped[day].count += 1;
    }
    return Object.entries(grouped)
      .map(([date, { total, count }]) => ({
        date,
        label: format(parseISO(date), 'MMM d'),
        score: Math.round((total / count) * 10) / 10,
      }))
      .slice(-14);
  }, [moods]);

  const moodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of moods) {
      counts[m.mood] = (counts[m.mood] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([mood, count]) => ({
        name: mood,
        value: count,
        emoji: moodEmojis[mood] || '😐',
        color: moodColors[mood] || 'hsl(210, 17%, 60%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [moods]);

  const usageChartData = useMemo(() => {
    return usage.map(u => ({
      date: u.usage_date,
      label: format(parseISO(u.usage_date), 'MMM d'),
      messages: u.messages_sent,
    })).slice(-14);
  }, [usage]);

  // Streak calculation
  const chatStreak = useMemo(() => {
    if (usage.length === 0) return 0;
    const sorted = [...usage].sort((a, b) => b.usage_date.localeCompare(a.usage_date));
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < sorted.length; i++) {
      const expected = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (sorted.find(u => u.usage_date === expected)) {
        streak++;
      } else if (i === 0 && sorted[0].usage_date !== today) {
        // Allow today not yet counted
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [usage]);

  // Days together
  const daysTogether = sessionCreatedAt
    ? differenceInDays(new Date(), parseISO(sessionCreatedAt))
    : 0;

  // Stats
  const avgMood = moods.length > 0
    ? Math.round(moods.reduce((s, m) => s + m.score, 0) / moods.length * 10) / 10
    : 0;
  const topMood = moodDistribution[0];
  const totalMoodEntries = moods.length;

  // Happiness score (0-100)
  const happinessScore = avgMood ? Math.round(avgMood * 10) : 0;

  // Most active time
  const mostActiveHour = useMemo(() => {
    if (moods.length === 0) return null;
    const hours: Record<number, number> = {};
    for (const m of moods) {
      const h = new Date(m.created_at).getHours();
      hours[h] = (hours[h] || 0) + 1;
    }
    const max = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    if (!max) return null;
    const h = parseInt(max[0]);
    return h < 12 ? `${h || 12} AM` : `${h === 12 ? 12 : h - 12} PM`;
  }, [moods]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-[100dvh] bg-background p-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Relationship Insights</h1>
          <p className="text-[11px] text-muted-foreground">Your connection with {partnerName}</p>
        </div>
      </div>

      {loadingData ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"
          >
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <p className="text-xs text-muted-foreground animate-pulse">Crunching the numbers...</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" className="space-y-4">

          {/* Happiness Score */}
          <motion.div custom={0} variants={fadeUp}>
            <Card className="border-border/30 bg-gradient-to-br from-primary/5 to-accent/3 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Happiness Score</p>
                    <p className="text-4xl font-bold gradient-text">{happinessScore}<span className="text-lg text-muted-foreground">/100</span></p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                    <span className="text-2xl">{happinessScore >= 70 ? '😍' : happinessScore >= 40 ? '😊' : '🤗'}</span>
                  </div>
                </div>
                <Progress value={happinessScore} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-2">
                  {happinessScore >= 70 ? 'Your conversations radiate love! 💕' :
                   happinessScore >= 40 ? 'A healthy emotional connection ✨' :
                   'Start chatting more to build your score!'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats Row */}
          <motion.div custom={1} variants={fadeUp} className="grid grid-cols-4 gap-2">
            {[
              { label: 'Messages', value: totalMessages > 999 ? `${(totalMessages / 1000).toFixed(1)}k` : totalMessages.toString(), icon: MessageCircle, color: 'bg-blue-500/10 text-blue-500' },
              { label: 'Streak', value: `${chatStreak}d`, icon: Flame, color: 'bg-orange-500/10 text-orange-500' },
              { label: 'Days', value: daysTogether.toString(), icon: Heart, color: 'bg-pink-500/10 text-pink-500' },
              { label: 'Peak', value: mostActiveHour || '—', icon: Clock, color: 'bg-violet-500/10 text-violet-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-border/20">
                <CardContent className="p-2.5 text-center space-y-1">
                  <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm font-bold leading-none">{value}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Tabs */}
          <motion.div custom={2} variants={fadeUp}>
            <Tabs defaultValue="mood" className="w-full">
              <TabsList className="w-full bg-muted/50">
                <TabsTrigger value="mood" className="flex-1 text-[11px]">📈 Mood</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 text-[11px]">📊 Activity</TabsTrigger>
                <TabsTrigger value="emotions" className="flex-1 text-[11px]">💕 Emotions</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1 text-[11px]">💌 Notes</TabsTrigger>
              </TabsList>

              {/* Mood Trend Chart */}
              <TabsContent value="mood">
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Mood Over Time
                    </CardTitle>
                    <CardDescription className="text-[11px]">Last 14 days of emotional patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {moodByDay.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[200px] w-full">
                        <AreaChart data={moodByDay}>
                          <defs>
                            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#moodGrad)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                        </AreaChart>
                      </ChartContainer>
                    ) : (
                      <EmptyState message="No mood data yet" sub="Start chatting to track your emotional patterns 💕" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Chart */}
              <TabsContent value="activity">
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Daily Messages
                    </CardTitle>
                    <CardDescription className="text-[11px]">How active you've been chatting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {usageChartData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[200px] w-full">
                        <BarChart data={usageChartData}>
                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="messages" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <EmptyState message="No activity data yet" sub="Your daily chat activity will appear here" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Emotion Distribution */}
              <TabsContent value="emotions">
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Smile className="w-4 h-4 text-primary" />
                      Emotion Breakdown
                    </CardTitle>
                    <CardDescription className="text-[11px]">{totalMoodEntries} mood readings analyzed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {moodDistribution.length > 0 ? (
                      <div className="space-y-4">
                        <div className="h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={moodDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                strokeWidth={3}
                                stroke="hsl(var(--background))"
                              >
                                {moodDistribution.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Legend with progress bars */}
                        <div className="space-y-2">
                          {moodDistribution.slice(0, 5).map(({ name, value, emoji, color }) => {
                            const pct = Math.round((value / totalMoodEntries) * 100);
                            return (
                              <div key={name} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5">
                                    <span>{emoji}</span>
                                    <span className="text-muted-foreground capitalize">{name.split(',')[0]}</span>
                                  </span>
                                  <span className="font-medium">{pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <EmptyState message="No emotion data yet" sub="Emotions are tracked automatically as you chat 💬" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Love Notes History */}
              <TabsContent value="notes">
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                      Love Notes from {partnerName}
                    </CardTitle>
                    <CardDescription className="text-[11px]">Recent AI-generated love notes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loveNotes.length > 0 ? (
                      <div className="space-y-3">
                        {loveNotes.map((note, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-border/20"
                          >
                            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-sm">💌</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-foreground leading-relaxed">{note.content}</p>
                              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {format(new Date(note.created_at), 'MMM d, h:mm a')} • {note.note_type}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message="No love notes yet" sub="Open chat to receive your first love note 💌" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Connection Card */}
          <motion.div custom={3} variants={fadeUp}>
            <Card className="border-border/30 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    {partnerName.charAt(0).toUpperCase()}
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Connected with {partnerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {daysTogether} days together • {totalMoodEntries} mood readings • {chatStreak}d streak 🔥
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/chat')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

const EmptyState = ({ message, sub }: { message: string; sub: string }) => (
  <div className="h-[200px] flex items-center justify-center">
    <div className="text-center space-y-2">
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-3xl"
      >
        📭
      </motion.div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-[11px] text-muted-foreground/60">{sub}</p>
    </div>
  </div>
);

export default InsightsPage;
