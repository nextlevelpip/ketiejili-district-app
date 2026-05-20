"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { MessageSquare, Send, History, Users, AlertCircle, CheckCircle2, Loader2, Smartphone, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

export default function BulkSMS() {
  const [isAuthorized, setIsAuthorized] = useState(null); 
  const [members, setMembers] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('compose'); 
  
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // --- TARGETING FILTERS ---
  const [targetRole, setTargetRole] = useState('All Roles');
  const [targetAssembly, setTargetAssembly] = useState('All Assemblies');
  const [targetGender, setTargetGender] = useState('All Genders');
  const [targetDemo, setTargetDemo] = useState('All Ages');

  // --- STRICT TIER 1 SECURITY CHECK ---
  useEffect(() => {
    const checkClearance = () => {
      const userStr = localStorage.getItem('ketiejili_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.tierLevel === 1) {
          setIsAuthorized(true);
          return;
        }
      }
      setIsAuthorized(false); 
    };
    checkClearance();
  }, []);

  // --- FETCH DIRECTORY & LOGS ---
  useEffect(() => {
    if (isAuthorized) {
      const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(fetched);
      });

      const unsubLogs = onSnapshot(collection(db, 'sms_logs'), (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setSmsLogs(fetchedLogs);
      });

      return () => { unsubMembers(); unsubLogs(); };
    }
  }, [isAuthorized]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  // --- AGE CALCULATION ---
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // --- RECIPIENT FILTERING LOGIC ---
  const validRecipients = members.filter(m => {
    if (!m.phone || m.phone.length !== 10) return false;

    const age = calculateAge(m.dob);
    const matchesAssem = targetAssembly === 'All Assemblies' || m.localAssembly === targetAssembly;
    const matchesRole = targetRole === 'All Roles' || m.churchRole === targetRole;
    const matchesGen = targetGender === 'All Genders' || m.gender === targetGender;
    
    let matchesDemo = true;
    if (targetDemo === '< 13') matchesDemo = age !== null && age < 13;
    else if (targetDemo === '13 - 35') matchesDemo = age !== null && age >= 13 && age <= 35;
    else if (targetDemo === '> 35') matchesDemo = age !== null && age > 35;
    
    return matchesAssem && matchesRole && matchesGen && matchesDemo;
  });

  // --- SMS CALCULATIONS ---
  const characterCount = message.length;
  const smsPages = Math.ceil(characterCount / 160) || 1;
  const totalCostEstimate = validRecipients.length * smsPages * 0.04; 

  const handleSendSMS = async (e) => {
    e.preventDefault();
    if (validRecipients.length === 0) {
      showNotification('error', 'No valid recipients found matching these filters.');
      return;
    }
    if (!message.trim()) {
      showNotification('error', 'Please type a message before sending.');
      return;
    }

    setIsSending(true);

    try {
      const formattedPhones = validRecipients.map(m => {
        let num = m.phone.replace(/\D/g, '');
        if (num.startsWith('0')) {
          return '233' + num.substring(1);
        }
        return num;
      });

      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          recipients: formattedPhones
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transmission failed at the bridge.');
      }

      await addDoc(collection(db, 'sms_logs'), {
        messageBody: message,
        recipientCount: validRecipients.length,
        targetFilters: `${targetAssembly}, ${targetRole}, ${targetGender}, ${targetDemo}`,
        estimatedCost: totalCostEstimate,
        timestamp: new Date().toISOString()
      });

      showNotification('success', `Broadcast successfully dispatched to ${validRecipients.length} members!`);
      setMessage('');
      
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to send broadcast. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];
  
  const churchRoles = [
    "Member", "New Convert", "Elder", "Deacon", "Deaconess", 
    "District Minister", "District Minister's Wife", 
    "Presiding Elder", "Presiding Deacon", "Presiding Brother"
  ];

  // PREMIUM GLASS INPUT STYLE
  const filterSelectStyle = "w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm outline-none focus:border-cyan-400 focus:bg-white/10 transition-all text-white placeholder:text-cyan-200 [&>option]:text-gray-900";

  // --- ACCESS DENIED SCREEN (GLASSMORPHISM) ---
  if (isAuthorized === false) {
    return (
      <DashboardLayout>
        <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0284c7] via-[#1d4ed8] to-[#1e3a8a] flex flex-col items-center justify-center text-center p-6 animate-fade-in relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-400/30 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="bg-black/20 backdrop-blur-2xl border border-white/10 p-12 rounded-[3rem] shadow-2xl relative z-10 flex flex-col items-center max-w-lg">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20">
              <ShieldAlert size={48} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-4 drop-shadow-md">Restricted Area</h1>
            <p className="text-cyan-100 font-bold">
              The District Communication Hub is strictly reserved for Tier 1 Supreme Command.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- LOADING SCREEN ---
  if (isAuthorized === null) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-cyan-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0284c7] via-[#1d4ed8] to-[#1e3a8a] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Decorative ambient glowing orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-400/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/30 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          {/* HEADER & TAB BUTTONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><MessageSquare size={32} /></div>
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Bulk SMS</h1>
                <p className="font-bold text-cyan-100">District Communication Hub.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/5">
              <button onClick={() => setActiveTab('compose')} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'compose' ? 'bg-white/20 text-white shadow-lg border border-white/20' : 'text-cyan-200 hover:text-white hover:bg-white/5'}`}>
                <Send size={16}/> Compose
              </button>
              <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'history' ? 'bg-white/20 text-white shadow-lg border border-white/20' : 'text-cyan-200 hover:text-white hover:bg-white/5'}`}>
                <History size={16}/> Dispatch History
              </button>
            </div>
          </div>

          {activeTab === 'compose' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* LEFT COLUMN: FILTER & TARGETING */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10">
                  <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2 pb-4 border-b border-white/10">
                    <Users size={18} className="text-cyan-300"/> Select Audience
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-cyan-200 uppercase ml-1 mb-1 block">Assembly</label>
                      <select value={targetAssembly} onChange={e => setTargetAssembly(e.target.value)} className={filterSelectStyle}>
                        <option value="All Assemblies">All Assemblies</option>
                        {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-cyan-200 uppercase ml-1 mb-1 block">Church Role</label>
                      <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className={filterSelectStyle}>
                        <option value="All Roles">All Roles</option>
                        {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-cyan-200 uppercase ml-1 mb-1 block">Demographic (Age)</label>
                      <select value={targetDemo} onChange={e => setTargetDemo(e.target.value)} className={filterSelectStyle}>
                        <option value="All Ages">All Ages</option>
                        <option value="< 13">Children (&lt; 13)</option>
                        <option value="13 - 35">Youth (13 - 35)</option>
                        <option value="> 35">Adults (&gt; 35)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-cyan-200 uppercase ml-1 mb-1 block">Gender</label>
                      <select value={targetGender} onChange={e => setTargetGender(e.target.value)} className={filterSelectStyle}>
                        <option value="All Genders">All Genders</option>
                        <option value="Male">Male Only</option>
                        <option value="Female">Female Only</option>
                      </select>
                    </div>
                  </div>

                  {/* LIVE AUDIENCE METRIC */}
                  <div className="mt-8 p-5 bg-cyan-900/40 border border-cyan-400/20 rounded-2xl flex items-center justify-between shadow-inner backdrop-blur-md">
                    <div>
                      <p className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">Valid Phones Found</p>
                      <p className="text-4xl font-black text-white leading-none mt-1">{validRecipients.length}</p>
                    </div>
                    <Smartphone size={32} className="text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: MESSAGE COMPOSER */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSendSMS} className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 flex flex-col h-full">
                  
                  <div className="flex-1 flex flex-col">
                    <label className="text-sm font-black text-white mb-4 flex justify-between items-center">
                      <span>Message Content</span>
                      <span className={`text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border ${characterCount > 160 ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-white/10 text-cyan-100 border-white/20'}`}>
                        {smsPages} Page{smsPages > 1 ? 's' : ''} ({characterCount} chars)
                      </span>
                    </label>
                    
                    <textarea 
                      required
                      placeholder="Type your official broadcast message here..." 
                      value={message} 
                      onChange={e => setMessage(e.target.value)}
                      className="w-full flex-1 min-h-[300px] p-6 bg-black/20 border border-white/10 rounded-2xl focus:bg-black/30 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all text-white font-bold resize-none leading-relaxed placeholder:text-cyan-200/50"
                    />
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs font-bold text-cyan-200 flex flex-col">
                      <span>Network Provider Estimate</span>
                      <span className="text-white text-xl font-black mt-0.5">GHS {totalCostEstimate.toFixed(2)}</span>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isSending || validRecipients.length === 0} 
                      className={`w-full sm:w-auto px-10 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 text-white border border-white/20 ${isSending || validRecipients.length === 0 ? 'bg-white/10 text-white/50 cursor-not-allowed border-white/5' : 'bg-[#0ea5e9] hover:bg-[#0284c7] shadow-cyan-500/30'}`}
                    >
                      {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      {isSending ? 'Dispatching...' : 'Send Broadcast'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* DISPATCH HISTORY TAB */
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-white/10 bg-black/10">
                <h2 className="text-lg font-black text-white">Recent Broadcasts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-cyan-200 uppercase tracking-widest">
                      <th className="p-5">Date & Time</th>
                      <th className="p-5">Message Snippet</th>
                      <th className="p-5">Target Audience</th>
                      <th className="p-5 text-center">Recipients</th>
                      <th className="p-5 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {smsLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 whitespace-nowrap">
                          <div className="font-bold text-white">{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs font-bold text-cyan-200 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-5 max-w-xs">
                          <p className="font-bold text-cyan-50 truncate">{log.messageBody}</p>
                        </td>
                        <td className="p-5">
                          <div className="text-[10px] font-black text-cyan-100 bg-cyan-900/50 px-2 py-1 rounded-lg inline-block border border-cyan-400/30">
                            {log.targetFilters}
                          </div>
                        </td>
                        <td className="p-5 text-center font-black text-white">
                          {log.recipientCount}
                        </td>
                        <td className="p-5 text-right font-mono font-bold text-cyan-200">
                          GHS {log.estimatedCost?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {smsLogs.length === 0 && (
                      <tr><td colSpan="5" className="p-12 text-center text-cyan-300 font-bold italic">No broadcasts have been sent yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}