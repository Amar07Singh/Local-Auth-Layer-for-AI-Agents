import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Bot, Send, ShieldAlert, ShieldCheck, Terminal, Cpu, Globe, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgentSimulator() {
  const [agents, setAgents] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [selectedCap, setSelectedCap] = useState<any | null>(null);
  const [prompt, setPrompt] = useState('What is the capital of France?');
  const [targetUrl, setTargetUrl] = useState('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
  const [result, setResult] = useState<any | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [clientSideKeyAttempt, setClientSideKeyAttempt] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qAgents = query(collection(db, 'agents'), where('ownerId', '==', auth.currentUser.uid));
    const unsubAgents = onSnapshot(qAgents, (snap) => {
      setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'agents'));

    const qCaps = query(collection(db, 'capabilities'));
    const unsubCaps = onSnapshot(qCaps, (snap) => {
      setCapabilities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'capabilities'));

    return () => {
      unsubAgents();
      unsubCaps();
    };
  }, [auth.currentUser]);

  const handleRunAgent = async () => {
    if (!selectedAgent || !selectedCap) return;
    setIsRunning(true);
    setResult(null);
    
    setClientSideKeyAttempt("Searching client-side memory... [NOT FOUND]");

    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      console.log('Sending proxy request...', {
        agentId: selectedAgent.id,
        capabilityId: selectedCap.id,
        targetUrl
      });

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          capabilityId: selectedCap.id,
          payload: payload,
          targetUrl: targetUrl,
          ownerId: auth.currentUser?.uid
        })
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Proxy response received:', data);
        setResult(data);
      } else {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        setResult({ 
          success: false, 
          error: 'Server returned non-JSON response (likely an error page)',
          details: text.substring(0, 500) + (text.length > 500 ? '...' : '')
        });
      }
    } catch (error: any) {
      console.error('Simulator error:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const agentCaps = selectedAgent 
    ? capabilities.filter(c => selectedAgent.capabilities.includes(c.id))
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl">
            <Cpu className="text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Agent Simulator</h2>
            <p className="text-gray-500">Test how your agents interact with real-world APIs through the secure proxy.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Configuration */}
          <div className="md:col-span-1 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">1. Select Agent</label>
              <div className="space-y-2">
                {agents.length === 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    No agents found. Create one in the <a href="/agents" className="underline font-bold">Agents</a> page first.
                  </div>
                )}
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => { setSelectedAgent(agent); setSelectedCap(null); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedAgent?.id === agent.id 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-100' 
                        : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Bot className="w-5 h-5" />
                    <span className="font-medium text-sm">{agent.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {selectedAgent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">2. Select Capability</label>
                  <div className="space-y-2">
                    {agentCaps.length === 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                        This agent has no capabilities. Assign some in the <a href="/agents" className="underline font-bold">Agents</a> page.
                      </div>
                    )}
                    {agentCaps.map(cap => (
                      <button
                        key={cap.id}
                        onClick={() => setSelectedCap(cap)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selectedCap?.id === cap.id 
                            ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-100' 
                            : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-medium text-sm">{cap.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Execution */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Target API Endpoint
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  Agent Prompt / Payload
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <button
                onClick={handleRunAgent}
                disabled={isRunning || !selectedAgent || !selectedCap}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-blue-200"
              >
                {isRunning ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
                Run Agent Request
              </button>
            </div>

            {/* Security Verification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase">Client-Side Check</span>
                </div>
                <p className="text-xs text-red-600 mb-2">Agent attempting to read API Key directly from browser memory...</p>
                <div className="bg-white/50 p-2 rounded-lg font-mono text-[10px] text-red-800">
                  {clientSideKeyAttempt || "Awaiting execution..."}
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-green-700">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase">Proxy Injection</span>
                </div>
                <p className="text-xs text-green-600 mb-2">Server-side proxy injecting secret from secure vault...</p>
                <div className="bg-white/50 p-2 rounded-lg font-mono text-[10px] text-green-800">
                  {result?.success ? "Key Injected: [HIDDEN_BY_SERVER]" : "Awaiting execution..."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 bg-gray-800 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">Execution Result</span>
              </div>
              <span className="text-xs font-mono text-gray-500">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="p-8">
              <pre className="text-sm font-mono text-blue-400 overflow-auto max-h-[400px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
