"use client";

import { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center p-4 text-neutral-400 text-sm">
                    <span>Something went wrong</span>
                </div>
            );
        }

        return this.props.children;
    }
}

/** 위젯용 간단한 에러 폴백 */
export function WidgetErrorFallback({ message = "Failed to load" }: { message?: string }) {
    return (
        <div className="flex items-center justify-center p-4 rounded-lg border border-zinc-800 bg-neutral-900 text-neutral-500 text-xs">
            <span>{message}</span>
        </div>
    );
}

export default ErrorBoundary;
