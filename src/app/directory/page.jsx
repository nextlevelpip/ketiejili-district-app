"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Users, UserPlus, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Edit3, Save, Flame, PhoneCall, MessageSquare, MessageCircle, Shield, WifiOff } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function Directory() {
  const [members, setMembers] = useState([]);
  const [assemblies, setAssemblies] = useState(['Central']); 
  const [activeTab, setActiveTab] = useState('register'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // --- NETWORK AWARENESS STATE ---
  const [isOffline, setIsOffline] = useState(false);

  // --- FORM STATES ---
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(''); 
  const [gender, setGender] = useState('');
  
  const [localAssembly, setLocalAssembly] = useState('');
  
  const [homeCell, setHomeCell] = useState('');
  const [bibleStudy, setBibleStudy] = useState('');
  const [memberStatus, setMemberStatus] = useState('Active'); 

  const [occupation, setOccupation] = useState('');
  const [churchRole, setChurchRole] = useState('Member');
  
  const [soulWinner, setSoulWinner] = useState('');
  const [waterBaptized, setWaterBaptized] = useState('');
  
  const [maritalStatus, setMaritalStatus] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  
  const [spiritBaptism, setSpiritBaptism] = useState('');
  const [hasDisability, setHasDisability] = useState('No');
  const [disabilityType, setDisabilityType] = useState('');

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fRole, setFRole] = useState('All Roles');
  const [fAssem, setFAssem] = useState('All Assemblies');
  const [fStatus, setFStatus] = useState('Active'); 
  const [fDemo, setFDemo] = useState('All Ages');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    if (typeof window !== 'undefined' && !navigator.onLine) setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(fetched.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });

    const q = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssemblies = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedAssemblies = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetchedAssemblies);
        setLocalAssembly(prev => prev === '' ? fetchedAssemblies[0] : prev);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubMembers();
      unsubAssemblies();
    };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const dynamicHomeCells = [...new Set(members.filter(m => m.localAssembly === localAssembly && m.homeCell).map(m => m.homeCell))].sort();
  const dynamicBibleStudies = [...new Set(members.filter(m => m.localAssembly === localAssembly && m.bibleStudy).map(m => m.bibleStudy))].sort();

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const resetForm = () => {
    setEditingId(null); setName(''); setPhone(''); setDob(''); setGender('');
    setLocalAssembly(assemblies[0] || 'Central'); 
    setHomeCell(''); setBibleStudy(''); setMemberStatus('Active');
    setOccupation(''); setChurchRole('Member'); setSoulWinner(''); setWaterBaptized('');
    setMaritalStatus(''); setChildrenCount(''); setSpiritBaptism('');
    setHasDisability('No'); setDisabilityType('');
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    setPhone(val.slice(0, 10)); 
  };

 const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (phone.length !== 10) {
      showNotification('error', 'Phone number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    const isDuplicate = members.some(m => 
      m.id !== editingId && 
      (m.name || '').toLowerCase().trim() === name.toLowerCase().trim() && 
      m.phone === phone && 
      m.dob === dob && 
      m.gender === gender
    );

    if (isDuplicate) {
      showNotification('error', 'SYSTEM HALTED: A member with this exact Name, Phone, DOB, and Gender already exists!');
      setIsSubmitting(false);
      return;
    }

    // NEW 4-TIER AUTO AGE GROUP ENGINE
    const age = calculateAge(dob);
    let autoAgeGroup = "Adult";
    if (age !== null) {
      if (age <= 12) autoAgeGroup = "Children";
      else if (age <= 19) autoAgeGroup = "Teens";
      else if (age <= 35) autoAgeGroup = "Youth";
    }

    const data = { 
        name, phone, dob, gender, 
        localAssembly, 
        memberStatus,
        homeCell: homeCell || 'None', 
        bibleStudy: bibleStudy || 'None', 
        occupation, churchRole, 
        soulWinner: churchRole === 'New Convert' ? soulWinner : '',
        waterBaptized: churchRole === 'New Convert' ? waterBaptized : '',
        maritalStatus, 
        childrenCount: maritalStatus && maritalStatus !== 'Single' ? childrenCount : 0,
        spiritBaptism, hasDisability, 
        disabilityType: hasDisability === 'Yes' ? disabilityType : '',
        ageGroup: autoAgeGroup 
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'members', editingId), data);
        showNotification('success', isOffline ? 'Saved to Offline Vault. Will sync soon.' : 'Record Updated Successfully.');
      } else {
        await addDoc(collection(db, 'members'), { ...data, dateAdded: new Date().toISOString() });
        showNotification('success', isOffline ? 'Saved to Offline Vault. Will sync soon.' : 'Member Registered Successfully.');
      }
      resetForm(); 
      setActiveTab('directory');
    } catch (err) {
      showNotification('error', 'Critical Error: Data Not Saved.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (m) => {
    setEditingId(m.id); setName(m.name || ''); setPhone(m.phone || ''); 
    setDob(m.dob || ''); setGender(m.gender || ''); setOccupation(m.occupation || '');
    setLocalAssembly(m.localAssembly || assemblies[0] || 'Central');
    
    setHomeCell(m.homeCell === 'None' ? '' : (m.homeCell || ''));
    setBibleStudy(m.bibleStudy === 'None' ? '' : (m.bibleStudy || ''));
    setMemberStatus(m.memberStatus || 'Active');

    setChurchRole(m.churchRole || 'Member'); setSoulWinner(m.soulWinner || ''); setWaterBaptized(m.waterBaptized || '');
    setMaritalStatus(m.maritalStatus || ''); setChildrenCount(m.childrenCount || ''); 
    setSpiritBaptism(m.spiritBaptism || ''); setHasDisability(m.hasDisability || 'No'); setDisabilityType(m.disabilityType || '');
    setActiveTab('register');
  };

  const handleDelete = async (id, mName) => {
    if (window.confirm(`Delete ${mName} from the database?`)) {
      try {
        await deleteDoc(doc(db, 'members', id));
        showNotification('success', isOffline ? 'Purge queued in Offline Vault.' : 'Member Purged.');
      } catch (err) { showNotification('error', 'Purge Failed.'); }
    }
  };

  const handleSendDirectSMS = async (member) => {
    if (isOffline) {
      showNotification('error', 'SMS Gateway Offline: Connect to network to transmit.');
      return;
    }
    const defaultMsg = `Praise the Lord ${member.name.split(' ')[0]}! We pray this message finds you well. God bless you! - COP Ketiejili District`;
    const message = window.prompt(`[TIER 1] Send Official SMS to ${member.name}:`, defaultMsg);
    if (!message) return;

    let formattedPhone = member.phone?.replace(/\D/g, '');
    if (!formattedPhone) return showNotification('error', 'Member does not have a valid phone number.');
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

  // THE REPAIRED 4-TIER FILTER ENGINE
  const filtered = members.filter(m => {
    const age = calculateAge(m.dob);
    const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.phone || '').includes(searchTerm);
    const matchesAssem = fAssem === 'All Assemblies' || m.localAssembly === fAssem;
    const matchesRole = fRole === 'All Roles' || m.churchRole === fRole;
    
    const mStatus = m.memberStatus || 'Active'; 
    const matchesStatus = fStatus === 'All Statuses' || mStatus === fStatus;

    // Bulletproof mathematics for the 4-tier filtering
    let matchesDemo = true;
    if (fDemo === '< 13') matchesDemo = age !== null && age <= 12;
    else if (fDemo === '13 - 19') matchesDemo = age !== null && age >= 13 && age <= 19;
    else if (fDemo === '20 - 35') matchesDemo = age !== null && age >= 20 && age <= 35;
    else if (fDemo === '> 35') matchesDemo = age !== null && age > 35;
    
    return matchesSearch && matchesAssem && matchesRole && matchesStatus && matchesDemo;
  });

  const churchRoles = ["Member", "New Convert", "Elder", "Deacon", "Deaconess", "District Minister", "District Minister's Wife", "Presiding Elder", "Presiding", "Presiding Deacon"];
  const disabilityTypes = ["Visually Impairment", "Deaf/Hard of Hearing", "Speech Impairment", "Physical/ Mobility Dis'ties", "Autism Spectrum Disorders", "Albinism", "Epilepsy", "Cerebral Palsy", "Mental Health Conditions", "Multiple Dis'ties", "Other Dis'ties"];
  const specializedSoulCategories = ["HUM Souls", "MPWD Souls", "Chaplaincy Souls", "Chieftaincy Souls", "SOM Souls", "Digital Space Souls", "TOSM Souls", "Personal Evangelism", "General Church"];

  const inputStyle = "w-full p-3.5 bg-gray-50/50 border border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl font-bold text-gray-800 outline-none transition-all text-sm";
  const labelStyle = "text-[10px] font-black text-gray-400 uppercase ml-1 mb-2 block tracking-widest";

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
              <p className="text-xs font-bold mt-0.5">You can continue working. Changes are saved to your device vault and will sync when network is restored.</p>
            </div>
          </div>
        )}

        <div className="flex justify-center items-center gap-4 mb-8">
          <button onClick={() => { resetForm(); setActiveTab('register'); }} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all ${activeTab === 'register' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-100'}`}>
            <UserPlus size={18}/> {editingId ? 'Edit Record' : 'Register Member'}
          </button>
          <button onClick={() => setActiveTab('directory')} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all ${activeTab === 'directory' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
            <Users size={18}/> Member Directory ({members.length})
          </button>
        </div>

        {activeTab === 'register' ? (
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 max-w-5xl mx-auto">
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelStyle}>Full Name *</label>
                  <input required placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Phone Number *</label>
                  <input required type="tel" placeholder="024XXXXXXX" value={phone} onChange={handlePhoneChange} className={`${inputStyle} tracking-widest`} />
                </div>
                <div>
                  <label className={labelStyle}>Date of Birth *</label>
                  <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelStyle}>Gender *</label>
                  <select required value={gender} onChange={e => setGender(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Local Assembly *</label>
                  <select required value={localAssembly} onChange={e => setLocalAssembly(e.target.value)} className={inputStyle}>
                    {assemblies.map((assemblyName, index) => <option key={index} value={assemblyName}>{assemblyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelStyle} text-blue-600`}>Membership Status *</label>
                  <select required value={memberStatus} onChange={e => setMemberStatus(e.target.value)} className={`${inputStyle} border-blue-200 bg-blue-50/30`}>
                    <option value="Active">Active Member</option>
                    <option value="Backslidden">Backslidden (Follow-up)</option>
                    <option value="Relocated">Relocated / Transferred</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                <div>
                  <label className={labelStyle}>Home Cell Assignment</label>
                  <input 
                    type="text" list="homeCellsList" placeholder="Type or select Home Cell..." 
                    value={homeCell} onChange={e => setHomeCell(e.target.value)} className={inputStyle} 
                  />
                  <datalist id="homeCellsList">
                    {dynamicHomeCells.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className={labelStyle}>Bible Study Group</label>
                  <input 
                    type="text" list="bibleStudiesList" placeholder="Type or select Bible Study Group..." 
                    value={bibleStudy} onChange={e => setBibleStudy(e.target.value)} className={inputStyle} 
                  />
                  <datalist id="bibleStudiesList">
                    {dynamicBibleStudies.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className={labelStyle}>Occupation</label>
                  <input placeholder="e.g. Teacher, Unemployed" value={occupation} onChange={e => setOccupation(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Church Status / Role *</label>
                  <select required value={churchRole} onChange={e => setChurchRole(e.target.value)} className={inputStyle}>
                    {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {churchRole === 'New Convert' && (
                <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in mt-2">
                  <div>
                    <label className={`${labelStyle} text-orange-800 flex items-center gap-1`}><Flame size={12}/> Soul Winning Category</label>
                    <select value={soulWinner} onChange={e => setSoulWinner(e.target.value)} className={`${inputStyle} border-orange-200 bg-white`}>
                      <option value="">- Select Origin / Category -</option>
                      {specializedSoulCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`${labelStyle} text-orange-800`}>Water Baptized?</label>
                    <select value={waterBaptized} onChange={e => setWaterBaptized(e.target.value)} className={`${inputStyle} border-orange-200 bg-white`}>
                      <option value="">- Select -</option><option value="Yes">Yes</option><option value="No">No</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div>
                  <label className={labelStyle}>Marital Status *</label>
                  <select required value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option>
                  </select>
                </div>
                {(maritalStatus === 'Married' || maritalStatus === 'Widowed') && (
                  <div className="animate-fade-in">
                    <label className={labelStyle}>How many children?</label>
                    <input type="number" min="0" placeholder="Accepts 0" value={childrenCount} onChange={e => setChildrenCount(e.target.value)} className={inputStyle} />
                  </div>
                )}
                <div>
                  <label className={labelStyle}>Holy Spirit Baptism?</label>
                  <select value={spiritBaptism} onChange={e => setSpiritBaptism(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option><option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 border border-gray-100 p-6 rounded-2xl mt-4">
                <div>
                  <label className={labelStyle}>Any Disabilities?</label>
                  <select value={hasDisability} onChange={e => setHasDisability(e.target.value)} className={`${inputStyle} bg-white`}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                {hasDisability === 'Yes' && (
                  <div className="md:col-span-2 animate-fade-in">
                    <label className={labelStyle}>Specific Condition</label>
                    <select required value={disabilityType} onChange={e => setDisabilityType(e.target.value)} className={`${inputStyle} bg-white`}>
                      <option value="">- Select Type -</option>
                      {disabilityTypes.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-3">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> {editingId ? 'Update District Record' : 'Save Record'}</>}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SEARCH & FILTERS ENGINE */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 xl:grid-cols-6 gap-3">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-4 top-3.5 text-gray-300" size={16}/>
                <input placeholder="Search directory..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-blue-500" />
              </div>
              
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-blue-700">
                <option value="Active">🟢 Active Members</option>
                <option value="Backslidden">🔴 Backslidden</option>
                <option value="Relocated">⚪ Relocated</option>
                <option value="Deceased">⚫ Deceased</option>
                <option value="All Statuses">Show All Database</option>
              </select>

              <select value={fRole} onChange={e => setFRole(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Roles">All Roles</option>
                {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              
              <select value={fAssem} onChange={e => setFAssem(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Assemblies">All Assemblies</option>
                {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {/* MATHEMATICALLY CORRECTED OPTIONS */}
              <select value={fDemo} onChange={e => setFDemo(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Ages">All Ages</option>
                <option value="< 13">Children (&lt; 13)</option>
                <option value="13 - 19">Teens (13 - 19)</option>
                <option value="20 - 35">Youth (20 - 35)</option>
                <option value="> 35">Adults (&gt; 35)</option>
              </select>
            </div>

            {/* DIRECTORY TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-5">Member Identity</th>
                      <th className="p-5">Locations (Cell & Study)</th>
                      <th className="p-5">Gender & Age</th>
                      <th className="p-5">Contact</th>
                      <th className="p-5 text-center">System Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(m => {
                      const age = calculateAge(m.dob);
                      const isInactive = m.memberStatus && m.memberStatus !== 'Active';
                      
                      return (
                        <tr key={m.id} className={`transition-colors ${isInactive ? 'bg-gray-50/50 opacity-60 hover:opacity-100' : 'hover:bg-blue-50/20'}`}>
                          <td className="p-5">
                            <div className="font-black text-gray-900">{m.name}</div>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{m.churchRole}</span>
                              {isInactive && <span className="text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">{m.memberStatus}</span>}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-emerald-700 mb-1">{m.localAssembly}</div>
                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                              <span><span className="text-gray-400">HC:</span> {m.homeCell && m.homeCell !== 'None' ? m.homeCell : '-'}</span>
                              <span><span className="text-gray-400">BS:</span> {m.bibleStudy && m.bibleStudy !== 'None' ? m.bibleStudy : '-'}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-gray-700">{m.gender}</div>
                            {/* NEW 4-TIER COLOR BADGES */}
                            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 border ${
                              age === null ? 'bg-gray-50 text-gray-500 border-gray-200' :
                              age <= 12 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              age <= 19 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              age <= 35 ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {age !== null ? `${age} yrs` : 'No DOB'}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-mono font-bold text-gray-600 mb-2">{m.phone}</div>
                            <div className="flex gap-2">
                              <a href={`https://wa.me/${m.phone?.startsWith('0') ? '233' + m.phone.substring(1) : m.phone}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                <MessageCircle size={14} />
                              </a>
                              <a href={`tel:${m.phone}`} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                                <PhoneCall size={14} />
                              </a>
                              {isTier1 && (
                                <button onClick={() => handleSendDirectSMS(m)} className={`p-2 rounded-lg transition-all shadow-sm relative group/btn ${isOffline ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                                  <MessageSquare size={14} />
                                  {!isOffline && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full flex items-center justify-center border border-white shadow-sm"><Shield size={6} className="text-white" /></div>}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEdit(m)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"><Edit3 size={16}/></button>
                              <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-red-500 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic">No records found matching these criteria.</td></tr>}
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