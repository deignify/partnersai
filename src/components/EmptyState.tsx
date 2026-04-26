import type { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className = '' }: Props) => (
  <div className={`rounded-2xl bg-card border border-border/30 p-8 text-center flex flex-col items-center ${className}`}>
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="text-sm font-semibold mb-1">{title}</h3>
    {description && <p className="text-xs text-muted-foreground max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;