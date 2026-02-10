import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { MessageCircleHeart, Heart, Sparkles, Shield, ArrowRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl gradient-primary animate-pulse flex items-center justify-center">
          <MessageCircleHeart className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      {/* Settings icon for logged in users */}
      {user && (
        <button
          onClick={() => navigate('/settings')}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md space-y-8 z-10"
      >
        {/* Logo */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary glow-primary"
          >
            <MessageCircleHeart className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Partner<span className="gradient-text">AI</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto">
              Upload your WhatsApp chat and talk to your partner's AI twin. They'll text back just like the real thing 💕
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Heart, label: 'Learns their style' },
            { icon: Sparkles, label: 'Real-time replies' },
            { icon: Shield, label: 'Private & secure' },
          ].map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50"
            >
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground text-center">{label}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="space-y-3">
          {user ? (
            <Button
              onClick={() => navigate('/chat')}
              className="w-full h-12 rounded-xl gradient-primary border-0 text-base gap-2"
            >
              Start Chatting <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full h-12 rounded-xl gradient-primary border-0 text-base gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Free to use • Sign up with email or Google
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
