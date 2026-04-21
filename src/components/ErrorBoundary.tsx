import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Try again, or head home.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] text-muted-foreground/60 font-mono bg-secondary/40 rounded-lg p-2 max-h-24 overflow-auto">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={this.reset} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </Button>
            <Button size="sm" onClick={() => { window.location.href = '/'; }} className="gap-1.5 gradient-primary border-0">
              <Home className="w-3.5 h-3.5" /> Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;