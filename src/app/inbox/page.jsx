"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Inbox, CheckCircle2, XCircle, AlertCircle, Loader2, UserPlus, Phone, MapPin, Heart } from 'lucide-react';
import { db } from '../firebase';
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

export default function ConnectionInbox() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isProcessing, setIsProcessing] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pending_connections'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setPendingRequests(fetched);
    });
    return () => unsub();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const calculateAgeGroup = (dobString) => {
    if (!dobString) return "Unknown";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    if (age <= 12) return "Children";
    if (age <= 35) return "Youth";
    return "Adult";
  };

  const handleApprove = async (req) => {
    if (!window.confirm(`Admit ${req.name} to the Directory?`)) return;
    setIsProcessing(req.id);

    try {
      const batch = writeBatch(db);
      const q = query(collection(db, 'members'), where('phone', '==', req.phone));
      const duplicateCheck = await getDocs(q);

      if (!duplicateCheck.empty) {
        const existingId = duplicateCheck.docs[0].id;
        const existingData = duplicateCheck.docs[0].data();
        const memberRef = doc(db, 'members', existingId);
        
        batch.update(memberRef, {
          gender: req.gender || existingData.gender || "",
          dateOfBirth: req.dateOfBirth || existingData.dateOfBirth || "",
          localAssembly: req.localAssembly || existingData.localAssembly || "Central"
        });
        showNotification('success', 'Duplicate found! Existing member data safely updated.');
      } else {
        const autoAgeGroup = calculateAgeGroup(req.dateOfBirth);
        const newMemberRef = doc(collection(db, 'members'));
        batch.set(newMemberRef, {
          name: req.name || "Unknown",
          phone: req.phone || "",
          localAssembly: req.localAssembly || "Central",
          churchRole: req.connectionType === 'New Convert' ? 'New Convert' : 'Member',
          gender: req.gender || "",
          dateOfBirth: req.dateOfBirth || "",
          ageGroup: autoAgeGroup,
          joinedAt: new Date().toISOString()
        });
        showNotification('success', 'New soul successfully admitted to Directory!');
      }

      if (req.message) {
        const archiveRef = doc(collection(db, 'prayer_archives'));
        batch.set(archiveRef, {
          name: req.name,
          phone: req.phone,
          message: req.message,
          archivedAt: new Date().toISOString()
        });
      }

      const requestRef = doc(db, 'pending_connections', req.id);
      batch.delete(requestRef);
      await batch.commit();

    } catch (error) {
      showNotification('error', 'Failed to process admission. Check connection.');
    }
    setIsProcessing(null);
  };

  const handleArchive = async (req) => {
    if (!window.confirm(`Mark ${req.name}'s request as Prayed For?`)) return;
    setIsProcessing(req.id);

    try {
      const batch = writeBatch(db);
      const q = query(collection(db, 'members'), where('phone', '==', req.phone));
      const duplicateCheck = await getDocs(q);

      if (!duplicateCheck.empty) {
        const existingId = duplicateCheck.docs[0].id;
        const existingData = duplicateCheck.docs[0].data();
        const memberRef = doc(db, 'members', existingId);
        
        batch.update(memberRef, {
          gender: req.gender || existingData.gender || "",
          dateOfBirth: req.dateOfBirth || existingData.dateOfBirth || ""
        });
      }

      const archiveRef = doc(collection(db, 'prayer_archives'));
      batch.set(archiveRef, {
        name: req.name,
        phone: req.phone,
        message: req.message || "No specific request recorded.",
        isMember: !duplicateCheck.empty,
        archivedAt: new Date().toISOString()
      });

      const requestRef = doc(db, 'pending_connections', req.id);
      batch.delete(requestRef);
      await batch.commit();
      showNotification('success', 'Prayer request archived and member data synced.');

    } catch (error) {
      showNotification('error', 'Failed to archive prayer request.');
    }
    setIsProcessing(null);
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
      {/* PREMIUM GLASSMORPHISM WRAPPER */}
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#09090b] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in relative z-10">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
              {notification.message}
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg relative backdrop-blur-md border border-white/20">
              <Inbox size={32} />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-pulse border-2 border-[#1e1b4b]">
                  {pendingRequests.length}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Connection Inbox</h1>
              <p className="font-bold text-indigo-200">Approve public submissions into the Master Directory.</p>
            </div>
          </div>

          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl p-16 rounded-[2rem] shadow-xl border border-white/10 flex flex-col items-center justify-center text-center">
                <Inbox size={64} className="text-indigo-200/30 mb-6" />
                <h3 className="text-2xl font-black text-indigo-100">Inbox is Clear</h3>
                <p className="font-bold text-indigo-200/60 mt-2">No pending connections from the public kiosk.</p>
              </div>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 hover:bg-white/15 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-white">{req.name}</h3>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                        req.connectionType === 'New Convert' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 
                        req.connectionType === 'I need Pastoral Prayer' ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 
                        'bg-blue-500/20 text-blue-300 border-blue-400/30'
                      }`}>
                        {req.connectionType}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-indigo-200/70 mb-4">
                      <span className="flex items-center gap-1"><Phone size={14} className="text-indigo-400"/> {req.phone}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-indigo-400"/> {req.localAssembly}</span>
                      {req.timestamp && <span className="flex items-center gap-1 text-indigo-200/40">{new Date(req.timestamp?.toDate()).toLocaleString()}</span>}
                    </div>

                    {req.message && (
                      <div className="bg-black/20 border border-white/5 p-4 rounded-xl text-sm font-medium text-indigo-100 shadow-inner">
                        <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1 tracking-widest">Message / Request:</span>
                        <span className="leading-relaxed">{req.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                    <button 
                      onClick={() => handleDismiss(req.id, req.name)} 
                      disabled={isProcessing !== null}
                      className="px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-300 font-black rounded-xl hover:bg-red-500/40 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      title="Dismiss completely"
                    >
                      <XCircle size={18} />
                    </button>

                    <button 
                      onClick={() => handleArchive(req)}
                      disabled={isProcessing !== null}
                      className="px-6 py-3 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-black rounded-xl hover:bg-purple-500/40 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <Heart size={18} /> Prayed
                    </button>

                    <button 
                      onClick={() => handleApprove(req)} 
                      disabled={isProcessing !== null}
                      className="px-6 py-3 bg-blue-600 border border-blue-500/50 text-white font-black rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 disabled:opacity-50"
                    >
                      {isProcessing === req.id ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                      Admit
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}