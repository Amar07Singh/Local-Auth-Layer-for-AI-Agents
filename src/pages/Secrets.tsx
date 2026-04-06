import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Key, Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Secrets() {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSecret, setNewSecret] = useState({ key: '', value: '' });
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth.currentUser) {
      setSecrets([]);
      return;
    }

    const q = query(collection(db, 'secrets'), where('ownerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSecrets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'secrets');
    });

    return () => unsub();
  }, [auth.currentUser]);

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'secrets'), {
        key: newSecret.key.toUpperCase(),
        value: newSecret.value,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewSecret({ key: '', value: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'secrets');
    }
  };

  const handleDeleteSecret = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'secrets', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `secrets/${id}`);
    }
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Secrets & API Keys</h2>
          <p className="text-sm text-gray-500">Manage sensitive credentials for your agent capabilities.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Secret
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm text-amber-800">
            <strong>Security Note:</strong> These secrets are stored in Firestore and are protected by your user ID. 
            In a production environment, use a dedicated vault like Google Secret Manager.
          </p>
          <p className="text-xs text-amber-700">
            <strong>Proxy Convention:</strong> To use these in an agent, name them as <code>API_TYPE_KEY</code> (e.g., <code>GEMINI_KEY</code>, <code>STRIPE_KEY</code>, <code>CHATGPT_KEY</code>).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {secrets.map((secret) => (
          <motion.div
            key={secret.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Key className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{secret.key}</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-blue-600">
                    {showValues[secret.id] ? secret.value : '••••••••••••••••'}
                  </code>
                  <button 
                    onClick={() => toggleShowValue(secret.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showValues[secret.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDeleteSecret(secret.id)}
              className="text-gray-400 hover:text-red-600 p-2 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
        {secrets.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No secrets found. Add your first API key to get started.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Secret</h3>
              <form onSubmit={handleCreateSecret} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Secret Key Name</label>
                  <input
                    required
                    type="text"
                    value={newSecret.key}
                    onChange={e => setNewSecret(prev => ({ ...prev, key: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. STRIPE_API_KEY"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Secret Value</label>
                  <input
                    required
                    type="password"
                    value={newSecret.value}
                    onChange={e => setNewSecret(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sk_test_..."
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
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    Save Secret
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
