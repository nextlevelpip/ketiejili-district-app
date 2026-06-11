"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Users, UserPlus, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Edit, Save, Flame, PhoneCall, MessageSquare, MessageCircle, Shield, WifiOff, FileBadge, FileText, X, Filter } from 'lucide-react';
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

  // --- CUSTOM MODAL STATE ---
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '', type: '' });

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

  const churchRoles = ["New Convert", "Member", "Leader", "Local Secretary", "Deacon", "Deaconess", "Elder", "Presiding Brother", "Presiding Deacon", "Presiding Elder", "District Minister", "District Minister's Wife"];
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

  // --- REPLACED BROWSER POPUPS WITH CUSTOM MODAL ---
  const triggerDelete = (id, name, type) => {
    setDeleteModal({ isOpen: true, id, name, type });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteModal;
    try {
      if (type === 'member') {
        await deleteDoc(doc(db, 'members', id));
        showNotification('success', isOffline ? 'Purge queued in Offline Vault.' : 'Member Purged.');
      } else if (type === 'certificate') {
        await deleteDoc(doc(db, 'certificates', id));
        showNotification('success', 'Certificate record purged.');
      }
    } catch (err) {
      showNotification('error', 'Purge Failed.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '', type: '' });
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

  // FILTER ENGINE
  const filtered = members.filter(m => {
    const age = calculateAge(m.dob);
    const matchesSearch = String(m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(m.phone || '').includes(searchTerm);
    const matchesAssem = fAssem === 'All Assemblies' || m.localAssembly === fAssem;
    const matchesRole = fRole === 'All Roles' || m.churchRole === fRole;
    
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

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec)
  const inputStyle = "w-full p-3.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFC300] transition-all placeholder:text-white/30 [&>option]:text-[#000814] [&>optgroup>option]:text-[#000814]";
  const labelStyle = "text-[9px] font-black text-white/50 uppercase ml-1 mb-2 block tracking-widest";

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative">
        
        {/* CUSTOM DELETE MODAL OVERLAY */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">System Purge</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Are you sure you want to permanently delete <span className="text-white">{deleteModal.name}</span> from the database?
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: null, name: '', type: '' })}
                  className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {notification.message}
            </div>
          )}

          {isOffline && (
            <div className="bg-[#FFC300]/10 border border-[#FFC300]/30 text-[#FFC300] px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg animate-fade-in mb-6">
              <WifiOff size={20} className="animate-pulse" />
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Offline Mode Active</p>
                <p className="text-[10px] font-bold mt-0.5 text-[#FFC300]/70">You can continue working. Changes are saved to your device vault and will sync when network is restored.</p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex justify-between items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><Users size={24} /></div>
                <div>
                  <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Directory</h1>
                  <p className="font-bold text-white/50 mt-1 text-[10px] uppercase tracking-widest">Total Souls: {members.length}</p>
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
                className={`px-4 md:px-6 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[10px] border shadow-lg flex items-center gap-2 ${activeTab === 'register' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#FFC300] text-[#000814] border-[#FFC300] hover:bg-[#FFD60A]'}`}
              >
                {activeTab === 'register' ? <><X size={14} /> <span className="hidden sm:inline">Cancel</span></> : <><UserPlus size={14} /> <span className="hidden sm:inline">{editingId ? 'Edit Record' : 'Register Member'}</span><span className="sm:hidden">Add</span></>}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setActiveTab('directory'); }} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border ${activeTab === 'directory' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <Users size={12} className="inline mr-1.5"/> Member Roster
              </button>
              <button onClick={() => { setActiveTab('certificates'); }} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border ${activeTab === 'certificates' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <FileBadge size={12} className="inline mr-1.5"/> Certificates Issued
              </button>
            </div>
          </div>

          {/* ============================================== */}
          {/* REGISTRATION FORM                              */}
          {/* ============================================== */}
          {activeTab === 'register' && (
            <div className="bg-[#000814] p-6 md:p-10 rounded-2xl shadow-xl border border-[#003566] max-w-5xl mx-auto animate-fade-in relative overflow-hidden mb-8">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
              <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-[#FFC300]"/> {editingId ? 'Update Member Profile' : 'New Member Registration'}
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
                    <label className={`${labelStyle} text-[#FFC300]`}>Membership Status *</label>
                    <select required value={formData.memberStatus} onChange={e => setFormData({...formData, memberStatus: e.target.value})} className={`${inputStyle} border-[#FFC300]/30 bg-[#FFC300]/5`}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#001D3D] border border-[#003566] p-6 rounded-xl">
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
                  <div className="bg-[#FFC300]/10 border border-[#FFC300]/30 p-6 rounded-xl grid grid-cols-1 gap-6 animate-fade-in mt-2">
                    <div>
                      <label className={`${labelStyle} text-[#FFC300] flex items-center gap-1`}><Flame size={12}/> Soul Winning Category</label>
                      <select value={formData.soulWinner} onChange={e => setFormData({...formData, soulWinner: e.target.value})} className={`${inputStyle} border-[#FFC300]/30 bg-[#000814] text-[#FFC300]`}>
                        <option value="">- Select Origin / Category -</option>
                        {specializedSoulCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-[#003566] mt-4">
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
                   <div className="bg-[#001D3D] p-4 rounded-xl border border-[#003566]">
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

                   <div className="bg-[#001D3D] p-4 rounded-xl border border-[#003566]">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#001D3D] border border-[#003566] p-6 rounded-xl mt-4">
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
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-3.5 bg-[#FFC300] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#FFD60A] transition-all flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={16}/> {editingId ? 'Update District Record' : 'Save Record'}</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================== */}
          {/* DIRECTORY ROSTER LIST                          */}
          {/* ============================================== */}
          {activeTab === 'directory' && (
            <div className="bg-[#000814] rounded-2xl border border-[#003566] overflow-hidden shadow-2xl animate-fade-in">
              <div className="p-6 border-b border-[#003566] flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 text-[#FFC300]/50" size={16}/>
                  <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs outline-none focus:border-[#FFC300] text-white placeholder:text-white/40" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-[#001D3D] px-3 py-1 rounded-xl border border-[#003566]">
                    <Filter size={14} className="text-[#FFC300] shrink-0" />
                    <select value={fAssem} onChange={e => setFAssem(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 outline-none cursor-pointer [&>option]:text-[#000814]"><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
                  </div>
                  <div className="flex items-center gap-2 bg-[#001D3D] px-3 py-1 rounded-xl border border-[#003566]">
                    <select value={fRole} onChange={e => setFRole(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 outline-none cursor-pointer [&>option]:text-[#000814]"><option value="All Roles">All Roles</option>{churchRoles.map(r => <option key={r} value={r}>{r}</option>)}</select>
                  </div>
                  <div className="flex items-center gap-2 bg-[#001D3D] px-3 py-1 rounded-xl border border-[#003566]">
                    <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 outline-none cursor-pointer [&>option]:text-[#000814]"><option value="All Statuses">All Statuses</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                  <div className="flex items-center gap-2 bg-[#001D3D] px-3 py-1 rounded-xl border border-[#003566]">
                    <select value={fDemo} onChange={e => setFDemo(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 outline-none cursor-pointer [&>option]:text-[#000814]">
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
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#001D3D] z-10 text-[9px] font-black text-[#FFC300] uppercase tracking-widest border-b border-[#003566]">
                    <tr><th className="p-5">Member Identity</th><th className="p-5">Locations (Cell & Study)</th><th className="p-5">Gender & Age</th><th className="p-5">Contact</th><th className="p-5 text-center">System Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]">
                    {filtered.map(m => {
                      const age = calculateAge(m.dob);
                      
                      const rawStatus = m.membershipStatus || m.memberStatus || 'Active Member';
                      const normalizedStatus = rawStatus === 'Active' ? 'Active Member' : rawStatus;
                      const isInactive = normalizedStatus !== 'Active Member';
                      
                      return (
                        <tr key={m.id} className={`transition-colors ${isInactive ? 'bg-[#000814] opacity-60 hover:opacity-100' : 'hover:bg-[#001D3D]/50'}`}>
                          <td className="p-5">
                            <div className="font-black text-white text-sm drop-shadow-sm">{m.name}</div>
                            <div className="flex gap-2 items-center mt-1.5">
                              <span className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest bg-[#003566] px-2 py-0.5 rounded border border-[#FFC300]/30">{m.churchRole}</span>
                              {isInactive && <span className="text-[8px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">{normalizedStatus}</span>}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-white mb-1">{m.localAssembly}</div>
                            <div className="flex flex-col gap-0.5 text-[9px] text-white/50 font-bold uppercase tracking-widest">
                              <span><span className="text-[#FFC300]">HC:</span> {m.homeCell && m.homeCell !== 'None' ? m.homeCell : '-'}</span>
                              <span><span className="text-[#FFC300]">BS:</span> {m.bibleStudy && m.bibleStudy !== 'None' ? m.bibleStudy : '-'}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="text-xs font-bold text-white mb-1">{m.gender} • {m.ageGroup || getAgeDemographic(m.dob)}</div>
                            <div className="text-[9px] font-black text-white/50 uppercase tracking-widest">{m.maritalStatus}</div>
                            <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 border ${
                              age === null ? 'bg-[#001D3D] text-white/50 border-[#003566]' :
                              'bg-[#003566] text-[#FFC300] border-[#FFC300]/30'
                            }`}>
                              {age !== null ? `${age} yrs` : 'No DOB'}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-mono font-bold text-[#FFC300] mb-2">{m.phone}</div>
                            <div className="flex gap-2">
                              <a href={`https://wa.me/${m.phone?.startsWith('0') ? '233' + m.phone.substring(1) : m.phone}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all shadow-sm">
                                <MessageCircle size={14} />
                              </a>
                              <a href={`tel:${m.phone}`} className="p-2 bg-[#001D3D] border border-[#003566] text-white rounded-lg hover:bg-[#003566] transition-all shadow-sm">
                                <PhoneCall size={14} />
                              </a>
                              {isTier1 && (
                                <button onClick={() => handleSendDirectSMS(m)} className={`p-2 rounded-lg transition-all shadow-sm relative group/btn border ${isOffline ? 'bg-[#000814] border-[#003566] text-white/30 cursor-not-allowed' : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-white'}`}>
                                  <MessageSquare size={14} />
                                  {!isOffline && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FFC300] rounded-full flex items-center justify-center border border-[#000814] shadow-sm"><Shield size={6} className="text-[#000814]" /></div>}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEdit(m)} className="p-2 text-white/40 hover:bg-[#FFC300]/20 hover:text-[#FFC300] rounded-lg transition-colors"><Edit size={16}/></button>
                              <button onClick={() => triggerDelete(m.id, m.name, 'member')} className="p-2 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-white/50 font-bold italic text-xs">No records found matching these criteria.</td></tr>}
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
              <div className="bg-[#000814] p-6 md:p-8 rounded-2xl border border-[#003566] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
                <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                  <FileBadge size={16} className="text-[#FFC300]"/> Issue / Log Certificate
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
                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3 bg-[#FFC300] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#FFD60A] transition-all flex justify-center items-center gap-2">
                      {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <><Save size={14}/> Log Certificate</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-[#000814] rounded-2xl border border-[#003566] overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#003566] bg-[#001D3D] flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="font-black text-white uppercase tracking-widest text-[10px] flex items-center gap-2"><FileText size={14} className="text-[#FFC300]"/> Issued Records</h3>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-[#FFC300]/50" size={14}/>
                    <input type="text" placeholder="Search by name or serial..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2 bg-[#000814] border border-[#003566] rounded-lg font-bold text-xs outline-none focus:border-[#FFC300] text-white placeholder:text-white/30" />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-[#001D3D] z-10 text-[9px] font-black text-[#FFC300] uppercase tracking-widest border-b border-[#003566]">
                      <tr><th className="p-4">Issue Date</th><th className="p-4">Member Name</th><th className="p-4">Certificate Type & Details</th><th className="p-4 text-center">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {filteredCerts.map(cert => (
                        <tr key={cert.id} className="hover:bg-[#001D3D]/50 transition-colors">
                          <td className="p-4 font-mono text-[10px] text-white/70">{cert.issueDate}</td>
                          <td className="p-4 font-black text-white text-sm">{cert.memberName}</td>
                          <td className="p-4">
                            <div className="flex gap-2 items-center mb-1">
                              <span className="text-[8px] font-black uppercase text-[#FFC300] bg-[#003566] px-2 py-0.5 rounded border border-[#FFC300]/30">{cert.certificateType}</span>
                              {cert.certificateNumber && <span className="text-[8px] font-mono text-white/50 bg-[#000814] border border-[#003566] px-1.5 py-0.5 rounded">NO: {cert.certificateNumber}</span>}
                            </div>
                            <div className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1.5">Issued by: {cert.issuedBy || 'N/A'} {cert.notes && `• ${cert.notes}`}</div>
                          </td>
                          <td className="p-4 text-center">
                            {isTier1 && (
                              <button onClick={() => triggerDelete(cert.id, cert.certificateType, 'certificate')} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={14}/></button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredCerts.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-white/50 font-bold italic text-xs">No certificates logged yet.</td></tr>}
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