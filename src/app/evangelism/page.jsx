"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Flame, MapPin, Save, Users, Calendar, CheckCircle2, AlertCircle, Loader2, Target } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

export default function EvangelismTracker() {
  const [members, setMembers] = useState([]);
  const [outreachLogs, setOutreachLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('log'); 
  
  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- OUTREACH FORM STATES ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState('');
  const [location, setLocation] = useState('');
  const [conductor, setConductor] = useState('');
  const [soulsWon, setSoulsWon] = useState('');
  const [notes, setNotes] = useState('');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    // Fetch members to view our New Converts
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMembers(fetchedMembers);
    });

    // Fetch outreach history
    const unsubLogs = onSnapshot(collection(db, 'evangelism_logs'), (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setOutreachLogs(fetchedLogs);
    });

    return () => { unsubMembers(); unsubLogs(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const resetForm = () => {
    setEventType('');
    setLocation('');
    setConductor('');
    setSoulsWon('');
    setNotes('');
  };

  // --- SAVE OUTREACH LOG ---
  const handleSaveOutreach = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification({ type: '', message: '' });

    if (!eventType || !location || !conductor) {
      showNotification('error', "Please fill in all required outreach details.");
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'evangelism_logs'), {
        date,
        eventType,
        location,
        conductor,
        soulsWon: parseInt(soulsWon) || 0,
        notes,
        timestamp: new Date().toISOString()
      });
      
      showNotification('success', `Glory to God! Outreach at ${location} has been recorded.`);
      resetForm();
      
    } catch (error) {
      console.error(error);
      showNotification('error', "Connection Error. Please check your internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DATA PREPARATION ---
  const convertsList = members.filter(m => m && m.churchRole === 'New Convert');
  const totalSoulsFromOutreach = outreachLogs.reduce((sum, log) => sum + (log.soulsWon || 0), 0);

  // --- STYLING HELPERS ---
  const inputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";
  const labelStyle = "block text-sm font-bold text-gray-600 mb-1.5 ml-1";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto relative pb-10">
        
        {/* NOTIFICATION BANNER */}
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <h1 className="text-3xl font-black text-orange-950 uppercase tracking-tight mb-8">Evangelism & Souls</h1>

        {/* 3-TIER TAB NAVIGATION */}
        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200 pb-5">
          <button onClick={() => setActiveTab('log')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'log' ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <Flame size={18} /> Log Outreach
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'history' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <MapPin size={18} /> Outreach History ({outreachLogs.length})
          </button>
          <button onClick={() => setActiveTab('converts')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'converts' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <Users size={18} /> Harvested Souls ({convertsList.length})
          </button>
        </div>

        {/* ================= TAB 1: LOG OUTREACH ================= */}
        {activeTab === 'log' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            <div className="mb-8">
              <h2 className="text-xl font-extrabold text-orange-900 flex items-center gap-3 mb-2">
                <Flame size={24} className="text-orange-600" /> Record Evangelism Event
              </h2>
              <p className="text-sm font-bold text-gray-500">Document the location, leadership, and fruit of your outreach efforts.</p>
            </div>
            
            <form onSubmit={handleSaveOutreach} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>Date of Outreach *</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Type of Evangelism *</label>
                  <select required value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputStyle}>
                    <option value="">- Select Type -</option>
                    <option value="House to House">House to House</option>
                    <option value="Mass Rally / Crusade">Mass Rally / Crusade</option>
                    <option value="Street Evangelism">Street Evangelism</option>
                    <option value="Hospital / Prison Ministry">Hospital / Prison Ministry</option>
                    <option value="Morning Dawn Broadcast">Morning Dawn Broadcast</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>Specific Location / Community *</label>
                  <input type="text" required placeholder="e.g. Katanga Market Square" value={location} onChange={(e) => setLocation(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Team Leader / Conductor *</label>
                  <input type="text" required placeholder="Who led this outreach?" value={conductor} onChange={(e) => setConductor(e.target.value)} className={inputStyle} />
                </div>
              </div>

              <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                <label className="block text-sm font-black text-orange-900 mb-2">Total Souls Won (Approximate)</label>
                <input type="number" min="0" placeholder="0" value={soulsWon} onChange={(e) => setSoulsWon(e.target.value)} className={`border-orange-300 ring-4 ring-orange-50 text-orange-900 text-lg ${inputStyle}`} />
                <p className="text-xs font-bold text-orange-600 mt-2">Note: To track their discipleship, register them fully in the Directory module.</p>
              </div>

              <div>
                <label className={labelStyle}>Testimonies & Notes</label>
                <textarea rows="3" placeholder="Any notable miracles, resistance, or general observations?" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputStyle} resize-none`}></textarea>
              </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button type="submit" disabled={isSubmitting} className={`px-10 py-4 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-3 text-white ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 w-full md:w-auto'}`}>
                  {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Securing Record...</> : <><Save size={20} /> Save Outreach Log</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 2: OUTREACH HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-amber-900 flex items-center gap-3 mb-2"><MapPin size={24} className="text-amber-600" /> Outreach History</h2>
                <p className="text-sm font-bold text-gray-500">A permanent record of where the gospel has been preached.</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl text-center">
                <div className="text-2xl font-black text-amber-600">{totalSoulsFromOutreach}</div>
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Claimed</div>
              </div>
            </div>

            <div className="space-y-4">
              {outreachLogs.map(log => (
                <div key={log.id} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-gray-50">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-b border-gray-100">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg">{log.location}</h3>
                      <p className="text-sm font-bold text-orange-600">{log.eventType} • Led by {log.conductor}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                        <p className="font-extrabold text-gray-700">{log.date}</p>
                      </div>
                      <div className="text-right pl-4 border-l border-gray-200">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Souls</p>
                        <p className="font-black text-emerald-600 text-lg leading-none">{log.soulsWon}</p>
                      </div>
                    </div>
                  </div>
                  {log.notes && (
                    <div className="p-4 px-5 text-sm font-medium text-gray-600 italic">
                      "{log.notes}"
                    </div>
                  )}
                </div>
              ))}

              {outreachLogs.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                  <Target size={40} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-bold text-lg">No outreach events recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: HARVESTED SOULS ================= */}
        {activeTab === 'converts' && (
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
             <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-end gap-4">
               <div>
                  <h2 className="text-xl font-extrabold text-emerald-900 flex items-center gap-3 mb-2"><Users size={24} className="text-emerald-600" /> Harvested Souls Register</h2>
                  <p className="text-sm font-bold text-gray-500">All registered members currently holding the "New Convert" status.</p>
               </div>
               <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-center">
                  <div className="text-2xl font-black text-emerald-600">{convertsList.length}</div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Registered Souls</div>
               </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left whitespace-nowrap text-sm">
                 <thead>
                   <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-100">
                     <th className="p-4">Name</th>
                     <th className="p-4">Contact</th>
                     <th className="p-4">Assembly</th>
                     <th className="p-4">Soul Winner</th>
                     <th className="p-4 text-center">Date Added</th>
                   </tr>
                 </thead>
                 <tbody>
                   {convertsList.map(m => (
                     <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                       <td className="p-4 font-black text-gray-900">{m.name || 'Unknown'}</td>
                       <td className="p-4 text-gray-600 font-mono font-bold">{m.phone}</td>
                       <td className="p-4 text-emerald-700 font-bold">{m.localAssembly}</td>
                       <td className="p-4 text-gray-500 font-bold">{m.soulWinner || 'General Outreach'}</td>
                       <td className="p-4 text-center text-gray-500 font-bold">
                         {m.dateAdded ? new Date(m.dateAdded).toLocaleDateString() : 'Unknown'}
                       </td>
                     </tr>
                   ))}
                   {convertsList.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-gray-400 font-bold italic">No New Converts are currently registered in the Directory.</td></tr>}
                 </tbody>
               </table>
             </div>
           </div>
         )}

      </div>
    </DashboardLayout>
  );
}