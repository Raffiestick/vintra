"use client";

import React from "react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };

export class ErrorBoundary extends React.Component<Props, { hasError: boolean; err?: any }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }
  componentDidCatch(err: any, info: any) {
    // optional: send to your logger
    // console.error("Landing boundary caught:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="mx-auto max-w-xl p-4 text-center text-sm text-white/80">
          <div className="mb-2 rounded border border-white/10 bg-white/5 p-3">Something went wrong loading this section.</div>
          <div className="opacity-70">Please refresh or try again.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
