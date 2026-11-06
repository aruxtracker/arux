import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PageErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-w-0 p-6 flex flex-col items-center justify-center text-center space-y-3 rounded-3xl bg-card border border-border/70 card-shadow my-4">
          <span className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </span>
          <h3 className="text-base font-extrabold text-foreground">
            {this.props.fallbackTitle || 'Something went wrong loading this screen'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button
            onClick={this.handleRetry}
            className="h-10 px-4 rounded-xl gradient-primary text-xs font-bold gap-1.5 shadow-pop tap-shrink mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

