import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Rendered in place of the children after an error (default: null). */
  fallback?: ReactNode
  /** Called with the caught error so parents can surface it (e.g. an overlay). */
  onError?: (err: Error) => void
}

/**
 * Minimal hand-rolled error boundary. Used inside the R3F `<Canvas>` to catch
 * GLB load failures (useLoader throws into the Canvas tree — a DOM-level
 * boundary in the parent would never see it). @react-three/fiber's own
 * ErrorBoundary is not re-exported from the package root, so this exists
 * instead; it also works as a plain React boundary elsewhere.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
