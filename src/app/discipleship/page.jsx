"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Target, Droplet, Wind, GraduationCap, FileText, Save, Search, CheckCircle2, AlertCircle, Loader2, MessageCircle, Activity, Lightbulb, RefreshCw, ShieldAlert, TrendingUp, UserMinus } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';

export default function DiscipleshipTracker() {
  const [members, setMembers] = useState([]);
  const [savedLogs, setSavedLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('converts'); 
  
  // --- GENERAL STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- DAILY LOG STATES ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [assembly, setAssembly] = useState('');
  const [group, setGroup] = useState('');
  const [contactRecords, setContactRecords] = useState({});
  const [reportAssembly, setReportAssembly] = useState('All Assemblies');

  // --- THE SEQUENTIAL ENGINE ---
  const sequenceSteps = [
    { day: 'Sunday', prompt: "Which part of today’s sermon stayed with you the most?", tags: ['Conviction', 'Confusion'] },
    { day: 'Monday', prompt: "How did the message challenge you personally?", tags: ['Conviction', 'Action', 'Confusion'] },
    { day: 'Tuesday', prompt: "What is one step you can take this week to live it out?", tags: ['Action', 'Avoidance'] },
    { day: 'Wednesday', prompt: "Have you taken any step you planned?", tags: ['Action', 'Avoidance'] },
    { day: 'Thursday', prompt: "What is making it difficult to apply the message?", tags: ['Confusion', 'Avoidance'] },
    { day: 'Friday', prompt: "What did you do this week to follow the message?", tags: ['Action', 'Avoidance'] },
    { day: 'Completed', prompt: "Weekly sequence completed. Awaiting Sunday reset.", tags: [] }
  ];

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMembers(fetchedMembers);

      const initialRecords = {};
      fetchedMembers.forEach(m => { initialRecords[m.id] = { status: 'Not Reached', tag: '', notes: '' }; });
      setContactRecords(initialRecords);
    });

    const unsubLogs = onSnapshot(collection(db, 'discipleship_logs'), (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedLogs(fetchedLogs);
    });

    return () => { unsubMembers(); unsubLogs(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // ==========================================
  // MODULE 1 & 2: CONVERTS & BAPTISMS (IRONCLAD)
  // ==========================================
  const updateMemberStatus = async (id, field, value, memberName) => {
    try {
      await updateDoc(doc(db, 'members', id), { [field]: value });
      showNotification('success', `Hallelujah! ${memberName}'s record has been updated.`);
    } catch (error) { showNotification('error', "Connection Error."); }
  };

  const graduateToMember = async (id, memberName) => {
    if (window.confirm(`Graduate ${memberName} to full Church Member?`)) {
      try {
        await updateDoc(doc(db, 'members', id), { churchRole: 'Member', discipleshipGroup: 'General' });
        showNotification('success', `${memberName} has graduated!`);
      } catch (error) { console.error(error); }
    }
  };

  // IRONCLAD FILTERING: Prevents crashes if a member name is blank
  const safeSearch = (searchTerm || '').toLowerCase();
  
  const convertsList = members.filter(m => 
    m && m.churchRole === 'New Convert' && 
    (m.name || '').toLowerCase().includes(safeSearch)
  );

  const baptismCandidates = members.filter(m => 
    m && (m.waterBaptismStatus !== 'Yes' || m.spiritBaptism !== 'Yes') && 
    (m.name || '').toLowerCase().includes(safeSearch)
  );


  // ==========================================
  // MODULE 3: DAILY SEQUENTIAL LOGS
  // ==========================================
  const allAssemblies = [...new Set(["Central", ...members.map(m => m.localAssembly).filter(Boolean)])].sort();
  const getGroupsForAssembly = (selectedAssembly) => {
    const dbGroups = members.filter(m => m.localAssembly === selectedAssembly).map(m => m.discipleshipGroup).filter(Boolean);
    return [...new Set(dbGroups)].sort();
  };

  const membersToLog = members.filter(m => m.localAssembly === assembly && m.discipleshipGroup === group);

  const handleRecordChange = (id, field, value) => {
    setContactRecords(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSaveLogs = async () => {
    if (!assembly || !group) { showNotification('error', "Select Assembly and Group."); return; }
    setIsSubmitting(true);

    const activeRecords = {};
    let contactCount = 0;
    const batch = writeBatch(db); 

    membersToLog.forEach(m => {
      const record = contactRecords[m.id];
      if (record.status !== 'Not Reached' && record.tag !== '') {
        const currentStage = m.discipleshipStage || 0;
        const stepInfo = sequenceSteps[Math.min(currentStage, 5)];
        
        activeRecords[m.id] = { 
          name: m.name || 'Unknown', 
          role: m.churchRole || 'Member', 
          status: record.status,
          tag: record.tag,
          questionAsked: stepInfo.prompt,
          notes: record.notes 
        };
        contactCount++;

        const memberRef = doc(db, 'members', m.id);
        batch.update(memberRef, { discipleshipStage: Math.min(currentStage + 1, 6) });
      }
    });

    if (contactCount === 0) {
      showNotification('error', "No behavioral tags selected.");
      setIsSubmitting(false); return;
    }

    try {
      await addDoc(collection(db, 'discipleship_logs'), {
        date, assembly, group, records: activeRecords, totalContacted: contactCount, timestamp: new Date().toISOString()
      });
      await batch.commit(); 
      
      showNotification('success', `Logs secured and members advanced to next step!`);
      const resetRecords = { ...contactRecords };
      membersToLog.forEach(m => { resetRecords[m.id] = { status: 'Not Reached', tag: '', notes: '' }; });
      setContactRecords(resetRecords);

    } catch (error) {
      showNotification('error', "Connection Error.");
    } finally { setIsSubmitting(false); }
  };

  const handleResetSequence = async () => {
    if (window.confirm("DISTRICT OVERRIDE: Are you sure you want to reset ALL members back to the Sunday question?")) {
      setIsSubmitting(true);
      try {
        const batch = writeBatch(db);
        members.forEach(m => {
          const memberRef = doc(db, 'members', m.id);
          batch.update(memberRef, { discipleshipStage: 0 });
        });
        await batch.commit();
        showNotification('success', "Weekly sequence completely reset. Everyone is back to Sunday.");
      } catch (error) {
        showNotification('error', "Failed to reset sequence.");
      } finally { setIsSubmitting(false); }
    }
  };


  // ==========================================
  // MODULE 4: PASTOR'S 60-SECOND REPORT
  // ==========================================
  const generatePastorReport = () => {
    const recentLogs = savedLogs.slice(0, 15).filter(log => reportAssembly === 'All Assemblies' || log.assembly === reportAssembly);
    
    let immediateAttention = [];
    let growthSignals = [];
    let tagCounts = { Conviction: 0, Action: 0, Confusion: 0, Avoidance: 0 };
    let contactedIds = new Set();

    recentLogs.forEach(log => {
      Object.entries(log.records).forEach(([memberId, data]) => {
        contactedIds.add(memberId);
        tagCounts[data.tag] = (tagCounts[data.tag] || 0) + 1;
        
        if (data.tag === 'Confusion' || data.tag === 'Avoidance') {
           if (!immediateAttention.some(m => m.id === memberId)) {
             immediateAttention.push({ id: memberId, name: data.name, tag: data.tag, issue: data.tag === 'Avoidance' ? 'Avoided midweek check or silent' : 'Confused about message' });
           }
        }
        if (data.tag === 'Action' || data.tag === 'Conviction') {
           if (!growthSignals.some(m => m.id === memberId)) {
             growthSignals.push({ id: memberId, name: data.name, tag: data.tag });
           }
        }
      });
    });

    const allFilteredMembers = members.filter(m => reportAssembly === 'All Assemblies' || m.localAssembly === reportAssembly);
    const silentMembers = allFilteredMembers.filter(m => !contactedIds.has(m.id)).slice(0, 10); 

    let temperature = "The spiritual temperature is mixed; requires consistent pastoral follow-up.";
    const totalTags = tagCounts.Conviction + tagCounts.Action + tagCounts.Confusion + tagCounts.Avoidance;
    if (totalTags > 0) {
      if (tagCounts.Action > totalTags * 0.4) temperature = "Strong momentum: Members are actively practicing the Word and taking decisive steps.";
      else if (tagCounts.Confusion > totalTags * 0.3) temperature = "Warning: High levels of confusion detected. Pastoral clarification of recent sermons is required.";
      else if (tagCounts.Avoidance > totalTags * 0.3) temperature = "Caution: Members are hesitant and avoiding deep engagement with the recent message.";
      else if (tagCounts.Conviction > totalTags * 0.4) temperature = "Members are deeply convicted by the Word, but need a push towards practical action.";
    }

    return { immediateAttention, growthSignals, silentMembers, temperature };
  };

  const report = generatePastorReport();

  // --- STYLING HELPERS ---
  const getTagColor = (tag) => {
    if (tag === 'Action') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (tag === 'Conviction') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (tag === 'Confusion') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (tag === 'Avoidance') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const inputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto relative pb-10">
        
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <div className="flex justify-between items-end mb-8">
          <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tight">Discipleship Command</h1>
          <button onClick={handleResetSequence} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-xs transition-colors border border-red-100">
            <RefreshCw size={14} /> District Weekly Reset
          </button>
        </div>

        {/* 4-TIER TAB NAVIGATION */}
        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200 pb-5">
          <button onClick={() => setActiveTab('converts')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'converts' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}><Target size={18} /> New Converts</button>
          <button onClick={() => setActiveTab('baptism')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'baptism' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}><Droplet size={18} /> Baptisms</button>
          <button onClick={() => setActiveTab('daily')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'daily' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}><Activity size={18} /> Daily Contact Log</button>
          <button onClick={() => setActiveTab('weekly')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'weekly' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}><FileText size={18} /> Pastor's Report</button>
        </div>

        {/* ================= TAB 1: NEW CONVERTS ================= */}
        {activeTab === 'converts' && (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
             <div className="p-6 border-b border-gray-100">
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={18}/>
                  <input type="text" placeholder="Search converts by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 font-bold" />
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left whitespace-nowrap text-sm">
                 <thead>
                   <tr className="bg-blue-50 text-blue-900 font-extrabold border-b border-blue-100">
                     <th className="p-4">Convert Name</th><th className="p-4">Assembly</th><th className="p-4">Soul Winner</th><th className="p-4 text-center">Water Baptism</th><th className="p-4 text-center">Spirit Baptism</th><th className="p-4 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {convertsList.map(m => (
                     <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                       <td className="p-4 font-bold text-gray-900">{m.name || 'Unknown'}</td><td className="p-4 text-gray-600 font-bold">{m.localAssembly}</td><td className="p-4 text-gray-500">{m.soulWinner || 'Unknown'}</td>
                       <td className="p-4 text-center">
                         <select value={m.waterBaptismStatus || 'No'} onChange={(e) => updateMemberStatus(m.id, 'waterBaptismStatus', e.target.value, m.name)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border outline-none ${m.waterBaptismStatus === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}><option value="No">Pending</option><option value="Yes">Baptized</option></select>
                       </td>
                       <td className="p-4 text-center">
                         <select value={m.spiritBaptism || 'No'} onChange={(e) => updateMemberStatus(m.id, 'spiritBaptism', e.target.value, m.name)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border outline-none ${m.spiritBaptism === 'Yes' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-red-50 text-red-700 border-red-200'}`}><option value="No">Pending</option><option value="Yes">Baptized</option></select>
                       </td>
                       <td className="p-4 text-center">
                         <button onClick={() => graduateToMember(m.id, m.name)} disabled={m.waterBaptismStatus !== 'Yes'} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all w-full ${m.waterBaptismStatus === 'Yes' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} title={m.waterBaptismStatus !== 'Yes' ? "Must be water baptized" : "Graduate"}><GraduationCap size={14} /> Graduate</button>
                       </td>
                     </tr>
                   ))}
                   {convertsList.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-gray-400 font-bold italic">No New Converts found matching search.</td></tr>}
                 </tbody>
               </table>
             </div>
           </div>
         )}

        {/* ================= TAB 2: BAPTISM CANDIDATES ================= */}
        {activeTab === 'baptism' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
            <div className="p-4 bg-amber-50 border-b border-amber-100 text-amber-800 font-bold text-sm flex items-center gap-2">
              <Wind size={18} /> Shows ALL members missing Water or Spirit Baptism.
            </div>
            <div className="p-6 border-b border-gray-100">
               <div className="relative max-w-md">
                 <Search className="absolute left-4 top-3.5 text-gray-400" size={18}/>
                 <input type="text" placeholder="Search candidates by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" />
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-900 font-extrabold border-b border-gray-200">
                    <th className="p-4">Member Name</th><th className="p-4">Role & Assembly</th><th className="p-4 text-center">Water Baptism</th><th className="p-4 text-center">Spirit Baptism</th>
                  </tr>
                </thead>
                <tbody>
                  {baptismCandidates.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{m.name || 'Unknown'}</td><td className="p-4 text-gray-600 font-bold">{m.churchRole} • {m.localAssembly}</td>
                      <td className="p-4 text-center">
                        <select value={m.waterBaptismStatus || 'No'} onChange={(e) => updateMemberStatus(m.id, 'waterBaptismStatus', e.target.value, m.name)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border outline-none ${m.waterBaptismStatus === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}><option value="No">Needs Baptism</option><option value="Yes">Completed</option></select>
                      </td>
                      <td className="p-4 text-center">
                        <select value={m.spiritBaptism || 'No'} onChange={(e) => updateMemberStatus(m.id, 'spiritBaptism', e.target.value, m.name)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border outline-none ${m.spiritBaptism === 'Yes' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}><option value="No">Seeking</option><option value="Yes">Baptized</option></select>
                      </td>
                    </tr>
                  ))}
                  {baptismCandidates.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-gray-400 font-bold italic">All matching members have received both baptisms.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DAILY SEQUENTIAL LOG ================= */}
        {activeTab === 'daily' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-blue-900 flex items-center gap-3 mb-2"><Activity size={24} className="text-blue-600" /> Sequential Discipleship Log</h2>
              <p className="text-sm font-bold text-gray-500">Members automatically progress to the next question after each logged contact.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Date of Contact</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputStyle} /></div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Local Assembly</label>
                <select value={assembly} onChange={(e) => { setAssembly(e.target.value); setGroup(''); }} className={inputStyle}>
                  <option value="">- Select -</option>{allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Discipleship Group</label>
                <select value={group} onChange={(e) => setGroup(e.target.value)} disabled={!assembly} className={`${inputStyle} ${!assembly && 'opacity-50 cursor-not-allowed'}`}>
                  <option value="">- Select Group -</option>{assembly && getGroupsForAssembly(assembly).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {assembly && group && (
              <div className="animate-fade-in">
                
                {/* THE CSS GRID FIX: Replaces the overflowing table */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden mb-6">
                  {/* DESKTOP HEADER */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-blue-50/50 border-b border-blue-100 text-[10px] font-black text-blue-900 uppercase tracking-widest">
                    <div className="col-span-3">Member</div>
                    <div className="col-span-4">Current Sequential Question</div>
                    <div className="col-span-2">Status & Tag</div>
                    <div className="col-span-3">Private Care Notes</div>
                  </div>

                  {/* ROWS */}
                  <div className="divide-y divide-gray-50">
                    {membersToLog.map(m => {
                      const currentStage = m.discipleshipStage || 0;
                      const stepInfo = sequenceSteps[Math.min(currentStage, 6)];
                      const isCompleted = currentStage >= 6;

                      return (
                        <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                          
                          {/* Member Column */}
                          <div className="md:col-span-3">
                            <div className="font-extrabold text-gray-800 text-base">{m.name || 'Unknown'}</div>
                            <div className="text-xs font-bold text-blue-500 mt-0.5">{isCompleted ? 'Completed' : `Step ${currentStage + 1}: ${stepInfo.day}`}</div>
                          </div>
                          
                          {/* Sequential Question Column */}
                          <div className="md:col-span-4">
                            <div className={`p-3 rounded-xl border ${isCompleted ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-blue-50 border-blue-100 text-blue-800'} font-bold text-xs whitespace-normal leading-relaxed`}>
                              {stepInfo.prompt}
                            </div>
                          </div>
                          
                          {/* Status and Custom Tags Column */}
                          <div className="md:col-span-2">
                            {!isCompleted ? (
                              <div className="space-y-2">
                                <select 
                                  value={contactRecords[m.id]?.status || 'Not Reached'}
                                  onChange={(e) => handleRecordChange(m.id, 'status', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg font-bold text-xs border outline-none bg-white text-gray-600 focus:border-blue-500 transition-all"
                                >
                                  <option value="Not Reached">Not Reached</option>
                                  <option value="Contacted">Contacted</option>
                                  <option value="Left Message">Left Message</option>
                                </select>
                                
                                {contactRecords[m.id]?.status !== 'Not Reached' && (
                                  <select 
                                    value={contactRecords[m.id]?.tag || ''}
                                    onChange={(e) => handleRecordChange(m.id, 'tag', e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg font-bold text-xs border outline-none animate-fade-in transition-all ${contactRecords[m.id]?.tag === '' ? 'bg-amber-50 border-amber-200 text-amber-700' : getTagColor(contactRecords[m.id]?.tag)}`}
                                  >
                                    <option value="">- Select Tag -</option>
                                    {stepInfo.tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                  </select>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-bold italic text-xs">Waiting for reset.</span>
                            )}
                          </div>
                          
                          {/* Private Care Notes Column */}
                          <div className="md:col-span-3">
                            {!isCompleted && contactRecords[m.id]?.status !== 'Not Reached' && (
                              <input 
                                type="text" 
                                placeholder="Private Care Notes..." 
                                value={contactRecords[m.id]?.notes || ''} 
                                onChange={(e) => handleRecordChange(m.id, 'notes', e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg outline-none px-3 py-2.5 text-xs text-gray-600 focus:bg-white focus:border-blue-500 transition-all animate-fade-in font-bold" 
                              />
                            )}
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button onClick={handleSaveLogs} disabled={isSubmitting} className={`px-8 py-4 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-3 text-white ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 w-full md:w-auto md:ml-auto'}`}>
                  {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : <><Save size={20} /> Save Contact & Advance Sequence</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PASTOR'S 60-SECOND REPORT ================= */}
        {activeTab === 'weekly' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            <h2 className="text-2xl font-extrabold text-purple-900 flex items-center gap-3 mb-6">
              <FileText size={28} className="text-purple-600" /> 60-Second Pastoral Report
            </h2>
            <p className="text-sm font-bold text-gray-500 mb-8 border-l-4 border-purple-200 pl-4 py-1">
              Data Protection Active: Raw confessions and private notes are hidden. Displaying only structural growth patterns.
            </p>

            <div className="mb-10 flex items-center gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100 max-w-sm">
               <label className="font-bold text-purple-900 text-sm whitespace-nowrap">Filter Report:</label>
               <select value={reportAssembly} onChange={e => setReportAssembly(e.target.value)} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm outline-none focus:border-purple-500 font-bold text-purple-800">
                  <option value="All Assemblies">All Assemblies</option>
                  {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="md:col-span-2 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-sm font-black uppercase tracking-wider text-blue-200 mb-2 flex items-center gap-2"><Activity size={16}/> Spiritual Temperature</h3>
                  <p className="text-xl md:text-2xl font-extrabold leading-tight">{report.temperature}</p>
                </div>
                <Wind size={120} className="absolute -right-10 -bottom-10 text-white/10" />
              </div>

              <div className="border border-red-200 bg-red-50/30 rounded-2xl p-6">
                <h3 className="text-red-700 font-black flex items-center gap-2 mb-4 pb-2 border-b border-red-100"><ShieldAlert size={20}/> 1. Immediate Attention Required</h3>
                <div className="space-y-3">
                  {report.immediateAttention.length > 0 ? report.immediateAttention.map((m, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex justify-between items-center">
                      <span className="font-extrabold text-gray-800">{m.name}</span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{m.issue}</span>
                    </div>
                  )) : <p className="text-sm font-bold text-gray-400 italic">No urgent issues detected this week.</p>}
                </div>
              </div>

              <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-6">
                <h3 className="text-emerald-700 font-black flex items-center gap-2 mb-4 pb-2 border-b border-emerald-100"><TrendingUp size={20}/> 2. Positive Growth Signals</h3>
                <div className="space-y-3">
                  {report.growthSignals.length > 0 ? report.growthSignals.map((m, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center">
                      <span className="font-extrabold text-gray-800">{m.name}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Took Action / Convicted</span>
                    </div>
                  )) : <p className="text-sm font-bold text-gray-400 italic">Awaiting action reports.</p>}
                </div>
              </div>

              <div className="md:col-span-2 border border-gray-200 bg-gray-50 rounded-2xl p-6">
                <h3 className="text-gray-700 font-black flex items-center gap-2 mb-4 pb-2 border-b border-gray-200"><UserMinus size={20}/> 3. Silent Members (Not Reached)</h3>
                <div className="flex flex-wrap gap-2">
                  {report.silentMembers.length > 0 ? report.silentMembers.map((m, i) => (
                    <span key={i} className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 shadow-sm">{m.name}</span>
                  )) : <p className="text-sm font-bold text-gray-400 italic">Excellent! All members have been contacted.</p>}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}