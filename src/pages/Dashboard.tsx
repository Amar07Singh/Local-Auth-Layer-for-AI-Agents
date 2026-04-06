import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Bot, ShieldCheck, History, Activity, ArrowRight, Key, Cpu, Zap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    agents: 0,
    capabilities: 0,
    logs: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) {
      setStats({ agents: 0, capabilities: 0, logs: 0 });
      setRecentLogs([]);
      return;
    }

    const qAgents = query(collection(db, 'agents'), where('ownerId', '==', auth.currentUser.uid));
    const unsubAgents = onSnapshot(qAgents, (snap) => {
      setStats(prev => ({ ...prev, agents: snap.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'agents');
    });

    const qCaps = query(collection(db, 'capabilities'));
    const unsubCaps = onSnapshot(qCaps, (snap) => {
      setStats(prev => ({ ...prev, capabilities: snap.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'capabilities');
    });

    const qLogs = query(
      collection(db, 'auditLogs'),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setStats(prev => ({ ...prev, logs: snap.size }));
      setRecentLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'auditLogs');
    });

    return () => {
      unsubAgents();
      unsubCaps();
      unsubLogs();
    };
  }, [auth.currentUser]);

  const statCards = [
    { name: 'Active Agents', value: stats.agents, icon: Bot, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { name: 'Capabilities', value: stats.capabilities, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { name: 'API Calls (24h)', value: stats.logs, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  ];

  const quickActions = [
    { name: 'New Agent', path: '/agents', icon: Plus, desc: 'Deploy a new AI identity', color: 'bg-blue-600' },
    { name: 'Add Secret', path: '/secrets', icon: Key, desc: 'Secure your API keys', color: 'bg-amber-500' },
    { name: 'Test Proxy', path: '/simulator', icon: Cpu, desc: 'Simulate API requests', color: 'bg-emerald-500' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-12"
    >
      {/* Hero Section */}
      <section className="relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <motion.h1 
              variants={itemVariants}
              className="text-4xl font-extrabold text-gray-900 tracking-tight"
            >
              Control Plane <span className="text-blue-600">Overview</span>
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-lg text-gray-500 max-w-2xl"
            >
              Monitor your agent ecosystem, manage secure capabilities, and audit real-time interactions across your infrastructure.
            </motion.p>
          </div>
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <Link 
              to="/simulator" 
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 group"
            >
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              Launch Simulator
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <motion.div
            key={stat.name}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 group cursor-default"
          >
            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl transition-colors group-hover:bg-opacity-80`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.name}</p>
              <p className="text-3xl font-black text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.path}
              className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${action.color} p-3 rounded-2xl text-white shadow-lg shadow-blue-100`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{action.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-xl">
                <History className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            </div>
            <Link to="/logs" className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          <div className="space-y-4">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`${log.status === 200 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} p-3 rounded-xl`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {log.api.toUpperCase()} Request
                      </p>
                      <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{log.endpoint}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${log.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {log.status} OK
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                  <History className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No recent activity found.</p>
                <Link to="/simulator" className="text-xs font-bold text-blue-600 mt-2 hover:underline">Run a simulation →</Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-gray-100 p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">System Health</h2>
          </div>
          <div className="space-y-6">
            {[
              { name: 'Proxy Gateway', status: 'Operational', latency: '12ms' },
              { name: 'Secret Vault', status: 'Operational', latency: '4ms' },
              { name: 'Audit Stream', status: 'Operational', latency: '8ms' },
              { name: 'Auth Bridge', status: 'Operational', latency: '24ms' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                  <span className="text-sm font-bold text-gray-700">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-gray-400">{service.latency}</span>
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="mt-8 p-6 bg-blue-600 rounded-3xl text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1">Infrastructure Secure</h3>
                <p className="text-blue-100 text-xs mb-4">All agent interactions are being monitored and proxied through encrypted channels.</p>
                <button className="text-xs font-bold bg-white text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                  Security Report
                </button>
              </div>
              <ShieldCheck className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
