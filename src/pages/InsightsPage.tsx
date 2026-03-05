import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, MessageCircle, Heart, Smile, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
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

const InsightsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [partnerName, setPartnerName] = useState('Partner');
  const [totalMessages, setTotalMessages] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Load session info
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('partner_name, id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (session) {
        setPartnerName(session.partner_name);
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);
        setTotalMessages(count || 0);
      }

      // Load mood entries (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: moodData } = await supabase
        .from('mood_entries')
        .select('mood, score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      if (moodData) setMoods(moodData);

      // Load daily usage (last 30 days)
      const { data: usageData } = await supabase
        .from('daily_usage')
        .select('usage_date, messages_sent')
        .eq('user_id', user.id)
        .order('usage_date', { ascending: true })
        .limit(30);

      if (usageData) setUsage(usageData);
      setLoadingData(false);
    };
    load();
  }, [user]);

  // Aggregate mood data by day
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

  // Mood distribution for pie chart
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

  // Usage chart data
  const usageChartData = useMemo(() => {
    return usage.map(u => ({
      date: u.usage_date,
      label: format(parseISO(u.usage_date), 'MMM d'),
      messages: u.messages_sent,
    })).slice(-14);
  }, [usage]);

  // Stats
  const avgMood = moods.length > 0
    ? Math.round(moods.reduce((s, m) => s + m.score, 0) / moods.length * 10) / 10
    : 0;

  const topMood = moodDistribution[0];
  const totalMoodEntries = moods.length;

  if (authLoading || !user) return null;

  return (
    <div className="min-h-[100dvh] bg-background p-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Relationship Insights</h1>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-xl gradient-primary animate-pulse flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Messages', value: totalMessages.toLocaleString(), icon: MessageCircle, color: 'text-primary' },
              { label: 'Avg Mood', value: avgMood ? `${avgMood}/10` : '—', icon: Heart, color: 'text-pink-500' },
              { label: 'Top Mood', value: topMood?.emoji || '—', icon: Smile, color: 'text-yellow-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-border/30">
                <CardContent className="p-3 text-center space-y-1">
                  <Icon className={`w-4 h-4 mx-auto ${color}`} />
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="mood" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="mood" className="flex-1 text-xs">Mood Trends</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-xs">Activity</TabsTrigger>
              <TabsTrigger value="emotions" className="flex-1 text-xs">Emotions</TabsTrigger>
            </TabsList>

            {/* Mood Trend Chart */}
            <TabsContent value="mood">
              <Card className="border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Mood Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {moodByDay.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <AreaChart data={moodByDay}>
                        <defs>
                          <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#moodGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center space-y-2">
                        <p>No mood data yet</p>
                        <p className="text-[11px]">Start chatting to track your emotional patterns 💕</p>
                      </div>
                    </div>
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
                </CardHeader>
                <CardContent>
                  {usageChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <BarChart data={usageChartData}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      No activity data yet
                    </div>
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
                              outerRadius={70}
                              strokeWidth={2}
                              stroke="hsl(var(--background))"
                            >
                              {moodDistribution.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {moodDistribution.slice(0, 6).map(({ name, value, emoji, color }) => (
                          <div key={name} className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="truncate">{emoji} {name}</span>
                            <span className="text-muted-foreground ml-auto shrink-0">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center space-y-2">
                        <p>No emotion data yet</p>
                        <p className="text-[11px]">Emotions are tracked automatically as you chat 💬</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Partner connection */}
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">Chatting with {partnerName}</p>
                  <p className="text-[11px] text-muted-foreground">{totalMoodEntries} mood readings tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPage;
