"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { HeartHandshake, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Filter, Wallet, CalendarDays, Users, WifiOff, FileText, Briefcase, Baby } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function SocialInterventions() {
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('log'); // 'log', 'history', 'demographics'
  const [demoSubTab, setDemoSubTab] = useState('occupations'); // 'occupations', 'families'
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // --- LOG FORM STATES ---
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fCategory, setFCategory] = useState('All Categories');

  // --- DEMOGRAPHICS FILTER STATES ---
  const [demoSearch, setDemoSearch] = useState('');
  const [demoAssembly, setDemoAssembly] = useState('All Assemblies');
  const [demoGender, setDemoGender] = useState('All Genders');
  const [demoMarital, setDemoMarital] = useState('All Statuses');
  const [demoOccupation, setDemoOccupation] = useState('All Occupations'); // NEW OCCUPATION FILTER

  const welfareCategories = [
    "Tertiary Sponsorship", 
    "Pre-Tertiary Sponsorship", 
    "Health Support", 
    "Apprenticeship Support", 
    "Community Transformation", 
    "Environmental Care",
    "General Member Welfare"
  ];

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    if (typeof window !== 'undefined' && !navigator.onLine) setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    // Fetch Welfare Logs
    const qLogs = query(collection(db, 'welfare_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    // Fetch Full Member Objects for Demographics Radar
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(fetched.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubLogs();
      unsubMembers();
    };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";
  
  // DYNAMIC LIST EXTRACTIONS
  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))].sort();
  // Extract all unique jobs from the database and remove blanks
  const uniqueOccupations = [...new Set(members.map(m => m.occupation).filter(o => o && o.trim() !== ''))].sort();

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const resetForm = () => {
    setBeneficiary(''); setAmount(''); setCategory(''); setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!amount || isNaN(amount) || amount <= 0) {
      showNotification('error', 'Please enter a valid numeric amount.');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'welfare_logs'), { 
        beneficiary: beneficiary.trim(),
        amount: parseFloat(amount),
        category,
        date,
        notes: notes.trim(),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.name || 'System Admin'
      });
      showNotification('success', isOffline ? 'Saved to Offline Vault. Will sync soon.' : 'Intervention logged successfully.');
      resetForm(); 
      setActiveTab('history');
    } catch (err) {
      showNotification('error', 'Critical Error: Data Not Saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name, cat) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (window.confirm(`Delete this ${cat} record for ${name}? This alters financial history permanently.`)) {
      try {
        await deleteDoc(doc(db, 'welfare_logs', id));
        showNotification('success', isOffline ? 'Purge queued in Offline Vault.' : 'Financial log deleted.');
      } catch (err) { 
        showNotification('error', 'Purge Failed.'); 
      }
    }
  };

  // --- HISTORY FILTERS ---
  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.beneficiary || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = fCategory === 'All Categories' || log.category === fCategory;
    return matchesSearch && matchesCategory;
  });

  const totalDisbursed = filteredLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

  // --- DEMOGRAPHICS FILTERS (UPGRADED WITH OCCUPATION) ---
  const filteredDemographics = members.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(demoSearch.toLowerCase()) || 
                          (m.occupation || '').toLowerCase().includes(demoSearch.toLowerCase());
    const matchesAssem = demoAssembly === 'All Assemblies' || m.localAssembly === demoAssembly;
    const matchesGender = demoGender === 'All Genders' || m.gender === demoGender;
    
    const matchesMarital = demoSubTab !== 'families' || demoMarital === 'All Statuses' || m.maritalStatus === demoMarital;
    const matchesOccupation = demoSubTab !== 'occupations' || demoOccupation === 'All Occupations' || m.occupation === demoOccupation;

    return matchesSearch && matchesAssem && matchesGender && matchesMarital && matchesOccupation;
  });

  const inputStyle = "w-full p-3.5 bg-gray-50/50 border border-gray-100 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-xl font-bold text-gray-800 outline-none transition-all text-sm";
  const labelStyle = "text-[10px] font-black text-gray-400 uppercase ml-1 mb-2 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-slate-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20 relative">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm animate-fade-in mb-6">
            <WifiOff size={24} className="animate-pulse" />
            <div>
              <p className="font-black text-sm uppercase tracking-widest">Offline Mode Active</p>
              <p className="text-xs font-bold mt-0.5">You can safely log disbursements. Records are secured in your local vault and will sync automatically.</p>
            </div>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <div className="bg-rose-600 p-4 rounded-2xl text-white shadow-lg shadow-rose-600/20"><HeartHandshake size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Social Interventions</h1>
            <p className="font-bold text-gray-500">Track welfare disbursements, occupations, and community support metrics.</p>
          </div>
        </div>

        {/* 3-PART MASTER TABS */}
        <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
          <button onClick={() => setActiveTab('log')} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'log' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-rose-600 hover:bg-gray-50 border border-gray-100'}`}>
            <Wallet size={16}/> Log Disbursement
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'history' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
            <FileText size={16}/> Intervention History ({logs.length})
          </button>
          <button onClick={() => setActiveTab('demographics')} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'demographics' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
            <Users size={16}/> Demographics Radar
          </button>
        </div>

        {/* ================================================== */}
        {/* TAB 1: LOG DISBURSEMENT                            */}
        {/* ================================================== */}
        {activeTab === 'log' && (
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 max-w-4xl mx-auto animate-fade-in">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>PentChMS Category *</label>
                  <select required value={category} onChange={e => setCategory(e.target.value)} className={inputStyle}>
                    <option value="">- Select Reporting Category -</option>
                    {welfareCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Date of Disbursement *</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>Beneficiary Name / Organization *</label>
                  <input 
                    required type="text" list="membersList" 
                    placeholder="Type name or select member..." 
                    value={beneficiary} onChange={e => setBeneficiary(e.target.value)} 
                    className={inputStyle} 
                  />
                  <datalist id="membersList">
                    {members.map(m => <option key={m.id} value={m.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className={labelStyle}>Amount Disbursed (GHS) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 font-black text-gray-400">₵</span>
                    <input 
                      required type="number" step="0.01" min="0" placeholder="0.00" 
                      value={amount} onChange={e => setAmount(e.target.value)} 
                      className={`${inputStyle} pl-10 text-rose-700`} 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelStyle}>Additional Notes / Specifics (Optional)</label>
                <textarea rows="3" placeholder="e.g. Paid directly to KNUST for Level 200 fees..." value={notes} onChange={e => setNotes(e.target.value)} className={inputStyle} />
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-rose-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-rose-700 transition-all flex justify-center items-center gap-3 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Record Intervention</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 2: INTERVENTION HISTORY                        */}
        {/* ================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-4 flex items-center gap-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                <div className="bg-rose-600 text-white p-3 rounded-xl shadow-sm"><Wallet size={24} /></div>
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Filtered Total</p>
                  <h3 className="text-2xl font-black text-rose-700">₵ {totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                </div>
              </div>

              <div className="lg:col-span-4 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
                <input 
                  placeholder="Search beneficiaries or notes..." 
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-rose-500 transition-all" 
                />
              </div>
              
              <div className="lg:col-span-4 flex items-center gap-2 bg-gray-50 px-4 py-4 rounded-2xl border border-gray-100">
                <Filter size={16} className="text-gray-400 shrink-0" />
                <select 
                  value={fCategory} onChange={e => setFCategory(e.target.value)} 
                  className="w-full bg-transparent font-black text-xs uppercase tracking-wider text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="All Categories">All Categories Overview</option>
                  {welfareCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-5 w-40">Date</th>
                      <th className="p-5">Beneficiary & Category</th>
                      <th className="p-5">Details</th>
                      <th className="p-5 text-right">Amount Disbursed</th>
                      {isTier1 && <th className="p-5 text-center w-24">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-2 font-bold text-gray-500">
                            <CalendarDays size={14} className="text-rose-400" />
                            {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="font-black text-gray-900 text-base">{log.beneficiary}</div>
                          <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block mt-1 border border-rose-100">
                            {log.category}
                          </div>
                        </td>
                        <td className="p-5">
                          <p className="text-xs font-medium text-gray-600 line-clamp-2">{log.notes || <span className="italic text-gray-300">No notes provided</span>}</p>
                        </td>
                        <td className="p-5 text-right">
                          <span className="font-black text-rose-600 text-base">₵ {parseFloat(log.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </td>
                        {isTier1 && (
                          <td className="p-5 text-center">
                            <button onClick={() => handleDelete(log.id, log.beneficiary, log.category)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-12 text-center text-gray-400 font-bold italic">No intervention records match your search parameters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 3: DEMOGRAPHICS RADAR (JOBS & FAMILY)          */}
        {/* ================================================== */}
        {activeTab === 'demographics' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* SUB-TABS (Jobs vs Family) */}
            <div className="flex gap-4 border-b border-gray-200 pb-px">
              <button 
                onClick={() => setDemoSubTab('occupations')} 
                className={`pb-3 text-sm font-black tracking-wide transition-colors ${demoSubTab === 'occupations' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-gray-400 hover:text-gray-700'}`}
              >
                <Briefcase size={16} className="inline mr-2 -mt-0.5"/> Occupational Watch
              </button>
              <button 
                onClick={() => setDemoSubTab('families')} 
                className={`pb-3 text-sm font-black tracking-wide transition-colors ${demoSubTab === 'families' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-gray-400 hover:text-gray-700'}`}
              >
                <Baby size={16} className="inline mr-2 -mt-0.5"/> Family & Dependents
              </button>
            </div>

            {/* DEMOGRAPHICS FILTERS ENGINE */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-300" size={16}/>
                <input 
                  placeholder={demoSubTab === 'occupations' ? "Search names or jobs..." : "Search families..."}
                  value={demoSearch} onChange={e => setDemoSearch(e.target.value)} 
                  className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-rose-500" 
                />
              </div>
              
              <select value={demoAssembly} onChange={e => setDemoAssembly(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-rose-500">
                <option value="All Assemblies">All Assemblies</option>
                {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              
              <select value={demoGender} onChange={e => setDemoGender(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-rose-500">
                <option value="All Genders">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              {/* DYNAMIC 4TH FILTER COLUMN */}
              {demoSubTab === 'occupations' ? (
                <select value={demoOccupation} onChange={e => setDemoOccupation(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-rose-500 text-rose-700">
                  <option value="All Occupations">All Occupations</option>
                  {uniqueOccupations.map(occ => <option key={occ} value={occ}>{occ}</option>)}
                </select>
              ) : (
                <select value={demoMarital} onChange={e => setDemoMarital(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-rose-500 text-rose-700">
                  <option value="All Statuses">All Marital Statuses</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                </select>
              )}
            </div>

            {/* DEMOGRAPHICS TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-5">Member Name</th>
                      <th className="p-5">Local Assembly</th>
                      <th className="p-5">Gender</th>
                      {demoSubTab === 'occupations' ? (
                        <th className="p-5 text-blue-700">Occupation / Job Field</th>
                      ) : (
                        <>
                          <th className="p-5 text-blue-700">Marital Status</th>
                          <th className="p-5 text-blue-700">Dependents / Children</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDemographics.map(m => (
                      <tr key={m.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="p-5 font-black text-gray-900">{m.name}</td>
                        <td className="p-5 font-bold text-emerald-700">{m.localAssembly}</td>
                        <td className="p-5 font-bold text-gray-500">{m.gender}</td>
                        
                        {demoSubTab === 'occupations' ? (
                          <td className="p-5">
                            <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                              {m.occupation || 'Not Specified'}
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="p-5 font-black text-gray-700">{m.maritalStatus || '-'}</td>
                            <td className="p-5">
                              {(m.maritalStatus === 'Married' || m.maritalStatus === 'Widowed') ? (
                                <span className={`font-black px-3 py-1 rounded-lg border ${m.childrenCount > 3 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                  {m.childrenCount || 0} Children
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold italic">N/A</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {filteredDemographics.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic">No demographic records match your criteria.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}