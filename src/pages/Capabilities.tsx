import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ShieldCheck, Plus, Globe, Lock, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Capabilities() {
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCap, setNewCap] = useState({ name: '', description: '', api: 'custom', scope: '' });

  useEffect(() => {
    if (!auth.currentUser) {
      setCapabilities([]);
      return;
    }

    const q = query(collection(db, 'capabilities'));
    const unsub = onSnapshot(q, (snap) => {
      setCapabilities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'capabilities');
    });
    return () => unsub();
  }, [auth.currentUser]);

  const handleCreateCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'capabilities'), {
        ...newCap,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewCap({ name: '', description: '', api: 'custom', scope: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'capabilities');
    }
  };

  const handleDeleteCap = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'capabilities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `capabilities/${id}`);
    }
  };

  const apiIcons: Record<string, any> = {
    stripe: '💳',
    razorpay: '💰',
    gemini: '🧠',
    chatgpt: '🤖',
    google: '🔍',
    custom: '🛠️'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Capabilities</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Capability
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((cap) => (
          <motion.div
            key={cap.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">{apiIcons[cap.api] || '🛠️'}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {cap.api}
                </span>
                {(auth.currentUser?.uid === cap.ownerId || auth.currentUser?.email === 'amarsingh0887609@gmail.com') && (
                  <button
                    onClick={() => handleDeleteCap(cap.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Capability"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{cap.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{cap.description}</p>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
              <Lock className="w-4 h-4 text-gray-400" />
              <code className="text-xs text-blue-700 font-mono">{cap.scope}</code>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">New Capability</h3>
            <form onSubmit={handleCreateCap} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                <input
                  required
                  type="text"
                  value={newCap.name}
                  onChange={e => setNewCap(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Read Orders"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">API Provider</label>
                <select
                  value={newCap.api}
                  onChange={e => setNewCap(prev => ({ ...prev, api: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stripe">Stripe</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="gemini">Gemini</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="google">Google API</option>
                  <option value="custom">Custom Private API</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Auth0 Scope</label>
                <input
                  required
                  type="text"
                  value={newCap.scope}
                  onChange={e => setNewCap(prev => ({ ...prev, scope: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. read:orders"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
