"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { MessageSquare, Send, History, Users, AlertCircle, CheckCircle2, Loader2, Smartphone, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

export default function BulkSMS() {
  const [isAuthorized, setIsAuthorized] = useState(null); // null = checking, false = denied, true = allowed
  const [members, setMembers] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' or 'history'
  
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
      setIsAuthorized(false); // Deny access!
    };
    checkClearance();
  }, []);

  // --- FETCH DIRECTORY & LOGS ---
  useEffect(() => {
    if (isAuthorized) {
      // Fetch Members
      const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(fetched);
      });

      // Fetch SMS History
      const unsubLogs = onSnapshot(collection(db, 'sms_logs'), (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by newest first
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
    // Only include people with valid 10-digit phone numbers
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
  const totalCostEstimate = validRecipients.length * smsPages * 0.04; // 4 pesewas per page

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
      // 1. In the future, you will trigger the real Arkesel/Hubtel API here.
      
      // 2. Log the successful broadcast to your Firebase history
      await addDoc(collection(db, 'sms_logs'), {
        messageBody: message,
        recipientCount: validRecipients.length,
        targetFilters: `${targetAssembly}, ${targetRole}, ${targetGender}, ${targetDemo}`,
        estimatedCost: totalCostEstimate,
        timestamp: new Date().toISOString()
      });

      showNotification('success', `Broadcast successfully dispatched and logged for ${validRecipients.length} members!`);
      setMessage('');
      
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to send broadcast. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];
  
  // --- UPDATED CHURCH ROLES WITH PRESIDING TITLES ---
  const churchRoles = [
    "Member", 
    "New Convert", 
    "Elder", 
    "Deacon", 
    "Deaconess", 
    "District Minister", 
    "District Minister's Wife", 
    "Presiding Elder", 
     "Presiding Deacon",
    "Presiding Brother" // Added Presiding Brother as requested
  ];

  const filterSelectStyle = "p-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-blue-500 focus:bg-white transition-all w-full text-gray-700";

  // --- ACCESS DENIED SCREEN ---
  if (isAuthorized === false) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 shadow-lg">
            <ShieldAlert size={48} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">Restricted Area</h1>
          <p className="text-gray-500 font-bold max-w-md">
            The District Communication Hub is strictly reserved for Tier 1 Supreme Command.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // --- LOADING SCREEN ---
  if (isAuthorized === null) return <DashboardLayout><div className="p-8 text-center font-bold text-gray-500 flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> Verifying Security Clearance...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        {/* HEADER & TAB BUTTONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><MessageSquare size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Bulk SMS</h1>
              <p className="font-bold text-gray-500">District Communication Hub.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-100 p-1.5 rounded-2xl">
            <button onClick={() => setActiveTab('compose')} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'compose' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              <Send size={16}/> Compose
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              <History size={16}/> Dispatch History
            </button>
          </div>
        </div>

        {activeTab === 'compose' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* LEFT COLUMN: FILTER & TARGETING */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-50">
                  <Users size={18} className="text-blue-600"/> Select Audience
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Assembly</label>
                    <select value={targetAssembly} onChange={e => setTargetAssembly(e.target.value)} className={filterSelectStyle}>
                      <option value="All Assemblies">All Assemblies</option>
                      {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Church Role</label>
                    <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className={filterSelectStyle}>
                      <option value="All Roles">All Roles</option>
                      {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Demographic (Age)</label>
                    <select value={targetDemo} onChange={e => setTargetDemo(e.target.value)} className={filterSelectStyle}>
                      <option value="All Ages">All Ages</option>
                      <option value="< 13">Children (&lt; 13)</option>
                      <option value="13 - 35">Youth (13 - 35)</option>
                      <option value="> 35">Adults (&gt; 35)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Gender</label>
                    <select value={targetGender} onChange={e => setTargetGender(e.target.value)} className={filterSelectStyle}>
                      <option value="All Genders">All Genders</option>
                      <option value="Male">Male Only</option>
                      <option value="Female">Female Only</option>
                    </select>
                  </div>
                </div>

                {/* LIVE AUDIENCE METRIC */}
                <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between shadow-inner">
                  <div>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Valid Phones Found</p>
                    <p className="text-4xl font-black text-blue-900 leading-none mt-1">{validRecipients.length}</p>
                  </div>
                  <Smartphone size={32} className="text-blue-200" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MESSAGE COMPOSER */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSendSMS} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                
                <div className="flex-1 flex flex-col">
                  <label className="text-sm font-black text-slate-800 mb-4 flex justify-between items-center">
                    <span>Message Content</span>
                    <span className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${characterCount > 160 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {smsPages} Page{smsPages > 1 ? 's' : ''} ({characterCount} chars)
                    </span>
                  </label>
                  
                  <textarea 
                    required
                    placeholder="Type your official broadcast message here..." 
                    value={message} 
                    onChange={e => setMessage(e.target.value)}
                    className="w-full flex-1 min-h-[300px] p-6 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-800 font-bold resize-none leading-relaxed"
                  />
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs font-bold text-gray-400 flex flex-col">
                    <span>Network Provider Estimate</span>
                    <span className="text-gray-900 text-lg font-black mt-0.5">GHS {totalCostEstimate.toFixed(2)}</span>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSending || validRecipients.length === 0} 
                    className={`w-full sm:w-auto px-10 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-3 text-white ${isSending || validRecipients.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
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
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-lg font-black text-slate-800">Recent Broadcasts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="p-5">Date & Time</th>
                    <th className="p-5">Message Snippet</th>
                    <th className="p-5">Target Audience</th>
                    <th className="p-5 text-center">Recipients</th>
                    <th className="p-5 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {smsLogs.map(log => (
                    <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="p-5 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs font-bold text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="p-5 max-w-xs">
                        <p className="font-bold text-gray-700 truncate">{log.messageBody}</p>
                      </td>
                      <td className="p-5">
                        <div className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg inline-block border border-blue-100">
                          {log.targetFilters}
                        </div>
                      </td>
                      <td className="p-5 text-center font-black text-gray-800">
                        {log.recipientCount}
                      </td>
                      <td className="p-5 text-right font-mono font-bold text-gray-500">
                        GHS {log.estimatedCost?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {smsLogs.length === 0 && (
                    <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic">No broadcasts have been sent yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}