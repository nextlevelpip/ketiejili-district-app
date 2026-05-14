"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Heart, Trash2, Phone, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function PrayerArchives() {
  const [prayers, setPrayers] = useState([]);
  const [notification, setNotification] = useState({ type: '', message: '' });

  useEffect(() => {
    // Fetch from the prayer_archives collection we created earlier
    const q = query(collection(db, 'prayer_archives'), orderBy('archivedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPrayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleResolve = async (id, name) => {
    if (window.confirm(`Mark ${name}'s prayer request as fully resolved and remove?`)) {
      try {
        await deleteDoc(doc(db, 'prayer_archives', id));
        setNotification({ type: 'success', message: 'Prayer request resolved and cleared.' });
        setTimeout(() => setNotification({ type: '', message: '' }), 4000);
      } catch (error) {
        alert("Failed to clear request.");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className="fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 bg-emerald-600 text-white animate-bounce">
            <CheckCircle2 size={24} /> {notification.message}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-purple-600 p-4 rounded-2xl text-white shadow-lg">
            <Heart size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Pastoral Chamber</h1>
            <p className="font-bold text-gray-500">Secure archive of all district prayer requests.</p>
          </div>
        </div>

        {/* THE PRAYER FEED */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prayers.length === 0 ? (
            <div className="col-span-1 md:col-span-2 bg-white p-12 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <Heart size={64} className="text-gray-200 mb-4" />
              <h3 className="text-xl font-black text-gray-400">No Pending Prayers</h3>
            </div>
          ) : (
            prayers.map(prayer => (
              <div key={prayer.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                
                <div className="flex justify-between items-start mb-4 pl-2">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                      {prayer.name} 
                      {prayer.isMember && <ShieldCheck size={16} className="text-emerald-500" title="Registered Member" />}
                    </h3>
                    <div className="flex gap-4 text-xs font-bold text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Phone size={14} className="text-blue-500"/> {prayer.phone}</span>
                      <span className="flex items-center gap-1"><Calendar size={14} className="text-gray-400"/> {new Date(prayer.archivedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl text-sm font-medium text-gray-800 flex-1 mb-4 pl-2">
                  {prayer.message}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-50 pl-2 mt-auto">
                  <button 
                    onClick={() => handleResolve(prayer.id, prayer.name)}
                    className="px-4 py-2 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 size={16} /> Mark Resolved
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