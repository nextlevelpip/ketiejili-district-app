"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { CalendarCheck, Save, Search, CheckCircle2, XCircle, AlertCircle, BarChart3, ClipboardCheck, AlertCircle as AlertIcon, Loader2, Users, PhoneCall, MessageSquare, MessageCircle, MapPin, Home, History, Trash2, Filter, CalendarDays } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

export default function Attendance() {
  const [members, setMembers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('mark'); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [currentUser, setCurrentUser] = useState(null);

  // --- MASTER TOGGLE (NEW LOGIC) ---
  const [meetingFormat, setMeetingFormat] = useState('Church House'); // 'Church House' | 'Home Cell'

  // --- MARK REGISTER STATES ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState('Sunday Service');
  const [customService, setCustomService] = useState('');
  const [assembly, setAssembly] = useState('Central');
  const [group, setGroup] = useState('All Groups (Whole Assembly)');
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [activeSubGroup, setActiveSubGroup] = useState('');

  // --- REPORT STATES (RANGE FILTER) ---
  const [reportMeetingFormat, setReportMeetingFormat] = useState('Church House');
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]); 
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportService, setReportService] = useState('All Services');
  const [reportAssembly, setReportAssembly] = useState('Central');

  // --- ANALYTICS STATES ---
  const [analyticsMeetingFormat, setAnalyticsMeetingFormat] = useState('Church House');
  const [analyticsAssembly, setAnalyticsAssembly] = useState('All Assemblies');
  const [analyticsServiceType, setAnalyticsServiceType] = useState('All Services');

  // --- HISTORY FILTER STATES ---
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterAssembly, setHistoryFilterAssembly] = useState('All Assemblies');
  const [historyFilterService, setHistoryFilterService] = useState('All Services');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(fetched.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
    });

    const unsubLogs = onSnapshot(collection(db, 'attendance_logs'), (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendanceLogs(fetchedLogs);
    });

    return () => { unsubMembers(); unsubLogs(); };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- DYNAMIC LIST GENERATORS BASED ON MEETING FORMAT ---
  const getServiceTypesList = (format) => {
    if (format === 'Home Cell') {
      return ["Monday Cell Meeting", "Cell Prayers", "Home Cell (Other)", "++ Add Custom ++"];
    }
    return [
      "Sunday Service", "Bible Study", "Children Ministry Meeting", 
      "Evangelism Ministry Meeting", "Friday Service", "PEMEM Meeting", 
      "Wednesday Service", "Women Ministry Meeting", "Youth Ministry Meeting", "++ Add Custom ++"
    ];
  };

  // Auto-reset service type when format changes
  useEffect(() => {
    const defaultService = meetingFormat === 'Home Cell' ? 'Monday Cell Meeting' : 'Sunday Service';
    setServiceType(defaultService);
    setGroup('All Groups (Whole Assembly)');
  }, [meetingFormat]);

  const assemblyMembers = members.filter(m => m.localAssembly === assembly && (m.membershipStatus === 'Active Member' || m.membershipStatus === 'Active' || !m.membershipStatus));

  const getDynamicGroups = () => {
    let rawGroups = [];
    if (meetingFormat === 'Home Cell') {
      rawGroups = assemblyMembers.map(m => m.homeCell);
    } else {
      rawGroups = assemblyMembers.map(m => m.bibleStudy);
    }
    const validGroups = rawGroups.filter(g => g && g.trim() !== '' && g !== 'New Convert');
    if (validGroups.length === 0) return ['Unassigned'];
    return [...new Set(validGroups)].sort();
  };

  const availableGroups = getDynamicGroups();

  useEffect(() => {
    setActiveSubGroup(availableGroups[0] || '');
  }, [assembly, meetingFormat, members]);

  // --- DYNAMIC MEMBER FILTERING FOR MARKING ---
  const targetMembers = assemblyMembers.filter(m => {
    if (group !== 'All Groups (Whole Assembly)') {
        if (meetingFormat === 'Home Cell') return m.homeCell === group;
        return m.bibleStudy === group;
    }
    return true;
  });

  const displayedMembers = group === 'All Groups (Whole Assembly)' 
    ? assemblyMembers.filter(m => {
        let relevantField = meetingFormat === 'Home Cell' ? m.homeCell : m.bibleStudy;
        return (relevantField || 'Unassigned') === activeSubGroup;
      })
    : targetMembers;

  useEffect(() => {
    if (activeTab === 'mark' && targetMembers.length > 0) {
      const defaults = {};
      targetMembers.forEach(m => {
        if (!attendanceRecords[m.id]) defaults[m.id] = 'Present'; 
      });
      if (Object.keys(defaults).length > 0) {
        setAttendanceRecords(prev => ({ ...prev, ...defaults }));
      }
    }
  }, [assembly, group, targetMembers, activeTab]);

  const toggleStatus = (id, status) => {
    setAttendanceRecords(prev => ({ ...prev, [id]: status }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (targetMembers.length === 0) return;
    
    setIsSubmitting(true);
    const finalService = serviceType === '++ Add Custom ++' ? customService : serviceType;
    
    const presentCount = targetMembers.filter(m => attendanceRecords[m.id] === 'Present').length;
    const absentCount = targetMembers.filter(m => attendanceRecords[m.id] === 'Absent').length;

    const payload = {
      date, 
      meetingFormat, 
      serviceType: finalService, 
      assembly, 
      group,
      totalMembers: targetMembers.length, 
      presentCount, 
      absentCount,
      records: attendanceRecords, 
      timestamp: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'attendance_logs'), payload);
      showNotification('success', 'Attendance Securely Logged.');
      setAttendanceRecords({}); 
      setActiveTab('history'); 
    } catch (err) {
      showNotification('error', 'Failed to log attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!isTier1) return showNotification('error', 'Requires Tier 1 Clearance to delete records.');
    if (window.confirm("Permanently delete this attendance record? This will alter analytics.")) {
      try {
        await deleteDoc(doc(db, 'attendance_logs', id));
        showNotification('success', 'Attendance record purged.');
      } catch (err) {
        showNotification('error', 'Failed to delete record.');
      }
    }
  };

  const handleSendDirectSMS = async (member, serviceType) => {
    const defaultMsg = `Praise the Lord ${String(member.name).split(' ')[0]}! We missed you at ${serviceType === 'All Services' ? 'church' : serviceType} recently. We pray all is well with you. God bless you! - Ketiejili District`;
    const message = window.prompt(`[TIER 1] Send Official SMS to ${member.name}:`, defaultMsg);
    
    if (!message) return;

    let formattedPhone = String(member.phone || '').replace(/\D/g, '');
    if (!formattedPhone) {
      showNotification('error', 'Member does not have a valid phone number.'); return;
    }
    if (formattedPhone.startsWith('0')) formattedPhone = '233' + formattedPhone.substring(1);

    try {
      showNotification('success', 'Transmitting message to network...');
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, recipients: [formattedPhone] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API Connection Failed');
      showNotification('success', `Official SMS delivered to ${member.name}!`);
    } catch (err) {
      showNotification('error', `Transmission Failed: ${err.message}`);
    }
  };

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];

  const uniqueServiceTypes = [...new Set(attendanceLogs.map(log => log.serviceType).filter(Boolean))].sort();

  // --- REPORT ANALYTICS COMPUTATIONS ---
  const matchingLogs = attendanceLogs.filter(log => {
    return log.date >= reportStartDate && 
           log.date <= reportEndDate && 
           (reportService === 'All Services' || log.serviceType === reportService);
  });

  const absenteeStats = {};
  matchingLogs.forEach(log => {
    Object.entries(log.records || {}).forEach(([memberId, status]) => {
      if (status === 'Absent') {
        const member = members.find(m => m.id === memberId);
        if (member) {
          if (reportAssembly !== 'All Assemblies' && member.localAssembly !== reportAssembly) return;
          
          if (!absenteeStats[memberId]) { 
            absenteeStats[memberId] = { member: member, absentCount: 0, datesMissed: [] }; 
          }
          absenteeStats[memberId].absentCount += 1;
          absenteeStats[memberId].datesMissed.push(log.date);
        }
      }
    });
  });

  const absenteeList = Object.values(absenteeStats).sort((a, b) => b.absentCount - a.absentCount);

  // --- HISTORY FILTERING ENGINE ---
  const filteredHistoryLogs = attendanceLogs.filter(log => {
    const searchString = `${log.serviceType} ${log.assembly} ${log.group}`.toLowerCase();
    const matchesSearch = historySearch === '' || searchString.includes(historySearch.toLowerCase());
    const matchesAssembly = historyFilterAssembly === 'All Assemblies' || log.assembly === historyFilterAssembly;
    const matchesService = historyFilterService === 'All Services' || log.serviceType === historyFilterService;
    
    let matchesDate = true;
    if (historyDateFrom && historyDateTo) matchesDate = log.date >= historyDateFrom && log.date <= historyDateTo;
    else if (historyDateFrom) matchesDate = log.date >= historyDateFrom;
    else if (historyDateTo) matchesDate = log.date <= historyDateTo;

    return matchesSearch && matchesAssembly && matchesService && matchesDate;
  });

  // GLASSMORPHISM STYLING
  const inputStyle = "w-full p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-xs text-white outline-none focus:border-cyan-400 focus:bg-black/30 transition-all placeholder:text-cyan-200/40 [&>option]:text-gray-900 [&>optgroup>option]:text-gray-900";
  const labelStyle = "text-[10px] font-black text-cyan-200 uppercase ml-1 mb-1.5 block tracking-widest";

  const getFaithfulness = (memberId) => {
    const memberLogs = attendanceLogs.filter(log => {
      const hasRecord = log.records && log.records[memberId];
      const matchesService = analyticsServiceType === 'All Services' || log.serviceType === analyticsServiceType;
      return hasRecord && matchesService;
    });

    if (memberLogs.length === 0) return null;
    
    let attended = 0;
    let missed = 0;
    memberLogs.forEach(log => {
      if (log.records[memberId] === 'Present') attended++;
      else if (log.records[memberId] === 'Absent') missed++;
    });
    
    const percentage = Math.round((attended / (attended + missed)) * 100);
    return { attended, missed, percentage };
  };

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#082f49] p-5 md:p-8 text-white relative overflow-hidden shadow-2xl pb-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-sm ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              <CheckCircle2 size={20}/> {notification.message}
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-5">
            <div className="bg-white/10 p-3.5 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><ClipboardCheck size={26} /></div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">Attendance</h1>
              <p className="font-bold text-cyan-100 text-xs mt-0.5">Track, review, and analyze church presence.</p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex flex-wrap gap-2.5 mb-6">
            {[
              { id: 'mark', label: 'Mark Register', icon: ClipboardCheck },
              { id: 'history', label: 'Service History', icon: History },
              { id: 'reports', label: 'Absentee Report', icon: AlertCircle },
              { id: 'analytics', label: 'Member Analytics', icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] border flex items-center gap-1.5 backdrop-blur-md ${activeTab === tab.id ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-cyan-200/70 border-white/10 hover:bg-white/10'}`}
                >
                  <Icon size={14}/> {tab.label}
                </button>
              )
            })}
          </div>

          {/* ================= TAB 1: MARK REGISTER ================= */}
          {activeTab === 'mark' && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-400"></div>
              
              {/* MEETING FORMAT TOGGLE (THE MASTER SWITCH) */}
              <div className="mb-6 flex justify-center">
                <div className="flex gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/10 shadow-inner">
                  <button 
                    type="button" 
                    onClick={() => setMeetingFormat('Church House')} 
                    className={`px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-black transition-all flex items-center gap-2 ${meetingFormat === 'Church House' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200/50 hover:text-cyan-100'}`}
                  >
                    <MapPin size={14}/> Church House
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMeetingFormat('Home Cell')} 
                    className={`px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-black transition-all flex items-center gap-2 ${meetingFormat === 'Home Cell' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200/50 hover:text-cyan-100'}`}
                  >
                    <Home size={14}/> Outside (Cell)
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-5 backdrop-blur-md">
                  <div>
                    <label className={labelStyle}>Date</label>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Service Type</label>
                    <select value={serviceType} onChange={e => setServiceType(e.target.value)} className={inputStyle}>
                      <option value="">- Select -</option>
                      {getServiceTypesList(meetingFormat).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {serviceType === '++ Add Custom ++' && <input placeholder="Type Custom Service" required autoFocus value={customService} onChange={e => setCustomService(e.target.value)} className={`mt-2 ${inputStyle} border-cyan-400 bg-black/40`} />}
                  </div>
                  <div>
                    <label className={labelStyle}>Assembly</label>
                    <select value={assembly} onChange={e => setAssembly(e.target.value)} className={inputStyle}>
                      <option value="">- Select -</option>
                      {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Specific Group</label>
                    <select value={group} onChange={e => setGroup(e.target.value)} className={inputStyle}>
                      <option value="All Groups (Whole Assembly)">Whole Assembly</option>
                      {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h3 className="font-black text-white text-base drop-shadow-md flex items-center gap-2">
                      <Users size={18} className="text-cyan-300"/> Marking Roster: {assembly}
                    </h3>
                    <span className="text-cyan-300 font-black text-xs bg-black/20 px-3 py-1.5 rounded-lg border border-cyan-500/20">{targetMembers.length} Active Souls</span>
                  </div>

                  {group === 'All Groups (Whole Assembly)' && availableGroups.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mb-5 pb-2 border-b border-white/10 custom-scrollbar">
                      {availableGroups.map(g => {
                        const groupCount = assemblyMembers.filter(m => {
                          let relevantField = meetingFormat === 'Home Cell' ? m.homeCell : m.bibleStudy;
                          return (relevantField || 'Unassigned') === g;
                        }).length;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setActiveSubGroup(g)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeSubGroup === g ? 'bg-cyan-600 text-white shadow-md' : 'bg-black/20 text-cyan-200 hover:bg-white/10 border border-white/5'}`}
                          >
                            {g} ({groupCount})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2">
                    {displayedMembers.length === 0 ? (
                      <div className="p-8 text-center text-cyan-200/50 font-bold italic border border-dashed border-white/20 rounded-2xl bg-black/10 text-xs">No active members found in this group.</div>
                    ) : (
                      displayedMembers.map(m => (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white/5 border border-white/10 shadow-sm rounded-xl hover:bg-white/10 transition-all gap-4">
                          <div>
                            <p className="font-black text-white text-sm">{m.name}</p>
                            <p className="text-[9px] font-black text-cyan-200/70 uppercase tracking-widest mt-0.5">{m.churchRole} • {m.phone}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => toggleStatus(m.id, 'Present')} className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm ${attendanceRecords[m.id] === 'Present' ? 'bg-emerald-500 text-white border border-emerald-400/50' : 'bg-white/5 border border-white/10 text-cyan-100 hover:border-emerald-500/50 hover:text-emerald-300'}`}>
                              <CheckCircle2 size={14}/> Present
                            </button>
                            <button type="button" onClick={() => toggleStatus(m.id, 'Absent')} className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm ${attendanceRecords[m.id] === 'Absent' ? 'bg-red-500 text-white border border-red-400/50' : 'bg-white/5 border border-white/10 text-cyan-100 hover:border-red-500/50 hover:text-red-300'}`}>
                              <XCircle size={14}/> Absent
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {targetMembers.length > 0 && (
                  <div className="pt-5 mt-5 border-t border-white/10 flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-cyan-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-cyan-500 transition-all flex justify-center items-center gap-2 border border-cyan-400/30">
                      {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Log Attendance ({targetMembers.length})</>}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ================= TAB 2: SERVICE HISTORY LEDGER ================= */}
          {activeTab === 'history' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-fade-in">
              <div className="p-5 border-b border-white/10 bg-black/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-black text-cyan-300 uppercase tracking-widest text-xs flex items-center gap-2"><History size={16}/> Service Ledger</h3>
                
                {/* INJECTED MULTI-LAYER FILTER ENGINE */}
                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 w-full md:w-auto">
                  <div className="col-span-2 md:col-span-1 relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 text-cyan-200/50" size={14}/>
                    <input type="text" placeholder="Keyword search..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="w-full pl-9 p-2 bg-black/30 border border-white/10 rounded-lg font-bold text-xs outline-none focus:border-cyan-400 text-white placeholder:text-cyan-200/50" />
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
                    <Filter size={12} className="text-cyan-400 shrink-0" />
                    <select value={historyFilterAssembly} onChange={e => setHistoryFilterAssembly(e.target.value)} className="bg-transparent font-bold text-[10px] uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900 w-full">
                      <option value="All Assemblies">All Assemblies</option>
                      {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
                    <select value={historyFilterService} onChange={e => setHistoryFilterService(e.target.value)} className="bg-transparent font-bold text-[10px] uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900 w-full">
                      <option value="All Services">All Services</option>
                      {uniqueServiceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10 col-span-2 md:col-span-1">
                    <input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className="bg-transparent font-bold text-[10px] text-white outline-none w-full" />
                    <span className="text-[10px] text-cyan-500 font-black">TO</span>
                    <input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className="bg-transparent font-bold text-[10px] text-white outline-none w-full" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-black/80 backdrop-blur z-10 text-[9px] font-black text-cyan-200 uppercase tracking-widest border-b border-white/10">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Service Details</th>
                      <th className="p-4">Target Group</th>
                      <th className="p-4 text-center">Present</th>
                      <th className="p-4 text-center">Absent</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHistoryLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-[11px] text-white/70">
                          <div className="flex items-center gap-1.5"><CalendarDays size={12} className="text-cyan-400"/> {log.date}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-black text-white text-xs">{log.serviceType}</div>
                          <div className="text-[9px] uppercase tracking-wider text-cyan-200/70 mt-0.5">{log.assembly} • {log.meetingFormat}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-[9px] font-black text-white/60 bg-black/30 px-2 py-1 rounded-md border border-white/5 uppercase tracking-wider">
                            {log.group}
                          </span>
                        </td>
                        <td className="p-4 text-center font-black text-emerald-400 text-base">{log.presentCount}</td>
                        <td className="p-4 text-center font-black text-red-400 text-base">{log.absentCount}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredHistoryLogs.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-cyan-200/50 font-bold italic text-xs">No service records match your filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: ABSENTEE REPORT ================= */}
          {activeTab === 'reports' && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 animate-fade-in space-y-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-2">
                <AlertIcon size={18} className="text-rose-400" />
                <h2 className="text-base font-black text-white uppercase tracking-widest drop-shadow-md">Absentee Scanner</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/20 p-5 rounded-2xl border border-white/5">
                <div>
                  <label className={labelStyle}>Start Date</label>
                  <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>End Date</label>
                  <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Assembly</label>
                  <select value={reportAssembly} onChange={e => setReportAssembly(e.target.value)} className={inputStyle}>
                    <option value="All Assemblies">All Assemblies</option>
                    {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Service Filter</label>
                  <select value={reportService} onChange={e => setReportService(e.target.value)} className={inputStyle}>
                    <option value="All Services">All Services</option>
                    <optgroup label="Church House">
                       <option value="Sunday Service">Sunday Service</option>
                       <option value="Bible Study">Bible Study</option>
                       <option value="Friday Service">Friday Service</option>
                    </optgroup>
                    <optgroup label="Outside (Home Cell)">
                       <option value="Monday Cell Meeting">Monday Cell Meeting</option>
                       <option value="Cell Prayers">Cell Prayers</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-h-[300px] flex flex-col shadow-inner">
                {matchingLogs.length > 0 ? (
                  <div className="p-5">
                     <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-4">
                       <div>
                         <p className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">Scan Results</p>
                         <p className="text-[10px] font-bold text-cyan-100/50 mt-0.5">Found data from {matchingLogs.length} logged service(s).</p>
                       </div>
                       <div className="bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 text-center">
                          <p className="text-[8px] font-black text-rose-200 uppercase tracking-widest">Absentees</p>
                          <p className="text-lg font-black text-rose-100 leading-none mt-0.5">{absenteeList.length}</p>
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-3 custom-scrollbar max-h-[400px] overflow-y-auto">
                      {absenteeList.map(({ member, absentCount }) => (
                        <div key={member.id} className="p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col md:flex-row md:justify-between md:items-center hover:bg-white/10 transition-all gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-white text-sm">{member.name}</p>
                              <span className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Missed {absentCount}x</span>
                            </div>
                            <p className="text-[10px] font-bold text-cyan-200/50 mt-1 tracking-widest uppercase">{member.phone} • {member.localAssembly}</p>
                          </div>
                          
                          <div className="flex gap-2 shrink-0">
                            <a 
                              href={`https://wa.me/${member.phone?.startsWith('0') ? '233' + member.phone.substring(1) : member.phone}?text=${encodeURIComponent(`Calvary greetings ${String(member.name).split(' ')[0]}! We missed you at church recently. We pray all is well. God bless you! - Ketiejili District`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="p-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/40 hover:text-white transition-all shadow-sm" 
                              title="WhatsApp Follow-up"
                            >
                              <MessageCircle size={16} />
                            </a>
                            
                            {isTier1 && (
                              <button 
                                onClick={() => handleSendDirectSMS(member, reportService)}
                                className="p-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/40 hover:text-white transition-all shadow-sm" 
                                title="Send Official API SMS"
                              >
                                <MessageSquare size={16} />
                              </button>
                            )}

                            <a 
                              href={`tel:${member.phone}`} 
                              className="p-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all shadow-sm" 
                              title="Call Member"
                            >
                              <PhoneCall size={16} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-10">
                    <Search size={36} className="text-cyan-200/20 mb-3" />
                    <h3 className="text-sm font-black text-cyan-100/40 uppercase tracking-widest">No Logs Found</h3>
                    <p className="text-[10px] font-bold text-cyan-200/30 mt-1 text-center">There are no attendance records within this exact date range.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 4: MEMBER ANALYTICS ================= */}
          {activeTab === 'analytics' && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
                <h2 className="text-base font-black text-white flex items-center gap-2 drop-shadow-md uppercase tracking-widest"><BarChart3 size={18} className="text-cyan-400" /> District Health Overview</h2>
                <div className="w-full md:w-auto">
                  <select value={analyticsAssembly} onChange={e => setAnalyticsAssembly(e.target.value)} className="w-full p-2.5 bg-black/30 border border-white/20 rounded-xl font-bold text-xs outline-none text-white shadow-sm [&>option]:text-gray-900">
                    <option value="All Assemblies">District (All Assemblies)</option>
                    {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full flex items-center justify-center mb-3"><ClipboardCheck size={20}/></div>
                  <h3 className="text-3xl font-black text-white">{attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).length}</h3>
                  <p className="text-[9px] font-black text-cyan-200/60 uppercase tracking-widest mt-1.5">Services Logged</p>
                </div>
                <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center justify-center mb-3"><Users size={20}/></div>
                  <h3 className="text-3xl font-black text-white">
                    {attendanceLogs.length > 0 ? Math.round(attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).reduce((acc, log) => acc + (log.presentCount || 0), 0) / (attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).length || 1)) : 0}
                  </h3>
                  <p className="text-[9px] font-black text-cyan-200/60 uppercase tracking-widest mt-1.5">Avg Attendance</p>
                </div>
                <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center justify-center mb-3"><BarChart3 size={20}/></div>
                  <h3 className="text-3xl font-black text-white">{members.filter(m => (m.membershipStatus === 'Active Member' || m.membershipStatus === 'Active' || !m.membershipStatus) && (analyticsAssembly === 'All Assemblies' || m.localAssembly === analyticsAssembly)).length}</h3>
                  <p className="text-[9px] font-black text-cyan-200/60 uppercase tracking-widest mt-1.5">Active Souls</p>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-white/10">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 drop-shadow-md uppercase tracking-widest">Faithfulness Tracker</h3>
                  <select value={analyticsServiceType} onChange={e => setAnalyticsServiceType(e.target.value)} className="p-2.5 bg-black/30 border border-white/20 rounded-xl font-bold text-[10px] uppercase tracking-wider outline-none text-white shadow-sm [&>option]:text-gray-900 [&>optgroup>option]:text-gray-900">
                    <option value="All Services">All Services</option>
                    <optgroup label="Church House">
                       <option value="Sunday Service">Sunday Service</option>
                       <option value="Bible Study">Bible Study</option>
                    </optgroup>
                    <optgroup label="Outside (Home Cell)">
                       <option value="Monday Cell Meeting">Monday Cell Meeting</option>
                       <option value="Cell Prayers">Cell Prayers</option>
                    </optgroup>
                  </select>
                </div>

                <div className="bg-black/20 border border-white/5 shadow-inner rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="sticky top-0 bg-black/90 backdrop-blur z-10 text-cyan-200 font-black uppercase text-[9px] tracking-widest border-b border-white/10">
                        <tr>
                          <th className="p-4">Member Name</th>
                          <th className="p-4">Assembly</th>
                          <th className="p-4">Filter</th>
                          <th className="p-4 text-center">Attended</th>
                          <th className="p-4 text-center">Missed</th>
                          <th className="p-4 text-center">Faithfulness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {members.filter(m => (m.membershipStatus === 'Active Member' || m.membershipStatus === 'Active' || !m.membershipStatus) && (analyticsAssembly === 'All Assemblies' || m.localAssembly === analyticsAssembly)).map(m => {
                          const stats = getFaithfulness(m.id);
                          return (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-black text-white text-xs">{m.name}</td>
                              <td className="p-4 font-bold text-[10px] uppercase tracking-wider text-cyan-100/50">{m.localAssembly}</td>
                              <td className="p-4 font-bold text-cyan-400 text-[9px] uppercase">{analyticsServiceType}</td>
                              <td className="p-4 text-center font-black text-emerald-400">{stats ? stats.attended : 0}</td>
                              <td className="p-4 text-center font-black text-rose-400">{stats ? stats.missed : 0}</td>
                              <td className="p-4 text-center">
                                {!stats ? (
                                  <span className="bg-white/5 text-white/30 border border-white/10 text-[9px] font-black uppercase px-3 py-1 rounded-lg">No Data</span>
                                ) : (
                                  <span className={`text-xs font-black px-3 py-1 rounded-lg border ${stats.percentage >= 75 ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : stats.percentage >= 50 ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}`}>
                                    {stats.percentage}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}