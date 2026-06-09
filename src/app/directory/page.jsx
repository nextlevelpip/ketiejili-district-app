"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Users, UserPlus, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Edit3, Edit, Save, Flame, PhoneCall, MessageSquare, MessageCircle, Shield, WifiOff, FileBadge, FileText, Plus, X, Filter } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function Directory() {
  const [members, setMembers] = useState([]);
  const [certificates, setCertificates] = useState([]); 
  const [assemblies, setAssemblies] = useState(['Central']); 
  const [activeTab, setActiveTab] = useState('directory'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // --- NETWORK AWARENESS STATE ---
  const [isOffline, setIsOffline] = useState(false);

  // --- FORM STATES ---
  const [editingId, setEditingId] = useState(null);
  
  const initialFormState = {
    name: '', phone: '', dob: '', gender: 'Male', localAssembly: 'Central',
    membershipStatus: 'Active Member', homeCell: '', bibleStudy: '', occupation: '',
    churchRole: 'Member', maritalStatus: 'Single', childrenCount: '0',
    holySpiritBaptism: 'No', spiritGift: '', waterBaptismStatus: 'No', waterBaptismDate: '',
    disability: 'None', disabilityType: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- NEW CERTIFICATE FORM STATE ---
  const initialCertFormState = {
    memberId: '', memberName: '',
    certificateType: 'Baptism Certificate',
    issueDate: new Date().toISOString().split('T')[0],
    certificateNumber: '',
    issuedBy: '',
    notes: ''
  };
  const [certFormData, setCertFormData] = useState(initialCertFormState);

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fRole, setFRole] = useState('All Roles');
  const [fAssem, setFAssem] = useState('All Assemblies');
  const [fStatus, setFStatus] = useState('Active Member'); 
  const [fDemo, setFDemo] = useState('All Ages');

  const churchRoles = ["New Convert", "Member", "Leader", "Deacon", "Deaconess", "Elder", "Presiding Brother", "Presiding Deacon", "Presiding Elder", "District Minister", "District Minister's Wife"];
  const statuses = ["Active Member", "MFS", "Backslidden", "Transferred", "Deceased", "Pending"];
  const certTypes = ["Baptism Certificate", "Child Dedication Certificate", "Marriage Certificate"];
  const disabilityTypes = ["Visually Impaired", "Deaf/Hard of Hearing", "Speech Impairment", "Physical/Mobility Impaired", "Autism Spectrum", "Albinism", "Epilepsy", "Cerebral Palsy", "Mental Health Condition", "Multiple Disabilities", "Other"];
  const specializedSoulCategories = ["HUM Souls", "MPWD Souls", "Chaplaincy Souls", "Chieftaincy Souls", "SOM Souls", "Digital Space Souls", "TOSM Souls", "Personal Evangelism", "General Church"];

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
      setMembers(fetched.sort((a, b) => {
        const nameA = a.name ? a.name.toString() : '';
        const nameB = b.name ? b.name.toString() : '';
        return nameA.localeCompare(nameB);
      }));
    });

    const q = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssemblies = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedAssemblies = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetchedAssemblies);
        setFormData(prev => ({ ...prev, localAssembly: fetchedAssemblies[0] }));
      }
    });

    const qCerts = query(collection(db, 'certificates'), orderBy('issueDate', 'desc'));
    const unsubCerts = onSnapshot(qCerts, (snapshot) => {
      setCertificates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubMembers();
      unsubAssemblies();
      unsubCerts();
    };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const dynamicHomeCells = [...new Set(members.filter(m => m.localAssembly === formData.localAssembly && m.homeCell && m.homeCell !== 'None').map(m => m.homeCell))].sort();
  const dynamicBibleStudies = [...new Set(members.filter(m => m.localAssembly === formData.localAssembly && m.bibleStudy && m.bibleStudy !== 'None').map(m => m.bibleStudy))].sort();

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

  const getAgeDemographic = (dob) => {
    if (!dob) return "Unknown";
    const age = calculateAge(dob);
    if (age === null) return "Unknown";
    if (age <= 12) return "Children";
    if (age <= 19) return "Teens";
    if (age <= 35) return "Youth";
    return "Adult";
  };

  const resetForm = () => {
    setEditingId(null); 
    setFormData({ ...initialFormState, localAssembly: assemblies[0] || 'Central' });
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    setFormData(prev => ({ ...prev, phone: val.slice(0, 10) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.phone.length !== 10) {
      showNotification('error', 'Phone number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    const isDuplicate = members.some(m => 
      m.id !== editingId && 
      String(m.name || '').toLowerCase().trim() === String(formData.name || '').toLowerCase().trim() && 
      m.phone === formData.phone && 
      m.dob === formData.dob && 
      m.gender === formData.gender
    );

    if (isDuplicate) {
      showNotification('error', 'SYSTEM HALTED: A member with this exact Name, Phone, DOB, and Gender already exists!');
      setIsSubmitting(false);
      return;
    }

    const data = { 
        ...formData,
        homeCell: formData.homeCell || 'None', 
        bibleStudy: formData.bibleStudy || 'None', 
        soulWinner: formData.churchRole === 'New Convert' ? formData.soulWinner : '',
        waterBaptismDate: formData.waterBaptismStatus === 'Yes' ? formData.waterBaptismDate : '',
        childrenCount: (formData.maritalStatus === 'Married' || formData.maritalStatus === 'Widowed') ? formData.childrenCount : 0,
        spiritGift: formData.spiritBaptism === 'Yes' ? formData.spiritGift : '',
        disabilityType: formData.hasDisability === 'Yes' ? formData.disabilityType : '',
        ageGroup: getAgeDemographic(formData.dob),
        timestamp: new Date().toISOString()
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
    setEditingId(m.id); 
    setFormData({
      name: m.name || '', phone: m.phone || '', dob: m.dob || '', gender: m.gender || 'Male',
      localAssembly: m.localAssembly || assemblies[0] || 'Central',
      membershipStatus: m.membershipStatus || m.memberStatus || 'Active Member',
      homeCell: m.homeCell === 'None' ? '' : (m.homeCell || ''),
      bibleStudy: m.bibleStudy === 'None' ? '' : (m.bibleStudy || ''),
      occupation: m.occupation || '', churchRole: m.churchRole || 'Member',
      soulWinner: m.soulWinner || '',
      waterBaptismStatus: m.waterBaptismStatus || m.waterBaptized || 'No',
      waterBaptismDate: m.waterBaptismDate || '',
      maritalStatus: m.maritalStatus || 'Single', childrenCount: m.childrenCount || '',
      spiritBaptism: m.spiritBaptism || 'No', spiritGift: m.spiritGift || '',
      hasDisability: m.hasDisability || 'No', disabilityType: m.disabilityType || ''
    });
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
    const defaultMsg = `Praise the Lord ${String(member.name).split(' ')[0]}! We pray this message finds you well. God bless you! - COP Ketiejili District`;
    const message = window.prompt(`[TIER 1] Send Official SMS to ${member.name}:`, defaultMsg);
    if (!message) return;

    let formattedPhone = String(member.phone || '').replace(/\D/g, '');
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

  // --- CERTIFICATE SUBMISSION ---
  const handleMemberSelectForCert = (e) => {
    const id = e.target.value;
    const member = members.find(m => m.id === id);
    setCertFormData({ ...certFormData, memberId: id, memberName: member ? member.name : '' });
  };

  const handleSaveCertificate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!certFormData.memberId) {
      showNotification('error', 'Please select a member from the directory.');
      setIsSubmitting(false); return;
    }
    try {
      await addDoc(collection(db, 'certificates'), {
        ...certFormData,
        recordedAt: new Date().toISOString()
      });
      showNotification('success', `${certFormData.certificateType} issued successfully to ${certFormData.memberName}.`);
      setCertFormData(initialCertFormState);
      setActiveTab('certificates');
    } catch (error) { showNotification('error', 'Failed to record certificate.'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCert = async (id) => {
    if (!isTier1) return showNotification('error', 'Requires Tier 1 Clearance to delete records.');
    if (window.confirm(`Delete this certificate record permanently?`)) {
      try {
        await deleteDoc(doc(db, 'certificates', id));
        showNotification('success', 'Certificate record purged.');
      } catch (err) { showNotification('error', 'Failed to delete certificate.'); }
    }
  };

  // FILTER ENGINE - REPAIRED TO HANDLE OLD DATA
  const filtered = members.filter(m => {
    const age = calculateAge(m.dob);
    const matchesSearch = String(m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(m.phone || '').includes(searchTerm);
    const matchesAssem = fAssem === 'All Assemblies' || m.localAssembly === fAssem;
    const matchesRole = fRole === 'All Roles' || m.churchRole === fRole;
    
    // NORMALIZED LOGIC: Treats old "Active" records identically to "Active Member"
    const rawStatus = m.membershipStatus || m.memberStatus || 'Active Member';
    const normalizedStatus = rawStatus === 'Active' ? 'Active Member' : rawStatus;
    const matchesStatus = fStatus === 'All Statuses' || normalizedStatus === fStatus;

    let matchesDemo = true;
    if (fDemo === '< 13') matchesDemo = age !== null && age <= 12;
    else if (fDemo === '13 - 19') matchesDemo = age !== null && age >= 13 && age <= 19;
    else if (fDemo === '20 - 35') matchesDemo = age !== null && age >= 20 && age <= 35;
    else if (fDemo === '> 35') matchesDemo = age !== null && age > 35;
    
    return matchesSearch && matchesAssem && matchesRole && matchesStatus && matchesDemo;
  });

  const filteredCerts = certificates.filter(c => String(c.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(c.certificateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()));

  // PREMIUM GLASS INPUT STYLE
  const inputStyle = "w-full p-3.5 bg-black/20 border border-white/10 rounded-xl font-bold text-sm text-white outline-none focus:border-blue-400 focus:bg-black/30 transition-all placeholder:text-blue-200/50 [&>option]:text-gray-900 [&>optgroup>option]:text-gray-900";
  const labelStyle = "text-[10px] font-black text-blue-200 uppercase ml-1 mb-2 block tracking-widest";

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#172554] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
              {notification.message}
            </div>
          )}

          {isOffline && (
            <div className="bg-amber-500/20 border border-amber-400/30 text-amber-200 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-lg animate-fade-in mb-6 backdrop-blur-md">
              <WifiOff size={24} className="animate-pulse" />
              <div>
                <p className="font-black text-sm uppercase tracking-widest">Offline Mode Active</p>
                <p className="text-xs font-bold mt-0.5">You can continue working. Changes are saved to your device vault and will sync when network is restored.</p>
              </div>
            </div>
          )}

          {/* TOP HEADER WITH BUTTON AT RIGHT */}
          <div className="flex justify-between items-center gap-4 border-b border-white/10 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20 hidden md:block"><Users size={32} /></div>
              <div>
                <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Directory</h1>
                <p className="font-bold text-blue-200 mt-1 text-xs md:text-sm">Total Souls: {members.length}</p>
              </div>
            </div>
            
            <button 
              onClick={() => { 
                if (activeTab === 'register') {
                  setActiveTab('directory');
                } else {
                  resetForm();
                  setActiveTab('register');
                }
              }} 
              className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-xs md:text-sm border shadow-lg ${activeTab === 'register' ? 'bg-rose-500/20 text-rose-200 border-rose-500/30 hover:bg-rose-500/40' : 'bg-[#0ea5e9] text-white border-blue-400 hover:bg-[#0284c7]'}`}
            >
              {activeTab === 'register' ? <><X size={16} /> <span className="hidden sm:inline">Cancel</span></> : <><UserPlus size={16} /> <span className="hidden sm:inline">{editingId ? 'Edit Record' : 'Register Member'}</span><span className="sm:hidden">Add</span></>}
            </button>
          </div>

          {/* SECONDARY NAVIGATION TABS */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button onClick={() => { setActiveTab('directory'); }} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] border backdrop-blur-md ${activeTab === 'directory' ? 'bg-blue-600/80 text-white border-blue-400/50 shadow-lg' : 'bg-white/5 text-blue-200/70 border-white/10 hover:bg-white/10'}`}>
              <Users size={14} className="inline mr-1.5"/> Member Roster
            </button>
            <button onClick={() => { setActiveTab('certificates'); }} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] border backdrop-blur-md ${activeTab === 'certificates' ? 'bg-amber-600/80 text-white border-amber-400/50 shadow-lg' : 'bg-white/5 text-blue-200/70 border-white/10 hover:bg-white/10'}`}>
              <FileBadge size={14} className="inline mr-1.5"/> Certificates Issued
            </button>
          </div>

          {/* ============================================== */}
          {/* REGISTRATION FORM                              */}
          {/* ============================================== */}
          {activeTab === 'register' && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-xl border border-white/10 max-w-5xl mx-auto animate-fade-in relative overflow-hidden mb-8">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6]"></div>
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <FileText size={20} className="text-blue-400"/> {editingId ? 'Update Member Profile' : 'New Member Registration'}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelStyle}>Full Name *</label>
                    <input required placeholder="Enter full name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Phone Number *</label>
                    <input required type="tel" placeholder="024XXXXXXX" value={formData.phone} onChange={handlePhoneChange} className={`${inputStyle} tracking-widest`} />
                  </div>
                  <div>
                    <label className={labelStyle}>Date of Birth *</label>
                    <input required type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={inputStyle} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelStyle}>Gender *</label>
                    <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className={inputStyle}>
                      <option value="">- Select -</option><option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Local Assembly *</label>
                    <select required value={formData.localAssembly} onChange={e => setFormData({...formData, localAssembly: e.target.value})} className={inputStyle}>
                      {assemblies.map((assemblyName, index) => <option key={index} value={assemblyName}>{assemblyName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`${labelStyle} text-emerald-300`}>Membership Status *</label>
                    <select required value={formData.memberStatus} onChange={e => setFormData({...formData, memberStatus: e.target.value})} className={`${inputStyle} border-emerald-400/30 bg-emerald-900/20`}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
                  <div>
                    <label className={labelStyle}>Home Cell Assignment</label>
                    <input 
                      type="text" list="homeCellsList" placeholder="Type or select Home Cell..." 
                      value={formData.homeCell} onChange={e => setFormData({...formData, homeCell: e.target.value})} className={inputStyle} 
                    />
                    <datalist id="homeCellsList">
                      {dynamicHomeCells.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelStyle}>Bible Study Group</label>
                    <input 
                      type="text" list="bibleStudiesList" placeholder="Type or select Bible Study Group..." 
                      value={formData.bibleStudy} onChange={e => setFormData({...formData, bibleStudy: e.target.value})} className={inputStyle} 
                    />
                    <datalist id="bibleStudiesList">
                      {dynamicBibleStudies.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className={labelStyle}>Occupation</label>
                    <input placeholder="e.g. Teacher, Unemployed" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Church Status / Role *</label>
                    <select required value={formData.churchRole} onChange={e => setFormData({...formData, churchRole: e.target.value})} className={inputStyle}>
                      {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {formData.churchRole === 'New Convert' && (
                  <div className="bg-orange-500/20 border border-orange-500/30 p-6 rounded-2xl grid grid-cols-1 gap-6 animate-fade-in mt-2 backdrop-blur-sm">
                    <div>
                      <label className={`${labelStyle} text-orange-200 flex items-center gap-1`}><Flame size={12}/> Soul Winning Category</label>
                      <select value={formData.soulWinner} onChange={e => setFormData({...formData, soulWinner: e.target.value})} className={`${inputStyle} border-orange-400/30 bg-black/40 text-orange-100`}>
                        <option value="">- Select Origin / Category -</option>
                        {specializedSoulCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-white/10 mt-4">
                  <div>
                    <label className={labelStyle}>Marital Status *</label>
                    <select required value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})} className={inputStyle}>
                      <option value="">- Select -</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  {(formData.maritalStatus === 'Married' || formData.maritalStatus === 'Widowed') && (
                    <div className="animate-fade-in">
                      <label className={labelStyle}>How many children?</label>
                      <input type="number" min="0" placeholder="Accepts 0" value={formData.childrenCount} onChange={e => setFormData({...formData, childrenCount: e.target.value})} className={inputStyle} />
                    </div>
                  )}
                </div>

                {/* BAPTISM MODULE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                   <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                     <label className={labelStyle}>Water Baptised?</label>
                     <select value={formData.waterBaptismStatus} onChange={e => setFormData({...formData, waterBaptismStatus: e.target.value})} className={inputStyle}>
                       <option value="No">No</option><option value="Yes">Yes</option>
                     </select>
                     {formData.waterBaptismStatus === 'Yes' && (
                       <div className="animate-fade-in mt-3">
                         <label className={labelStyle}>Water Baptism Date</label>
                         <input type="date" value={formData.waterBaptismDate} onChange={e => setFormData({...formData, waterBaptismDate: e.target.value})} className={inputStyle} />
                       </div>
                     )}
                   </div>

                   <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                     <label className={labelStyle}>Holy Spirit Baptised?</label>
                     <select value={formData.spiritBaptism} onChange={e => setFormData({...formData, spiritBaptism: e.target.value})} className={inputStyle}>
                       <option value="No">No</option><option value="Yes">Yes</option>
                     </select>
                     {formData.spiritBaptism === 'Yes' && (
                       <div className="animate-fade-in mt-3">
                         <label className={labelStyle}>Spiritual Gift(s)</label>
                         <input type="text" placeholder="e.g. Tongues, Prophecy" value={formData.spiritGift} onChange={e => setFormData({...formData, spiritGift: e.target.value})} className={inputStyle} />
                       </div>
                     )}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 border border-white/5 p-6 rounded-2xl mt-4 backdrop-blur-md">
                  <div>
                    <label className={labelStyle}>Any Physical Disability?</label>
                    <select value={formData.hasDisability} onChange={e => setFormData({...formData, hasDisability: e.target.value})} className={inputStyle}>
                      <option value="No">No</option><option value="Yes">Yes</option>
                    </select>
                  </div>
                  {formData.hasDisability === 'Yes' && (
                    <div className="animate-fade-in">
                      <label className={labelStyle}>Specific Condition</label>
                      <select required value={formData.disabilityType} onChange={e => setFormData({...formData, disabilityType: e.target.value})} className={inputStyle}>
                        <option value="">- Select Type -</option>
                        {disabilityTypes.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-[#2563eb] text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#1d4ed8] border border-blue-400/30 transition-all flex justify-center items-center gap-3">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> {editingId ? 'Update District Record' : 'Save Record'}</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================== */}
          {/* DIRECTORY ROSTER LIST                          */}
          {/* ============================================== */}
          {activeTab === 'directory' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-fade-in">
              <div className="p-6 border-b border-white/10 bg-black/20 flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 text-blue-200/50" size={18}/>
                  <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 p-3.5 bg-black/30 border border-white/10 rounded-xl font-bold text-sm outline-none focus:border-blue-400 text-white placeholder:text-blue-200/50" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-xl border border-white/10">
                    <Filter size={16} className="text-blue-400 shrink-0" />
                    <select value={fAssem} onChange={e => setFAssem(e.target.value)} className="bg-transparent font-bold text-xs uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900"><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-xl border border-white/10">
                    <select value={fRole} onChange={e => setFRole(e.target.value)} className="bg-transparent font-bold text-xs uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900"><option value="All Roles">All Roles</option>{churchRoles.map(r => <option key={r} value={r}>{r}</option>)}</select>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-xl border border-white/10">
                    <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="bg-transparent font-bold text-xs uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900"><option value="All Statuses">All Statuses</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-xl border border-white/10">
                    <select value={fDemo} onChange={e => setFDemo(e.target.value)} className="bg-transparent font-bold text-xs uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900">
                      <option value="All Ages">All Ages</option>
                      <option value="< 13">Children (&lt; 13)</option>
                      <option value="13 - 19">Teens (13 - 19)</option>
                      <option value="20 - 35">Youth (20 - 35)</option>
                      <option value="> 35">Adults (&gt; 35)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-black/80 backdrop-blur z-10 text-[10px] font-black text-blue-200 uppercase tracking-widest">
                    <tr><th className="p-5">Member Identity</th><th className="p-5">Locations (Cell & Study)</th><th className="p-5">Gender & Age</th><th className="p-5">Contact</th><th className="p-5 text-center">System Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(m => {
                      const age = calculateAge(m.dob);
                      
                      // NORMALIZED STATUS FOR DISPLAY
                      const rawStatus = m.membershipStatus || m.memberStatus || 'Active Member';
                      const normalizedStatus = rawStatus === 'Active' ? 'Active Member' : rawStatus;
                      const isInactive = normalizedStatus !== 'Active Member';
                      
                      return (
                        <tr key={m.id} className={`transition-colors ${isInactive ? 'bg-black/10 opacity-60 hover:opacity-100' : 'hover:bg-white/5'}`}>
                          <td className="p-5">
                            <div className="font-black text-white text-base drop-shadow-sm">{m.name}</div>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-[9px] font-black text-blue-200 uppercase tracking-wider bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/30">{m.churchRole}</span>
                              {isInactive && <span className="text-[9px] font-black text-red-200 uppercase tracking-wider bg-red-500/20 px-2 py-0.5 rounded border border-red-400/30">{normalizedStatus}</span>}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-emerald-300 mb-1">{m.localAssembly}</div>
                            <div className="flex flex-col gap-0.5 text-[9px] text-blue-100/70 font-bold uppercase tracking-wider">
                              <span><span className="text-white/40">HC:</span> {m.homeCell && m.homeCell !== 'None' ? m.homeCell : '-'}</span>
                              <span><span className="text-white/40">BS:</span> {m.bibleStudy && m.bibleStudy !== 'None' ? m.bibleStudy : '-'}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="text-xs font-bold text-white mb-1">{m.gender} • {m.ageGroup || getAgeDemographic(m.dob)}</div>
                            <div className="text-[10px] font-bold text-white/50">{m.maritalStatus}</div>
                            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 border backdrop-blur-sm ${
                              age === null ? 'bg-white/5 text-white/50 border-white/10' :
                              age <= 12 ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 
                              age <= 19 ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 
                              age <= 35 ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' : 
                              'bg-purple-500/20 text-purple-200 border-purple-400/30'
                            }`}>
                              {age !== null ? `${age} yrs` : 'No DOB'}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-mono font-bold text-blue-200/80 mb-2">{m.phone}</div>
                            <div className="flex gap-2">
                              <a href={`https://wa.me/${m.phone?.startsWith('0') ? '233' + m.phone.substring(1) : m.phone}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl hover:bg-emerald-500/40 hover:text-white transition-all shadow-sm">
                                <MessageCircle size={14} />
                              </a>
                              <a href={`tel:${m.phone}`} className="p-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all shadow-sm">
                                <PhoneCall size={14} />
                              </a>
                              {isTier1 && (
                                <button onClick={() => handleSendDirectSMS(m)} className={`p-2 rounded-xl transition-all shadow-sm relative group/btn border ${isOffline ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed' : 'bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/40 hover:text-white'}`}>
                                  <MessageSquare size={14} />
                                  {!isOffline && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full flex items-center justify-center border border-white shadow-sm"><Shield size={6} className="text-white" /></div>}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEdit(m)} className="p-2 text-white/40 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg transition-colors"><Edit size={16}/></button>
                              <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-blue-200/50 font-bold italic">No records found matching these criteria.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* CERTIFICATES ISSUED MODULE                     */}
          {/* ============================================== */}
          {activeTab === 'certificates' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-400"></div>
                <h2 className="text-lg font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                  <FileBadge size={20} className="text-amber-400"/> Issue / Log Certificate
                </h2>
                <form onSubmit={handleSaveCertificate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <label className={labelStyle}>Select Registered Member *</label>
                    <select required value={certFormData.memberId} onChange={handleMemberSelectForCert} className={inputStyle}>
                      <option value="">- Search Directory -</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.localAssembly})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Certificate Type *</label>
                    <select required value={certFormData.certificateType} onChange={e => setCertFormData({...certFormData, certificateType: e.target.value})} className={inputStyle}>
                      {certTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Issue Date *</label>
                    <input required type="date" value={certFormData.issueDate} onChange={e => setCertFormData({...certFormData, issueDate: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Certificate / Serial No.</label>
                    <input type="text" placeholder="e.g. BAP-2026-001" value={certFormData.certificateNumber} onChange={e => setCertFormData({...certFormData, certificateNumber: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Officiating Minister</label>
                    <input type="text" placeholder="e.g. Pastor John Doe" value={certFormData.issuedBy} onChange={e => setCertFormData({...certFormData, issuedBy: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className={labelStyle}>Notes / Details</label>
                    <input type="text" placeholder="e.g. Dedicated at Central Assembly" value={certFormData.notes} onChange={e => setCertFormData({...certFormData, notes: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 border border-white/20">
                      {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Log Certificate</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="font-black text-amber-300 uppercase tracking-widest text-xs flex items-center gap-2"><FileText size={16}/> Issued Records</h3>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-blue-200/50" size={14}/>
                    <input type="text" placeholder="Search by name or serial..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2 bg-black/30 border border-white/10 rounded-lg font-bold text-xs outline-none focus:border-amber-400 text-white placeholder:text-blue-200/50" />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-black/80 backdrop-blur z-10 text-[9px] font-black text-amber-200 uppercase tracking-widest">
                      <tr><th className="p-4">Issue Date</th><th className="p-4">Member Name</th><th className="p-4">Certificate Type & Details</th><th className="p-4 text-center">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredCerts.map(cert => (
                        <tr key={cert.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono text-[11px] text-white/70">{cert.issueDate}</td>
                          <td className="p-4 font-black text-white text-xs">{cert.memberName}</td>
                          <td className="p-4">
                            <div className="flex gap-2 items-center mb-1">
                              <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{cert.certificateType}</span>
                              {cert.certificateNumber && <span className="text-[9px] font-mono text-white/50 bg-black/30 px-1.5 py-0.5 rounded">NO: {cert.certificateNumber}</span>}
                            </div>
                            <div className="text-[10px] font-bold text-white/60">Issued by: {cert.issuedBy || 'N/A'} {cert.notes && `• ${cert.notes}`}</div>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteCert(cert.id)} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                      {filteredCerts.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-amber-200/50 font-bold italic text-xs">No certificates logged yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}