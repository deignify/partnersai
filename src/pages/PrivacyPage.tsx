import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircleHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const PrivacyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
        </div>

        <Section title="1. Introduction">
          <p>PartnerAI ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our services, accessible at muse-my-chats.lovable.app.</p>
          <p>By using PartnerAI, you agree to the collection and use of information in accordance with this policy. This policy complies with the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, India.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-foreground">Account Information:</strong> When you register, we collect your email address and authentication provider data (e.g., Google OAuth).</p>
          <p><strong className="text-foreground">Chat Data:</strong> We store the WhatsApp chat export you upload, AI conversation messages, and the learned style profile of your partner. This data is used solely to power the AI twin feature.</p>
          <p><strong className="text-foreground">Usage Data:</strong> We collect daily message counts to enforce free-tier limits.</p>
          <p><strong className="text-foreground">Payment Data:</strong> Payments are processed by Razorpay. We store only a subscription status and period — we do not store your card details.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your data to: provide and maintain the PartnerAI service; personalize the AI responses based on your uploaded chat history; process payments and manage subscriptions; communicate service updates or respond to support requests; and enforce our usage limits and Terms of Service.</p>
        </Section>

        <Section title="4. Data Storage & Security">
          <p>Your data is stored securely in encrypted databases. All data is associated with your user account and is not shared with or accessible by other users. We implement industry-standard security measures including HTTPS encryption in transit and AES encryption at rest.</p>
          <p>Chat data and AI conversations are stored only for the purpose of providing the service. You can delete all your data at any time from Settings → Delete All Data.</p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do not sell, trade, or rent your personal information. We may share data with:</p>
          <p><strong className="text-foreground">Service Providers:</strong> Supabase (database infrastructure), Razorpay (payment processing), and AI model providers (OpenAI/Google) to generate responses. These providers are bound by their own privacy policies.</p>
          <p><strong className="text-foreground">Legal Requirements:</strong> If required by law, court order, or government authority in India.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>You have the right to access, correct, or delete your personal data. You can delete all your uploaded chat data and conversation history from the Settings page. To request account deletion or data export, contact us at support@partnerai.app.</p>
        </Section>

        <Section title="7. Cookies">
          <p>We use only essential cookies and local storage required for authentication and session management. We do not use advertising or tracking cookies.</p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>PartnerAI is not intended for users under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with data, contact us immediately.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy periodically. We will notify you of significant changes by posting the new policy on this page with an updated date. Continued use of the service after changes constitutes acceptance.</p>
        </Section>

        <Section title="10. Contact Us">
          <p>For privacy-related queries, contact: <a href="mailto:support@partnerai.app" className="text-primary hover:underline">support@partnerai.app</a></p>
          <p>PartnerAI, India</p>
        </Section>
      </div>

      <footer className="border-t border-border/10 py-6 text-center text-[11px] text-muted-foreground/40">
        © 2026 PartnerAI. All rights reserved.
      </footer>
    </div>
  );
};

export default PrivacyPage;
