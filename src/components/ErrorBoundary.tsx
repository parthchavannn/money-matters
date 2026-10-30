import React from "react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/** Last line of defence: a rendering bug shows a recovery screen instead of a blank page. Data in storage is untouched. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="mb-3 text-5xl">😵</div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your data is safe — it's stored separately. Reloading usually fixes this.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded bg-muted p-2 text-left text-xs">{this.state.error.message}</pre>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
