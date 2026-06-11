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

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec)
  const filterSelectStyle = "w-full p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs outline-none focus:border-[#FFC300] transition-all text-white placeholder:text-white/30 [&>option]:text-[#000814]";

  // --- ACCESS DENIED SCREEN (RESTYLED) ---
  if (isAuthorized === false) {
    return (
      <DashboardLayout>
        <div className="min-h-full rounded-[2.5rem] bg-[#000814] border border-red-500/20 flex flex-col items-center justify-center text-center p-6 animate-fade-in relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="bg-[#001D3D] border border-[#003566] p-10 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center max-w-md w-full">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/20 shadow-inner">
              <ShieldAlert size={36} />
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-widest mb-3 border-b border-[#003566] pb-3 w-full">Restricted Area</h1>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest leading-relaxed">
              The District Communication Hub is strictly reserved for Tier 1 Supreme Command.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- LOADING SCREEN ---
  if (isAuthorized === null) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-xs uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><MessageSquare size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Bulk SMS</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">District Communication Hub.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('compose')} className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border flex items-center gap-1.5 ${activeTab === 'compose' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <Send size={12}/> Compose
              </button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <History size={12}/> Dispatch History
              </button>
            </div>
          </div>

          {activeTab === 'compose' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* LEFT COLUMN: FILTER & TARGETING */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#000814] p-6 rounded-2xl shadow-xl border border-[#003566]">
                  <h2 className="text-xs font-black text-white mb-5 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-[#003566]">
                    <Users size={16} className="text-[#FFC300]"/> Select Audience
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1 block">Assembly</label>
                      <select value={targetAssembly} onChange={e => setTargetAssembly(e.target.value)} className={filterSelectStyle}>
                        <option value="All Assemblies">All Assemblies</option>
                        {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1 block">Church Role</label>
                      <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className={filterSelectStyle}>
                        <option value="All Roles">All Roles</option>
                        {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1 block">Demographic (Age)</label>
                      <select value={targetDemo} onChange={e => setTargetDemo(e.target.value)} className={filterSelectStyle}>
                        <option value="All Ages">All Ages</option>
                        <option value="< 13">Children (&lt; 13)</option>
                        <option value="13 - 35">Youth (13 - 35)</option>
                        <option value="> 35">Adults (&gt; 35)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1 block">Gender</label>
                      <select value={targetGender} onChange={e => setTargetGender(e.target.value)} className={filterSelectStyle}>
                        <option value="All Genders">All Genders</option>
                        <option value="Male">Male Only</option>
                        <option value="Female">Female Only</option>
                      </select>
                    </div>
                  </div>

                  {/* LIVE AUDIENCE METRIC */}
                  <div className="mt-6 p-5 bg-[#001D3D] border border-[#003566] rounded-xl flex items-center justify-between shadow-inner">
                    <div>
                      <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Valid Phones</p>
                      <p className="text-2xl font-black text-white leading-none mt-1">{validRecipients.length}</p>
                    </div>
                    <Smartphone size={24} className="text-[#FFC300]" />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: MESSAGE COMPOSER */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSendSMS} className="bg-[#000814] p-6 rounded-2xl shadow-xl border border-[#003566] flex flex-col h-full">
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#003566]">
                      <span className="text-xs font-black text-white uppercase tracking-widest">Message Content</span>
                      <span className={`text-[8px] px-2 py-1 rounded font-black uppercase tracking-widest border ${characterCount > 160 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#001D3D] text-white/50 border-[#003566]'}`}>
                        {smsPages} Page{smsPages > 1 ? 's' : ''} ({characterCount} chars)
                      </span>
                    </div>
                    
                    <textarea 
                      required
                      placeholder="Type your official broadcast message here..." 
                      value={message} 
                      onChange={e => setMessage(e.target.value)}
                      className="w-full flex-1 min-h-[300px] p-5 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-white font-bold resize-none text-sm leading-relaxed placeholder:text-white/30"
                    />
                  </div>

                  <div className="mt-6 pt-5 border-t border-[#003566] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[9px] font-black text-white/50 uppercase tracking-widest flex flex-col">
                      <span>Network Estimate</span>
                      <span className="text-[#FFC300] text-base font-black mt-0.5 tracking-tight">GHS {totalCostEstimate.toFixed(2)}</span>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isSending || validRecipients.length === 0} 
                      className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-2 text-[#000814] border border-[#FFC300] ${isSending || validRecipients.length === 0 ? 'bg-white/5 text-white/30 cursor-not-allowed border-[#003566]' : 'bg-[#FFC300] hover:bg-[#FFD60A]'}`}
                    >
                      {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {isSending ? 'Dispatching...' : 'Send Broadcast'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* DISPATCH HISTORY TAB */
            <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-[#003566] bg-[#001D3D]">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">Recent Broadcasts</h2>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#001D3D] text-[#FFC300] font-extrabold border-b border-[#003566] text-[9px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4 w-32">Date & Time</th>
                      <th className="p-4">Message Snippet</th>
                      <th className="p-4">Target Audience</th>
                      <th className="p-4 text-center">Recipients</th>
                      <th className="p-4 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]">
                    {smsLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#001D3D]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="font-bold text-white/70 truncate">{log.messageBody}</p>
                        </td>
                        <td className="p-4">
                          <div className="text-[8px] font-black text-white/70 bg-[#003566] px-2 py-1 rounded border border-[#003566] uppercase tracking-widest inline-block">
                            {log.targetFilters}
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-[#FFC300]">
                          {log.recipientCount}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          GHS {log.estimatedCost?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {smsLogs.length === 0 && (
                      <tr><td colSpan="5" className="p-10 text-center text-white/50 font-bold italic text-xs">No broadcasts have been sent yet.</td></tr>
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