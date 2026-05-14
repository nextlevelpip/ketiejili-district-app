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
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

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
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${req.connectionType === 'New Convert' ? 'bg-emerald-100 text-emerald-700' : req.connectionType === 'I need Pastoral Prayer' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {req.connectionType}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Phone size={14} className="text-blue-500"/> {req.phone}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} className="text-blue-500"/> {req.localAssembly}</span>
                    {req.timestamp && <span className="flex items-center gap-1 text-gray-400">{new Date(req.timestamp?.toDate()).toLocaleString()}</span>}
                  </div>

                  {req.message && (
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-sm font-bold text-gray-700">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Message / Request:</span>
                      {req.message}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={() => handleDismiss(req.id, req.name)} 
                    disabled={isProcessing !== null}
                    className="px-4 py-3 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    title="Dismiss completely"
                  >
                    <XCircle size={18} />
                  </button>

                  <button 
                    onClick={() => handleArchive(req)}
                    disabled={isProcessing !== null}
                    className="px-6 py-3 bg-purple-50 text-purple-700 font-black rounded-xl hover:bg-purple-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Heart size={18} /> Prayed
                  </button>

                  <button 
                    onClick={() => handleApprove(req)} 
                    disabled={isProcessing !== null}
                    className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md"
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
    </DashboardLayout>
  );
}