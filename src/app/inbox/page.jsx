"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Inbox, CheckCircle2, XCircle, AlertCircle, Loader2, UserPlus, Phone, MapPin } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, deleteDoc, writeBatch } from 'firebase/firestore';

export default function ConnectionInbox() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isProcessing, setIsProcessing] = useState(null); // stores the ID being processed
  const [notification, setNotification] = useState({ type: '', message: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pending_connections'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort newest first
      fetched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setPendingRequests(fetched);
    });
    return () => unsub();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handleApprove = async (request) => {
    setIsProcessing(request.id);
    
    try {
      const batch = writeBatch(db);
      
      // 1. Create the new member record in the main directory
      const newMemberRef = doc(collection(db, 'members'));
      batch.set(newMemberRef, {
        name: request.name,
        phone: request.phone,
        localAssembly: request.localAssembly,
        churchRole: request.connectionType === 'New Convert' ? 'New Convert' : 'Member',
        group: request.connectionType === 'New Convert' ? 'New Convert Class' : 'General',
        gender: '', // Needs to be filled in later
        dob: '',
        dateAdded: new Date().toISOString(),
        source: 'Public Kiosk'
      });

      // 2. Delete the request from the pending inbox
      const pendingRef = doc(db, 'pending_connections', request.id);
      batch.delete(pendingRef);

      // 3. Commit both actions at once safely
      await batch.commit();
      showNotification('success', `${request.name} officially added to the database!`);
      
    } catch (error) {
      showNotification('error', 'Failed to approve request. Check connection.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDismiss = async (id, name) => {
    if (!window.confirm(`Are you sure you want to dismiss ${name}'s request? This cannot be undone.`)) return;
    
    setIsProcessing(id);
    try {
      await deleteDoc(doc(db, 'pending_connections', id));
      showNotification('success', 'Request dismissed and deleted.');
    } catch (error) {
      showNotification('error', 'Failed to dismiss request.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg relative">
            <Inbox size={32} />
            {pendingRequests.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Connection Inbox</h1>
            <p className="font-bold text-gray-500">Approve public submissions into the Master Directory.</p>
          </div>
        </div>

        {/* THE INBOX FEED */}
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="bg-white p-16 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <Inbox size={64} className="text-gray-200 mb-6" />
              <h3 className="text-2xl font-black text-gray-400">Inbox is Clear</h3>
              <p className="font-bold text-gray-400 mt-2">No pending connections from the public kiosk.</p>
            </div>
          ) : (
            pendingRequests.map(req => (
              <div key={req.id} className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-black text-gray-900">{req.name}</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${req.connectionType === 'New Convert' ? 'bg-emerald-100 text-emerald-700' : req.connectionType === 'Prayer Request' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {req.connectionType}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Phone size={14} className="text-blue-500"/> {req.phone}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} className="text-blue-500"/> {req.localAssembly}</span>
                    <span className="flex items-center gap-1 text-gray-400">{new Date(req.timestamp).toLocaleString()}</span>
                  </div>

                  {req.notes && (
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-sm font-bold text-gray-700">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Message / Request:</span>
                      {req.notes}
                    </div>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col gap-3 shrink-0">
                  <button 
                    onClick={() => handleApprove(req)} 
                    disabled={isProcessing !== null}
                    className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md w-full md:w-48"
                  >
                    {isProcessing === req.id ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                    Approve & Add
                  </button>
                  <button 
                    onClick={() => handleDismiss(req.id, req.name)} 
                    disabled={isProcessing !== null}
                    className="px-6 py-3 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 w-full md:w-48"
                  >
                    <XCircle size={18} /> Dismiss
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}