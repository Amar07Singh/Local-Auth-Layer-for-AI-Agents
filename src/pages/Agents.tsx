import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Bot, Plus, Trash2, ShieldCheck, X, Play, Send, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', selectedCaps: [] as string[] });

  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [testAgent, setTestAgent] = useState<any | null>(null);
  const [testPayload, setTestPayload] = useState('{\n  "action": "get_status",\n  "params": {}\n}');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      setAgents([]);
      setCapabilities([]);
      return;
    }

    const q = query(collection(db, 'agents'), where('ownerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'agents');
    });

    const qCaps = query(collection(db, 'capabilities'));
    const unsubCaps = onSnapshot(qCaps, (snap) => {
      setCapabilities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'capabilities');
    });

    return () => {
      unsub();
      unsubCaps();
    };
  }, [auth.currentUser]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'agents'), {
        name: newAgent.name,
        description: newAgent.description,
        capabilities: newAgent.selectedCaps,
        ownerId: auth.currentUser.uid,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewAgent({ name: '', description: '', selectedCaps: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'agents');
    }
  };

  const handleDeleteAgent = async () => {
    if (agentToDelete) {
      try {
        await deleteDoc(doc(db, 'agents', agentToDelete));
        setAgentToDelete(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `agents/${agentToDelete}`);
      }
    }
  };

  const handleTestAgent = async () => {
    if (!testAgent) return;
    setIsTesting(true);
    setTestResult(null);
    
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(testPayload);
      } catch (e) {
        throw new Error("Invalid JSON payload");
      }

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgent.id,
          capabilityId: testAgent.capabilities[0] || 'default',
          payload: parsedPayload,
          targetUrl: 'https://api.example.com/v1/action',
          ownerId: auth.currentUser?.uid
        })
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const toggleCap = (capId: string) => {
    setNewAgent(prev => ({
      ...prev,
      selectedCaps: prev.selectedCaps.includes(capId)
        ? prev.selectedCaps.filter(id => id !== capId)
        : [...prev.selectedCaps, capId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My AI Agents</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestAgent(agent)}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Test
                </button>
                <button
                  onClick={() => setAgentToDelete(agent.id)}
                  className="text-gray-400 hover:text-red-600 p-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{agent.name}</h3>
            <p className="text-sm text-gray-500 mb-4 flex-1">{agent.description}</p>
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((capId: string) => {
                  const cap = capabilities.find(c => c.id === capId);
                  return (
                    <span key={capId} className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {cap?.name || capId}
                    </span>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {agentToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Agent?</h3>
              <p className="text-gray-500 mb-6">This action cannot be undone. All settings for this agent will be lost.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAgentToDelete(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAgent}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {testAgent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Test Agent: {testAgent.name}</h3>
                    <p className="text-xs text-gray-500">Simulate an API request through the control proxy</p>
                  </div>
                </div>
                <button onClick={() => { setTestAgent(null); setTestResult(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Request Payload (JSON)</label>
                    <textarea
                      value={testPayload}
                      onChange={e => setTestPayload(e.target.value)}
                      className="w-full h-48 px-4 py-3 font-mono text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={handleTestAgent}
                    disabled={isTesting}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Send Request
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Proxy Response</label>
                  <div className="w-full h-[244px] bg-gray-900 rounded-xl p-4 overflow-auto">
                    {testResult ? (
                      <pre className="text-xs font-mono text-green-400">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Activity className="w-8 h-8 opacity-20" />
                        <p className="text-xs">Waiting for request...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 mx-6 mb-6 rounded-xl flex items-center gap-3 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {testResult.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="text-sm font-medium">
                    {testResult.success ? 'Agent connection successful!' : 'Connection failed. Check logs for details.'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Create New Agent</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateAgent} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Agent Name</label>
                  <input
                    required
                    type="text"
                    value={newAgent.name}
                    onChange={e => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Order Assistant"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newAgent.description}
                    onChange={e => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-24 resize-none"
                    placeholder="What does this agent do?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Assign Capabilities</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                    {capabilities.map(cap => (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => toggleCap(cap.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          newAgent.selectedCaps.includes(cap.id)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {cap.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Create Agent
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
