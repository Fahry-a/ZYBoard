import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from './contexts/ThemeContext';

function ErrorFallback({error}) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;