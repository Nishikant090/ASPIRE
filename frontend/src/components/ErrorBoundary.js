/**
 * ErrorBoundary - Catches render errors and shows recovery UI
 */

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-wrapper">
          <div className="section" style={{ paddingTop: 120 }}>
            <div className="container" style={{ maxWidth: 520, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
              <h1 style={{ marginBottom: 8 }}>Something went wrong</h1>
              <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
                An unexpected error occurred. Please refresh or try again.
              </p>
              <button type="button" className="btn btn-primary" onClick={this.handleRetry}>
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
