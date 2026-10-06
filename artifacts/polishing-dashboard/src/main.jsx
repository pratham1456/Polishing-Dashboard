import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { Route, Switch } from 'wouter';
import App from './App';
import NotFound from './pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import './index.css';
createRoot(document.getElementById('root'), {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
        console.error(error, errorInfo.componentStack);
    },
}).render(_jsx(ErrorBoundary, { children: _jsxs(Switch, { children: [_jsx(Route, { path: '/', component: App }), _jsx(Route, { children: _jsx(NotFound, {}) })] }) }));
