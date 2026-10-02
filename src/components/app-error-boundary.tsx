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

/**
 * ViewErrorBoundary — lightweight per-view error boundary.
 * Wraps individual module views (Dashboard, Reports, Analytics, etc.) so
 * a crash in one view shows a localized error card instead of blanking
 * the whole app shell. The `viewName` prop is shown in the error message
 * so the user knows which module failed.
 *
 * Usage:
 *   <ViewErrorBoundary viewName="Reports">
 *     <ReportsView />
 *   </ViewErrorBoundary>
 */
export class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode; viewName: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; viewName: string }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ViewErrorBoundary:${this.props.viewName}]`, error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[300px] place-items-center p-4">
          <div className="max-w-lg rounded-xl border border-border bg-card p-6 text-center">
            <h2 className="text-base font-bold text-rose-500">
              {this.props.viewName} failed to load
            </h2>
            <p className="mt-2 text-[12px] text-muted-foreground">
              An unexpected error occurred while rendering this module.
              The rest of the app is unaffected — try reloading this view.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-left text-[10px] text-muted-foreground">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90"
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
