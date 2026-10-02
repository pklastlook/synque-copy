"use client";

import * as React from "react";

/**
 * AppErrorBoundary — catches client-side errors in the app shell so a
 * single broken component doesn't blank the whole page. Shows the error
 * message + a "Try again" button (clears the error state so React retries).
 */
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center p-4">
          <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-left text-[11px] text-muted-foreground">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
