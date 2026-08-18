'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export class WebGLBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // #region agent log
    fetch('http://127.0.0.1:7412/ingest/e788776b-2e05-46ac-bbcf-f37efdc25738',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'db5f59'},body:JSON.stringify({sessionId:'db5f59',hypothesisId:'D',location:'webgl-boundary.tsx:componentDidCatch',message:'WebGLBoundary caught',data:{errorMessage: error.message, componentStack: info.componentStack?.slice(0, 400) ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    this.setState({ failed: true });
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
