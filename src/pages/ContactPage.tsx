import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircleHeart, Mail, Clock, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const ContactPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    const mailto = `mailto:support@partnerai.app?subject=${encodeURIComponent(subject || 'PartnerAI Support')}&body=${encodeURIComponent(`From: ${email}\n\n${message}`)}`;
    window.location.href = mailto;
    toast({ title: 'Opening email client…', description: 'Your default mail app will open with the details pre-filled.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20 px-4 h-14 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
            <MessageCircleHeart className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">Partner<span className="gradient-text">AI</span></span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Contact & Support</h1>
          <p className="text-muted-foreground text-sm">We're here to help. Reach out anytime.</p>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Mail, title: 'Email Us', desc: 'support@partnerai.app', sub: 'For all enquiries' },
            { icon: Clock, title: 'Response Time', desc: '24–48 hours', sub: 'On business days' },
            { icon: Zap, title: 'Fastest Help', desc: 'Billing & payments', sub: 'Priority support' },
          ].map(({ icon: Icon, title, desc, sub }) => (
            <div key={title} className="p-4 rounded-2xl bg-card border border-border/30 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl gradient-primary mx-auto flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs font-medium text-primary">{desc}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div className="rounded-2xl bg-card border border-border/30 p-6 space-y-4">
          <h2 className="text-base font-bold">Send us a message</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Your email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Refund request, Bug report, General enquiry"
                className="w-full h-9 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue or question in detail…"
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary/40 border border-border/30 text-sm outline-none focus:border-primary/50 transition-colors resize-none"
                required
              />
            </div>
            <Button type="submit" className="w-full h-10 rounded-xl gradient-primary border-0 gap-2 text-sm">
              <Mail className="w-4 h-4" /> Send Message
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground/60 text-center">
            This will open your email client. Or email us directly at{' '}
            <a href="mailto:support@partnerai.app" className="text-primary hover:underline">support@partnerai.app</a>
          </p>
        </div>

        {/* Common topics */}
        <div className="space-y-3">
          <h2 className="text-base font-bold">Common Topics</h2>
          <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
            {[
              { q: 'Payment / Billing issues', link: '/refund' },
              { q: 'How to delete my account or data', link: null },
              { q: 'Promo code not working', link: null },
              { q: 'Bug reports or feature requests', link: null },
              { q: 'Privacy concerns', link: '/privacy' },
            ].map(({ q, link }) => (
              <div key={q} className="flex items-center justify-between p-4">
                <p className="text-sm">{q}</p>
                {link ? (
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] text-primary" onClick={() => navigate(link)}>
                    View Policy →
                  </Button>
                ) : (
                  <a href="mailto:support@partnerai.app" className="text-[11px] text-primary hover:underline">Email us →</a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div className="flex gap-3 p-4 rounded-2xl bg-secondary/20 border border-border/20">
          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your messages to support are kept confidential and used only to resolve your issue. See our{' '}
            <button onClick={() => navigate('/privacy')} className="text-primary hover:underline">Privacy Policy</button>{' '}
            for details.
          </p>
        </div>
      </div>

      <footer className="border-t border-border/10 py-6 text-center text-[11px] text-muted-foreground/40">
        © 2026 PartnerAI. All rights reserved.
      </footer>
    </div>
  );
};

export default ContactPage;
