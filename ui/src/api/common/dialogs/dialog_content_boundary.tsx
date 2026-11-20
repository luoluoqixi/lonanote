import { Component, type ReactNode, Suspense, useEffect } from "react";

export function DialogContentReady({ onReady }: { onReady?: () => void }) {
  // 隐藏 WebView 的 requestAnimationFrame 可能暂停；提交后的 effect 不依赖可见性。
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  deferReady?: boolean;
  onReady: () => void;
  onError: (error: unknown) => void;
};

class RendererErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function DialogContentBoundary(props: Props) {
  return (
    <RendererErrorBoundary {...props}>
      <Suspense fallback={props.fallback}>
        {props.children}
        {!props.deferReady ? <DialogContentReady onReady={props.onReady} /> : null}
      </Suspense>
    </RendererErrorBoundary>
  );
}
