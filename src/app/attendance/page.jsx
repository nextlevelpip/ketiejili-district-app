"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { CalendarCheck, Save, Search, CheckCircle2, XCircle, AlertCircle, BarChart3, ClipboardCheck, AlertCircle as AlertIcon, Loader2, Users, PhoneCall, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

export default function Attendance() {
  const [members, setMembers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('mark'); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // --- MARK REGISTER STATES ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState('Sunday Service');
  const [customService, setCustomService] = useState('');
  const [assembly, setAssembly] = useState('Central');
  const [group, setGroup] = useState('All Groups (Whole Assembly)');
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [activeSubGroup, setActiveSubGroup] = useState(''); // Handles the Group-by-Group marking

  // --- REPORT STATES ---
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportService, setReportService] = useState('Sunday Service');
  const [reportAssembly, setReportAssembly] = useState('Central');

  // --- ANALYTICS STATES ---
  const [analyticsAssembly, setAnalyticsAssembly] = useState('All Assemblies');
  const [analyticsServiceType, setAnalyticsServiceType] = useState('All Services'); // NEW: Service Type Filter

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

  // --- LOGIC FOR GROUP-BY-GROUP MARKING ---
  const assemblyMembers = members.filter(m => m.localAssembly === assembly);
  const availableGroups = [...new Set(assemblyMembers.map(m => m.group || 'Unassigned'))];

  // Set the first group active when assembly changes
  useEffect(() => {
    const groups = [...new Set(members.filter(m => m.localAssembly === assembly).map(m => m.group || 'Unassigned'))];
    setActiveSubGroup(groups[0] || '');
  }, [assembly, members]);

  const targetMembers = assemblyMembers.filter(m => {
    if (group !== 'All Groups (Whole Assembly)') return m.group === group;
    return true; // If marking whole assembly, we grab everyone to save them together
  });

  // The members currently visible on the screen based on the SubGroup tab clicked
  const displayedMembers = group === 'All Groups (Whole Assembly)' 
    ? assemblyMembers.filter(m => (m.group || 'Unassigned') === activeSubGroup)
    : assemblyMembers.filter(m => m.group === group);

  // Smart Default: Everyone is present initially
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
      date, serviceType: finalService, assembly, group,
      totalMembers: targetMembers.length, presentCount, absentCount,
      records: attendanceRecords, timestamp: new Date().toISOString()
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

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];
  const uniqueGroups = [...new Set(members.map(m => m.group).filter(Boolean))];
  const serviceTypesList = [
    "Children Ministry Meeting", "Evangelism Ministry Meeting", "Friday Service", 
    "PEMEM Meeting", "Sunday Service", "Wednesday Service", "Women Ministry Meeting", 
    "Youth Ministry Meeting", "++ Add Custom ++"
  ];

  const currentReport = attendanceLogs.find(log => 
    log.date === reportDate && log.assembly === reportAssembly && 
    (log.serviceType === reportService || reportService === 'All Services')
  );

  const inputStyle = "w-full p-3.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:border-blue-500 transition-all";
  const labelStyle = "text-[10px] font-black text-gray-400 uppercase ml-1 mb-2 block tracking-widest";

  // NEW: Advanced Faithfulness Calculation with Service Type
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
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><ClipboardCheck size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Attendance</h1>
            <p className="font-bold text-gray-500">Track and analyze church presence.</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab('mark')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border-2 transition-all ${activeTab === 'mark' ? 'border-blue-600 text-blue-600 shadow-sm' : 'border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}>
            <CalendarCheck size={18}/> Mark Register
          </button>
          <button onClick={() => setActiveTab('reports')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border-2 transition-all ${activeTab === 'reports' ? 'border-blue-600 text-blue-600 shadow-sm' : 'border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}>
            <AlertIcon size={18}/> Absentee Report
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border-2 transition-all ${activeTab === 'analytics' ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}>
            <BarChart3 size={18}/> Member Analytics
          </button>
        </div>

        {/* ================= TAB 1: MARK REGISTER ================= */}
        {activeTab === 'mark' && (
          <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-gray-100 animate-fade-in">
            <form onSubmit={handleSave} className="space-y-8">
              
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className={labelStyle}>Date</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Service Type</label>
                  <select value={serviceType} onChange={e => setServiceType(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option>
                    {serviceTypesList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {serviceType === '++ Add Custom ++' && <input placeholder="Type Custom Service" required autoFocus value={customService} onChange={e => setCustomService(e.target.value)} className={`mt-2 ${inputStyle} border-blue-300 bg-blue-50`} />}
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
                    {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                  <h3 className="font-black text-gray-900 text-lg">Marking: {assembly}</h3>
                  <span className="text-blue-600 font-black text-sm">{targetMembers.length} Souls Total</span>
                </div>

                {/* THE GROUP-BY-GROUP NAVIGATOR */}
                {group === 'All Groups (Whole Assembly)' && availableGroups.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-6 pb-2 border-b border-gray-100">
                    {availableGroups.map(g => {
                      const groupCount = assemblyMembers.filter(m => (m.group || 'Unassigned') === g).length;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setActiveSubGroup(g)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${activeSubGroup === g ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
                        >
                          {g} ({groupCount})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* THE VISIBLE MEMBERS TO MARK */}
                <div className="space-y-3">
                  {displayedMembers.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-bold italic border border-dashed rounded-2xl">No members found in this group.</div>
                  ) : (
                    displayedMembers.map(m => (
                      <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-all gap-4">
                        <div>
                          <p className="font-black text-gray-900">{m.name}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{m.churchRole} • {m.phone}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => toggleStatus(m.id, 'Present')} className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${attendanceRecords[m.id] === 'Present' ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-500'}`}>
                            <CheckCircle2 size={16}/> Present
                          </button>
                          <button type="button" onClick={() => toggleStatus(m.id, 'Absent')} className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${attendanceRecords[m.id] === 'Absent' ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-400 hover:border-red-500 hover:text-red-500'}`}>
                            <XCircle size={16}/> Absent
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {targetMembers.length > 0 && (
                <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-3">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Log Attendance ({targetMembers.length})</>}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ================= TAB 2: ABSENTEE REPORT ================= */}
        {activeTab === 'reports' && (
          <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-gray-100 animate-fade-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Search Date</label>
                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Assembly</label>
                <select value={reportAssembly} onChange={e => setReportAssembly(e.target.value)} className={inputStyle}>
                  {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Service Type</label>
                <select value={reportService} onChange={e => setReportService(e.target.value)} className={inputStyle}>
                  <option value="All Services">All Services</option>
                  {serviceTypesList.filter(s => s !== '++ Add Custom ++').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden min-h-[300px] flex flex-col">
              {currentReport ? (
                <div className="p-6">
                   <div className="flex justify-between items-center mb-6">
                     <div>
                       <h3 className="font-black text-gray-900 text-xl">{currentReport.serviceType}</h3>
                       <p className="text-sm font-bold text-gray-500 mt-1">{currentReport.assembly} • {new Date(currentReport.date).toLocaleDateString()}</p>
                     </div>
                     <div className="flex gap-4">
                       <div className="text-center"><p className="text-[10px] font-black text-emerald-600 uppercase">Present</p><p className="text-2xl font-black text-emerald-700">{currentReport.presentCount}</p></div>
                       <div className="text-center"><p className="text-[10px] font-black text-red-600 uppercase">Absent</p><p className="text-2xl font-black text-red-700">{currentReport.absentCount}</p></div>
                     </div>
                   </div>
                   
                   <h4 className="font-black text-red-600 mb-4 border-b border-red-100 pb-2">Absentee List</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.filter(m => currentReport.records[m.id] === 'Absent').map(absentee => (
                      <div key={absentee.id} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                        <div>
                          <p className="font-black text-gray-900">{absentee.name}</p>
                          <p className="text-xs font-bold text-gray-400 mt-0.5">{absentee.phone}</p>
                        </div>
                        {/* THE UPGRADED WHATSAPP & CALL BUTTONS */}
                        <div className="flex gap-2">
                          <a 
                            href={`https://wa.me/${absentee.phone?.startsWith('0') ? '233' + absentee.phone.substring(1) : absentee.phone}?text=${encodeURIComponent(`Calvary greetings ${absentee.name.split(' ')[0]}! We missed you at ${currentReport.serviceType} today. We pray all is well with you and your family. Please let us know if there is anything we can pray with you about. God bless you! - Ketiejili District`)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" 
                            title="Send WhatsApp Follow-up"
                          >
                            <MessageSquare size={18} />
                          </a>
                          <a 
                            href={`tel:${absentee.phone}`} 
                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" 
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
                  <Search size={48} className="text-gray-200 mb-4" />
                  <h3 className="text-xl font-black text-gray-400">No Log Found</h3>
                  <p className="font-bold text-gray-400 mt-2">There is no attendance record matching these filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MEMBER ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-gray-100 animate-fade-in space-y-8">
             
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><BarChart3 className="text-purple-600" /> District Health Overview</h2>
              <div className="flex gap-2">
                <select value={analyticsAssembly} onChange={e => setAnalyticsAssembly(e.target.value)} className="p-3 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none shadow-sm">
                  <option value="All Assemblies">District (All Assemblies)</option>
                  {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4"><ClipboardCheck size={24}/></div>
                <h3 className="text-3xl font-black text-gray-900">{attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).length}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Total Services Logged</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4"><Users size={24}/></div>
                <h3 className="text-3xl font-black text-gray-900">
                  {attendanceLogs.length > 0 ? Math.round(attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).reduce((acc, log) => acc + (log.presentCount || 0), 0) / (attendanceLogs.filter(l => analyticsAssembly === 'All Assemblies' || l.assembly === analyticsAssembly).length || 1)) : 0}
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Average Attendance</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-900 text-blue-100 rounded-full flex items-center justify-center mb-4"><BarChart3 size={24}/></div>
                <h3 className="text-3xl font-black text-gray-900">{members.filter(m => analyticsAssembly === 'All Assemblies' || m.localAssembly === analyticsAssembly).length}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Total Active Souls</p>
              </div>
            </div>

            {/* MEMBER FAITHFULNESS TRACKER */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-black text-purple-900 flex items-center gap-2"><BarChart3 size={18} /> Member Faithfulness Tracker</h3>
                
                {/* NEW: Filter Faithfulness by Service Type */}
                <select value={analyticsServiceType} onChange={e => setAnalyticsServiceType(e.target.value)} className="p-2.5 bg-purple-50 text-purple-900 border border-purple-100 rounded-xl font-bold text-sm outline-none">
                  <option value="All Services">All Services</option>
                  {serviceTypesList.filter(s => s !== '++ Add Custom ++').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-purple-600 text-white font-black uppercase text-[10px] tracking-widest">
                        <th className="p-4">Member Name</th>
                        <th className="p-4">Assembly</th>
                        <th className="p-4">Service Type</th>
                        <th className="p-4 text-center">Attended</th>
                        <th className="p-4 text-center">Missed</th>
                        <th className="p-4 text-center">Faithfulness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {members.filter(m => analyticsAssembly === 'All Assemblies' || m.localAssembly === analyticsAssembly).map(m => {
                        const stats = getFaithfulness(m.id);
                        return (
                          <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-black text-gray-900">{m.name}</td>
                            <td className="p-4 font-bold text-gray-500">{m.localAssembly}</td>
                            <td className="p-4 font-bold text-purple-600 text-xs">{analyticsServiceType}</td>
                            <td className="p-4 text-center font-black text-emerald-600">{stats ? stats.attended : 0}</td>
                            <td className="p-4 text-center font-black text-red-600">{stats ? stats.missed : 0}</td>
                            <td className="p-4 text-center">
                              {!stats ? (
                                <span className="bg-gray-100 text-gray-400 text-[10px] font-black uppercase px-3 py-1 rounded-lg">No Data</span>
                              ) : (
                                <span className={`text-xs font-black px-3 py-1 rounded-lg ${stats.percentage >= 75 ? 'bg-emerald-100 text-emerald-700' : stats.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
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
    </DashboardLayout>
  );
}