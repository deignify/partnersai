import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircleHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const RefundPage = () => {
  const navigate = useNavigate();
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Cancellation & Refund Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          This policy applies to all Pro plan subscriptions purchased through PartnerAI and is compliant with the Consumer Protection Act, 2019 (India) and applicable RBI guidelines on digital payments.
        </p>

        <Section title="1. Subscription Model">
          <p>PartnerAI Pro is a prepaid subscription service available in weekly, monthly, and yearly plans. Subscriptions grant access to unlimited AI messages and Pro features for the purchased duration.</p>
        </Section>

        <Section title="2. Cancellation">
          <p>Since PartnerAI does not offer recurring auto-billing at this time, subscriptions are one-time purchases for a fixed duration. There is no automatic renewal to cancel.</p>
          <p>If you used a promo code to activate Pro, no payment was made and no cancellation is required.</p>
        </Section>

        <Section title="3. Refund Eligibility">
          <p>We offer refunds under the following conditions:</p>
          <p><strong className="text-foreground">Eligible for refund:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Duplicate payment made for the same subscription period.</li>
            <li>Payment was deducted but Pro access was not activated within 24 hours due to a technical error on our side.</li>
            <li>Refund request is made within <strong className="text-foreground">48 hours</strong> of payment and Pro features have not been significantly used (fewer than 5 AI messages sent).</li>
          </ul>
          <p className="pt-2"><strong className="text-foreground">Not eligible for refund:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Change of mind after Pro features have been used.</li>
            <li>Refund requested after 48 hours of purchase.</li>
            <li>Subscriptions activated via promo codes (no payment involved).</li>
            <li>Accounts suspended for Terms of Service violations.</li>
          </ul>
        </Section>

        <Section title="4. How to Request a Refund">
          <p>To request a refund, email us at <a href="mailto:support@partnerai.app" className="text-primary hover:underline">support@partnerai.app</a> within 48 hours of your payment with:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Your registered email address</li>
            <li>Razorpay Payment ID (visible in your payment confirmation email)</li>
            <li>Reason for the refund request</li>
          </ul>
          <p>We will review and respond within 3–5 business days. Approved refunds are processed back to the original payment method within 7–10 business days, depending on your bank.</p>
        </Section>

        <Section title="5. Partial Refunds">
          <p>Partial refunds (pro-rated for unused subscription days) may be considered on a case-by-case basis at our sole discretion, particularly for yearly plan holders requesting a refund after the 48-hour window.</p>
        </Section>

        <Section title="6. Failed Payments">
          <p>If your payment fails but money was deducted from your account, it will typically be auto-refunded by Razorpay within 5–7 business days. If not, contact us with your payment details and we will assist you in resolving it with Razorpay.</p>
        </Section>

        <Section title="7. Contact">
          <p>Refund inquiries: <a href="mailto:support@partnerai.app" className="text-primary hover:underline">support@partnerai.app</a></p>
          <p>We aim to respond within 24–48 hours on business days.</p>
        </Section>
      </div>

      <footer className="border-t border-border/10 py-6 text-center text-[11px] text-muted-foreground/40">
        © 2026 PartnerAI. All rights reserved.
      </footer>
    </div>
  );
};

export default RefundPage;
