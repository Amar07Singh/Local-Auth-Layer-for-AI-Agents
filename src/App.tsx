import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';
import Capabilities from './pages/Capabilities';
import Secrets from './pages/Secrets';
import AgentSimulator from './pages/AgentSimulator';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout user={user} /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="capabilities" element={<Capabilities />} />
            <Route path="logs" element={<AuditLogs />} />
            <Route path="secrets" element={<Secrets />} />
            <Route path="simulator" element={<AgentSimulator />} />
          </Route>
      </Routes>
    </Router>
  );
}
