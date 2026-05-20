"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { CalendarCheck, Save, Search, CheckCircle2, XCircle, AlertCircle, BarChart3, ClipboardCheck, AlertCircle as AlertIcon, Loader2, Users, PhoneCall, MessageSquare, MessageCircle, MapPin, Home } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

export default function Attendance() {
  const [members, setMembers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('mark'); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

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

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(fetched.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });

    const unsubLogs = onSnapshot(collection(db, 'attendance_logs'), (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendanceLogs(fetchedLogs);
    });

    return () => { unsubMembers(); unsubLogs(); };
  }, []);

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

  const assemblyMembers = members.filter(m => m.localAssembly === assembly);

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
    } catch (err) {
      showNotification('error', 'Failed to log attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendDirectSMS = async (member, serviceType) => {
    const defaultMsg = `Praise the Lord ${member.name.split(' ')[0]}! We missed you at ${serviceType === 'All Services' ? 'church' : serviceType} recently. We pray all is well with you. God bless you! - Ketiejili District`;
    const message = window.prompt(`Send Official District SMS to ${member.name}:`, defaultMsg);
    
    if (!message) return;

    let formattedPhone = member.phone?.replace(/\D/g, '');
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

  // --- REPORT ANALYTICS COMPUTATIONS ---
  const matchingLogs = attendanceLogs.filter(log => {
    return log.date >= reportStartDate && 
           log.date <= reportEndDate && 
           (reportAssembly === 'All Assemblies' || log.assembly === reportAssembly) &&
           (reportService === 'All Services' || log.serviceType === reportService);
  });

  const absenteeStats = {};
  matchingLogs.forEach(log => {
    members.forEach(m => {
      if (reportAssembly !== 'All Assemblies' && m.localAssembly !== reportAssembly) return;
      if (log.records && log.records[m.id] === 'Absent') {
        if (!absenteeStats[m.id]) { absenteeStats[m.id] = { member: m, absentCount: 0, datesMissed: [] }; }
        absenteeStats[m.id].absentCount += 1;
        absenteeStats[m.id].datesMissed.push(log.date);
      }
    });
  });

  const absenteeList = Object.values(absenteeStats).sort((a, b) => b.absentCount - a.absentCount);

  // GLASSMORPHISM STYLING
  const inputStyle = "w-full p-3.5 bg-black/20 border border-white/10 rounded-xl font-bold text-sm text-white outline-none focus:border-cyan-400 focus:bg-black/30 transition-all placeholder:text-cyan-200/40 [&>option]:text-gray-900";
  const labelStyle = "text-[10px] font-black text-cyan-200 uppercase ml-1 mb-2 block tracking-widest";

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
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#082f49] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              <CheckCircle2 size={24}/> {notification.message}
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><ClipboardCheck size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Attendance</h1>
              <p className="font-bold text-cyan-100">Track and analyze church presence.</p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            {['mark', 'reports', 'analytics'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-xl font-bold transition-all text-sm border backdrop-blur-md ${activeTab === tab ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-cyan-100 border-white/10 hover:bg-white/10'}`}>
                {tab === 'mark' ? 'Mark Register' : tab === 'reports' ? 'Absentee Report' : 'Member Analytics'}
              </button>
            ))}
          </div>

          {/* ================= TAB 1: MARK REGISTER ================= */}
          {activeTab === 'mark' && (
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/10">
              
              {/* MEETING FORMAT TOGGLE (THE MASTER SWITCH) */}
              <div className="mb-8 flex justify-center">
                <div className="flex gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/10 shadow-inner">
                  <button 
                    type="button" 
                    onClick={() => setMeetingFormat('Church House')} 
                    className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${meetingFormat === 'Church House' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200/50 hover:text-cyan-100'}`}
                  >
                    <MapPin size={16}/> Church House (Bible Study Groups)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMeetingFormat('Home Cell')} 
                    className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${meetingFormat === 'Home Cell' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200/50 hover:text-cyan-100'}`}
                  >
                    <Home size={16}/> Outside (Home Cell Groups)
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-6 backdrop-blur-md">
                  <div>
                    <label className={labelStyle}>Date</label>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Service Type</label>
                    <select value={serviceType} onChange={e => setServiceType(e.target.value)} className={inputStyle}>
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
                      <option value="All Groups (Whole Assembly)">All Groups (Whole Assembly)</option>
                      {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h3 className="font-black text-white text-lg drop-shadow-md">Marking: {assembly}</h3>
                    <span className="text-cyan-300 font-black text-sm bg-black/20 px-3 py-1 rounded-lg border border-cyan-500/20">{targetMembers.length} Souls Total</span>
                  </div>

                  {group === 'All Groups (Whole Assembly)' && availableGroups.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mb-6 pb-2 border-b border-white/10">
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
                            className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${activeSubGroup === g ? 'bg-cyan-600 text-white shadow-md' : 'bg-black/20 text-cyan-200 hover:bg-white/10 border border-white/5'}`}
                          >
                            {g} ({groupCount})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-3">
                    {displayedMembers.length === 0 ? (
                      <div className="p-10 text-center text-cyan-200/50 font-bold italic border border-dashed border-white/20 rounded-2xl bg-black/10">No members found in this group.</div>
                    ) : (
                      displayedMembers.map(m => (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 border border-white/10 shadow-sm rounded-2xl hover:bg-white/10 transition-all gap-4">
                          <div>
                            <p className="font-black text-white text-base">{m.name}</p>
                            <p className="text-[10px] font-black text-cyan-200/70 uppercase tracking-widest mt-1">{m.churchRole} • {m.phone}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => toggleStatus(m.id, 'Present')} className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-sm ${attendanceRecords[m.id] === 'Present' ? 'bg-emerald-500 text-white border border-emerald-400/50' : 'bg-white/5 border border-white/10 text-cyan-100 hover:border-emerald-500/50 hover:text-emerald-300'}`}>
                              <CheckCircle2 size={16}/> Present
                            </button>
                            <button type="button" onClick={() => toggleStatus(m.id, 'Absent')} className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-sm ${attendanceRecords[m.id] === 'Absent' ? 'bg-red-500 text-white border border-red-400/50' : 'bg-white/5 border border-white/10 text-cyan-100 hover:border-red-500/50 hover:text-red-300'}`}>
                              <XCircle size={16}/> Absent
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {targetMembers.length > 0 && (
                  <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-cyan-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-cyan-500 transition-all flex justify-center items-center gap-3 border border-cyan-400/30">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Log Attendance ({targetMembers.length})</>}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ================= TAB 2: ABSENTEE REPORT ================= */}
          {activeTab === 'reports' && (
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/10 animate-fade-in space-y-8">
              
              {/* Optional: Add Meeting Format Filter here too if needed, but simple Service Type is usually enough for reports */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5">
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
                  <label className={labelStyle}>Service Type</label>
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

              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-h-[300px] flex flex-col">
                {matchingLogs.length > 0 ? (
                  <div className="p-6">
                     <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                       <div>
                         <h3 className="font-black text-white text-xl drop-shadow-md">Absentee Scan Results</h3>
                         <p className="text-sm font-bold text-cyan-200/70 mt-1">Found data from {matchingLogs.length} logged service(s).</p>
                       </div>
                       <div className="bg-red-500/20 px-4 py-2 rounded-xl border border-red-500/30">
                          <p className="text-[10px] font-black text-red-200 uppercase">Total Absentees</p>
                          <p className="text-2xl font-black text-red-100 text-center">{absenteeList.length}</p>
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-4">
                      {absenteeList.map(({ member, absentCount }) => (
                        <div key={member.id} className="p-4 bg-black/20 rounded-xl border border-white/5 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center hover:bg-white/5 transition-all gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-white text-lg">{member.name}</p>
                              <span className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-black px-2 py-0.5 rounded-md">Missed {absentCount} time(s)</span>
                            </div>
                            <p className="text-xs font-bold text-cyan-200/50 mt-1 tracking-wider">{member.phone} • {member.localAssembly}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <a 
                              href={`https://wa.me/${member.phone?.startsWith('0') ? '233' + member.phone.substring(1) : member.phone}?text=${encodeURIComponent(`Calvary greetings ${member.name.split(' ')[0]}! We missed you at church recently. We pray all is well. God bless you! - Ketiejili District`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/40 hover:text-white transition-all shadow-sm" 
                              title="WhatsApp Follow-up"
                            >
                              <MessageCircle size={18} />
                            </a>
                            
                            <button 
                              onClick={() => handleSendDirectSMS(member, reportService)}
                              className="p-3 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl hover:bg-blue-500/40 hover:text-white transition-all shadow-sm" 
                              title="Send Official API SMS"
                            >
                              <MessageSquare size={18} />
                            </button>

                            <a 
                              href={`tel:${member.phone}`} 
                              className="p-3 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all shadow-sm" 
                              title="Call Member"
                            >
                              <PhoneCall size={18} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <Search size={48} className="text-cyan-200/30 mb-4" />
                    <h3 className="text-xl font-black text-cyan-100/50">No Logs Found</h3>
                    <p className="font-bold text-cyan-200/40 mt-2 text-center max-w-sm">There are no attendance records within this exact date range.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: MEMBER ANALYTICS ================= */}
          {activeTab === 'analytics' && (
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/10 animate-fade-in space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><BarChart3 className="text-cyan-300" /> District Health Overview</h2>
                <div className="flex gap-2">
                  <select value={analyticsAssembly} onChange={e => setAnalyticsAssembly(e.target.value)} className="p-3 bg-black/30 border border-white/20 rounded-xl font-bold text-sm outline-none text-white shadow-sm [&>option]:text-gray-900">
                    <option value="All Assemblies">District (All Assemblies)</option>
                    {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full flex items-center justify-center mb-4"><ClipboardCheck size={28}/></div>
                  <h3 className="text-4xl font-black text-white">{attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).length}</h3>
                  <p className="text-[10px] font-black text-cyan-200/70 uppercase tracking-widest mt-2">Total Services Logged</p>
                </div>
                <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4"><Users size={28}/></div>
                  <h3 className="text-4xl font-black text-white">
                    {attendanceLogs.length > 0 ? Math.round(attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).reduce((acc, log) => acc + (log.presentCount || 0), 0) / (attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).length || 1)) : 0}
                  </h3>
                  <p className="text-[10px] font-black text-cyan-200/70 uppercase tracking-widest mt-2">Average Attendance</p>
                </div>
                <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center justify-center mb-4"><BarChart3 size={28}/></div>
                  <h3 className="text-4xl font-black text-white">{members.filter(m => analyticsAssembly === 'All Assemblies' || m.localAssembly === analyticsAssembly).length}</h3>
                  <p className="text-[10px] font-black text-cyan-200/70 uppercase tracking-widest mt-2">Total Active Souls</p>
                </div>
              </div>

              <div className="mt-10 pt-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 drop-shadow-md"><BarChart3 size={18} className="text-cyan-300" /> Member Faithfulness Tracker</h3>
                  <select value={analyticsServiceType} onChange={e => setAnalyticsServiceType(e.target.value)} className="p-3 bg-black/30 border border-white/20 rounded-xl font-bold text-sm outline-none text-white shadow-sm [&>option]:text-gray-900">
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

                <div className="bg-black/20 border border-white/5 shadow-inner rounded-[2rem] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-white/5 text-cyan-200 font-black uppercase text-[10px] tracking-widest border-b border-white/10">
                          <th className="p-5">Member Name</th>
                          <th className="p-5">Assembly</th>
                          <th className="p-5">Service Type</th>
                          <th className="p-5 text-center">Attended</th>
                          <th className="p-5 text-center">Missed</th>
                          <th className="p-5 text-center">Faithfulness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {members.filter(m => analyticsAssembly === 'All Assemblies' || m.localAssembly === analyticsAssembly).map(m => {
                          const stats = getFaithfulness(m.id);
                          return (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-5 font-black text-white">{m.name}</td>
                              <td className="p-5 font-bold text-cyan-100/70">{m.localAssembly}</td>
                              <td className="p-5 font-bold text-cyan-300 text-xs">{analyticsServiceType}</td>
                              <td className="p-5 text-center font-black text-emerald-400">{stats ? stats.attended : 0}</td>
                              <td className="p-5 text-center font-black text-red-400">{stats ? stats.missed : 0}</td>
                              <td className="p-5 text-center">
                                {!stats ? (
                                  <span className="bg-white/5 text-white/30 border border-white/10 text-[10px] font-black uppercase px-3 py-1 rounded-lg">No Data</span>
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