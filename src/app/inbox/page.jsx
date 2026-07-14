"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Inbox, CheckCircle2, XCircle, AlertCircle, Loader2, UserPlus, Phone, MapPin, Heart, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

export default function ConnectionInbox() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isProcessing, setIsProcessing] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  
  // NEW: Custom Master Modal State
  const [modalState, setModalState] = useState({ isOpen: false, type: '', req: null });

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

  // --- REFACTORED: Database Execution Functions ---
  const executeApprove = async (req) => {
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

  const executeArchive = async (req) => {
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

  const executeDismiss = async (req) => {
    setIsProcessing(req.id);
    try {
      await deleteDoc(doc(db, 'pending_connections', req.id));
      showNotification('success', 'Request dismissed and deleted.');
    } catch (error) {
      showNotification('error', 'Failed to dismiss request.');
    } finally {
      setIsProcessing(null);
    }
  };

  // --- NEW: Master Modal Router ---
  const handleConfirmAction = () => {
    const { type, req } = modalState;
    setModalState({ isOpen: false, type: '', req: null });
    
    if (type === 'approve') executeApprove(req);
    if (type === 'archive') executeArchive(req);
    if (type === 'dismiss') executeDismiss(req);
  };

  return (
    <DashboardLayout>
      {/* PREMIUM GLASSMORPHISM WRAPPER */}
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#09090b] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        {/* ========================================================= */}
        {/* ESCAPED GLOBAL NOTIFICATION (Top-28 Fix)                  */}
        {/* ========================================================= */}
        {notification.message && (
          <div className={`fixed top-28 right-10 z-[99999] px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-emerald-500 text-white' : notification.type === 'info' ? 'bg-[#8ECAE6] text-[#000814]' : 'bg-red-500 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
            {notification.message}
          </div>
        )}

        {/* ========================================================= */}
        {/* CUSTOM CONFIRMATION MODAL                                 */}
        {/* ========================================================= */}
        {modalState.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-8 text-center">
                
                {modalState.type === 'dismiss' && (
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
                    <AlertTriangle size={28} />
                  </div>
                )}
                {modalState.type === 'archive' && (
                  <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-purple-400">
                    <Heart size={28} />
                  </div>
                )}
                {modalState.type === 'approve' && (
                  <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-blue-400">
                    <UserPlus size={28} />
                  </div>
                )}

                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">
                  {modalState.type === 'dismiss' ? 'Dismiss Request?' : modalState.type === 'archive' ? 'Mark as Prayed?' : 'Admit to Directory?'}
                </h3>
                
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  {modalState.type === 'dismiss' ? `Are you sure you want to completely remove ${modalState.req?.name}'s request? Action cannot be undone.` :
                   modalState.type === 'archive' ? `Archive ${modalState.req?.name}'s request as prayed for and sync their data?` :
                   `Officially admit ${modalState.req?.name} into the Master Directory?`}
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button 
                  onClick={() => setModalState({ isOpen: false, type: '', req: null })} 
                  className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmAction} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
                    modalState.type === 'dismiss' ? 'text-red-400 hover:bg-red-500/10' :
                    modalState.type === 'archive' ? 'text-purple-400 hover:bg-purple-500/10' :
                    'text-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in relative z-10">

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 mt-4">
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
              <p className="font-bold text-indigo-200 text-xs mt-1 uppercase tracking-widest">Approve public submissions into the Master Directory.</p>
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
                      onClick={() => setModalState({ isOpen: true, type: 'dismiss', req })} 
                      disabled={isProcessing !== null}
                      className="px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-300 font-black rounded-xl hover:bg-red-500/40 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      title="Dismiss completely"
                    >
                      <XCircle size={18} />
                    </button>

                    <button 
                      onClick={() => setModalState({ isOpen: true, type: 'archive', req })}
                      disabled={isProcessing !== null}
                      className="px-6 py-3 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-black rounded-xl hover:bg-purple-500/40 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <Heart size={18} /> Prayed
                    </button>

                    <button 
                      onClick={() => setModalState({ isOpen: true, type: 'approve', req })} 
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