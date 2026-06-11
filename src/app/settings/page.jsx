"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Settings, Save, Image as ImageIcon, CheckCircle2, AlertCircle, MapPin, Plus, Trash2, Loader2, UploadCloud, Building2, Edit2, Check, X, Layers, Filter, BookOpen, Home } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';

export default function SystemSettings() {
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // --- BRANDING STATES ---
  const [districtName, setDistrictName] = useState('KETIEJILI');
  const [districtSlogan, setDistrictSlogan] = useState('District Command');
  const [logoPreview, setLogoPreview] = useState('/logo.jpg');

  // --- MASTER DATA STATES ---
  const [members, setMembers] = useState([]); 
  const [assemblies, setAssemblies] = useState([]);
  
  // --- ASSEMBLIES UI STATES ---
  const [newAssembly, setNewAssembly] = useState('');
  const [editingAssemblyId, setEditingAssemblyId] = useState(null);
  const [editingAssemblyName, setEditingAssemblyName] = useState('');

  // --- GROUPS UI STATES ---
  const [editingCellKey, setEditingCellKey] = useState(null); 
  const [editingCellName, setEditingCellName] = useState('');
  
  const [editingStudyKey, setEditingStudyKey] = useState(null); 
  const [editingStudyName, setEditingStudyName] = useState('');

  const [groupCardFilter, setGroupCardFilter] = useState('All Assemblies');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.districtName) setDistrictName(data.districtName);
          if (data.districtSlogan) setDistrictSlogan(data.districtSlogan);
          if (data.logoBase64) setLogoPreview(data.logoBase64);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      setAssemblies(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubAssem(); unsubMembers(); };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // ==========================================
  // DUAL RADAR (HOME CELLS & BIBLE STUDIES)
  // ==========================================
  const cellsMap = new Map();
  const studiesMap = new Map();

  members.forEach(m => {
    if (m.homeCell && m.homeCell !== 'None') {
      const cellKey = `${m.localAssembly}|||${m.homeCell}`;
      if (!cellsMap.has(cellKey)) {
        cellsMap.set(cellKey, { key: cellKey, assemblyName: m.localAssembly, name: m.homeCell });
      }
    }
    if (m.bibleStudy && m.bibleStudy !== 'None') {
      const studyKey = `${m.localAssembly}|||${m.bibleStudy}`;
      if (!studiesMap.has(studyKey)) {
        studiesMap.set(studyKey, { key: studyKey, assemblyName: m.localAssembly, name: m.bibleStudy });
      }
    }
  });
  
  const allCells = Array.from(cellsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const displayedCells = allCells.filter(c => groupCardFilter === 'All Assemblies' || c.assemblyName === groupCardFilter);

  const allStudies = Array.from(studiesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const displayedStudies = allStudies.filter(s => groupCardFilter === 'All Assemblies' || s.assemblyName === groupCardFilter);

  // ==========================================
  // LOCAL ASSEMBLIES LOGIC
  // ==========================================
  const handleAddAssembly = async (e) => {
    e.preventDefault();
    if (!newAssembly.trim()) return;
    try {
      await addDoc(collection(db, 'assemblies'), { name: newAssembly.trim() });
      setNewAssembly('');
      showNotification('success', 'Local Assembly added to district network!');
    } catch (error) {
      showNotification('error', 'Failed to register assembly.');
    }
  };

  const handleUpdateAssembly = async (id, oldName) => {
    const newName = editingAssemblyName.trim();
    if (!newName || newName === oldName) {
      setEditingAssemblyId(null);
      return;
    }
    
    setIsSubmitting(true);
    showNotification('success', 'Synchronizing assembly identity across all members...');

    try {
      await updateDoc(doc(db, 'assemblies', id), { name: newName });
      
      const memberQuery = query(collection(db, 'members'), where('localAssembly', '==', oldName));
      const memberSnapshot = await getDocs(memberQuery);
      for (const memberDoc of memberSnapshot.docs) {
        await updateDoc(doc(db, 'members', memberDoc.id), { localAssembly: newName });
      }

      if (groupCardFilter === oldName) setGroupCardFilter(newName);
      
      setEditingAssemblyId(null);
      showNotification('success', 'Assembly renamed successfully.');
    } catch (error) {
      showNotification('error', 'Cascade sync failure occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssembly = async (id, assemName) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (!window.confirm(`PERMANENTLY remove ${assemName}? All records will fall back to General Assembly.`)) return;

    setIsSubmitting(true);
    try {
      showNotification('success', 'Migrating active members to safety container...');
      const q = query(collection(db, 'members'), where('localAssembly', '==', assemName));
      const snapshot = await getDocs(q);
      
      for (const memberDoc of snapshot.docs) {
        await updateDoc(doc(db, 'members', memberDoc.id), { localAssembly: 'General Assembly' });
      }

      await deleteDoc(doc(db, 'assemblies', id));
      showNotification('success', 'Assembly purged. Souls protected inside General Assembly.');
    } catch (error) {
      showNotification('error', 'Purge migration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SPLIT DISCIPLESHIP GROUP LOGIC (HOME CELLS)
  // ==========================================
  const handleUpdateCell = async (oldName, assemblyName) => {
    const newName = editingCellName.trim();
    if (!newName || newName === oldName) {
      setEditingCellKey(null);
      return;
    }
    
    setIsSubmitting(true);
    showNotification('success', 'Updating Home Cell identity for all assigned members...');
    try {
      const q = query(collection(db, 'members'), where('homeCell', '==', oldName), where('localAssembly', '==', assemblyName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) {
        await updateDoc(doc(db, 'members', memberDoc.id), { homeCell: newName });
      }
      setEditingCellKey(null);
      showNotification('success', 'Home Cell renamed successfully.');
    } catch (error) {
      showNotification('error', 'Failed to rename Home Cell records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCell = async (cellName, assemName) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (!window.confirm(`Delete Home Cell "${cellName}" from ${assemName}? Members will be marked as 'None'.`)) return;

    setIsSubmitting(true);
    try {
      showNotification('success', 'Disbanding Home Cell...');
      const q = query(collection(db, 'members'), where('homeCell', '==', cellName), where('localAssembly', '==', assemName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) {
        await updateDoc(doc(db, 'members', memberDoc.id), { homeCell: 'None' });
      }
      showNotification('success', 'Home Cell dissolved smoothly.');
    } catch (error) {
      showNotification('error', 'Cascade execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SPLIT DISCIPLESHIP GROUP LOGIC (BIBLE STUDY)
  // ==========================================
  const handleUpdateStudy = async (oldName, assemblyName) => {
    const newName = editingStudyName.trim();
    if (!newName || newName === oldName) {
      setEditingStudyKey(null);
      return;
    }
    
    setIsSubmitting(true);
    showNotification('success', 'Updating Bible Study identity for all assigned members...');
    try {
      const q = query(collection(db, 'members'), where('bibleStudy', '==', oldName), where('localAssembly', '==', assemblyName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) {
        await updateDoc(doc(db, 'members', memberDoc.id), { bibleStudy: newName });
      }
      setEditingStudyKey(null);
      showNotification('success', 'Bible Study Group renamed successfully.');
    } catch (error) {
      showNotification('error', 'Failed to rename Bible Study records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudy = async (studyName, assemName) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (!window.confirm(`Delete Bible Study Group "${studyName}" from ${assemName}? Members will be marked as 'None'.`)) return;

    setIsSubmitting(true);
    try {
      showNotification('success', 'Disbanding Bible Study Group...');
      const q = query(collection(db, 'members'), where('bibleStudy', '==', studyName), where('localAssembly', '==', assemName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) {
        await updateDoc(doc(db, 'members', memberDoc.id), { bibleStudy: 'None' });
      }
      showNotification('success', 'Bible Study Group dissolved smoothly.');
    } catch (error) {
      showNotification('error', 'Cascade execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // BRANDING LOGIC
  // ==========================================
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) { 
        showNotification('error', 'Logo size exceeds 1MB threshold limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'system_settings', 'general'), {
        districtName,
        districtSlogan,
        logoBase64: logoPreview,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      showNotification('success', 'Branding configurations locked in globally.');
    } catch (error) {
      showNotification('error', 'Configuration save script failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // PALETTE 2 (MODERN CYAN & GOLD) INPUT STYLE
  const inputStyle = "w-full p-3 bg-[#023047] border border-[#209EBB]/30 rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFB701] transition-all shadow-sm placeholder:text-[#8ECAE6]/50 [&>option]:text-[#023047]";
  const labelStyle = "block text-[9px] font-black text-[#8ECAE6] uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFB701]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* PALETTE 2 BACKGROUND GRADIENT */}
      <div className="min-h-full bg-gradient-to-br from-[#023047] via-[#209EBB]/20 to-[#023047] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        {/* Ambient background decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8ECAE6]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFB701]/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-[1400px] mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-[10px] uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFB701] text-[#023047]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER (Locks to top when scrolling down)          */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#023047] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#209EBB]/20 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#209EBB]/10 p-3 rounded-xl text-[#FFB701] border border-[#FFB701]/20 hidden md:block">
                <Settings size={24} />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">System Settings</h1>
                <p className="font-bold text-[#8ECAE6] text-[10px] uppercase tracking-widest mt-1">Configure core network parameters and branding.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* ========================================== */}
            {/* COLUMN 1: LOCAL ASSEMBLIES CARD            */}
            {/* ========================================== */}
            <div className="bg-[#023047] rounded-2xl border border-[#209EBB]/30 shadow-xl flex flex-col h-[520px] p-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#209EBB]/20">
                <MapPin className="text-[#8ECAE6]" size={16} />
                <h2 className="text-xs font-black text-white uppercase tracking-widest">Local Assemblies</h2>
              </div>

              <form onSubmit={handleAddAssembly} className="flex gap-2 mb-4">
                <input 
                  type="text" value={newAssembly} onChange={e => setNewAssembly(e.target.value)}
                  placeholder="Type Local Name (e.g. Central)"
                  className="flex-1 px-4 py-2.5 bg-[#209EBB]/10 border border-[#209EBB]/30 rounded-xl font-bold text-xs focus:outline-none focus:border-[#FFB701] text-white placeholder:text-[#8ECAE6]/50 transition-all"
                  required
                />
                <button type="submit" disabled={isSubmitting} className="px-4 bg-[#FFB701] hover:bg-[#FC8500] text-[#023047] rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-40 border border-[#FFB701]">
                  <Plus size={14} />
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {assemblies.map((assem) => (
                  <div key={assem.id} className="flex items-center justify-between p-3 bg-[#209EBB]/5 rounded-xl border border-[#209EBB]/20 hover:border-[#FFB701]/30 transition-colors group">
                    {editingAssemblyId === assem.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input 
                          type="text" value={editingAssemblyName} onChange={e => setEditingAssemblyName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-[#023047] border border-[#FFB701] rounded-lg text-xs font-bold text-white focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateAssembly(assem.id, assem.name)} disabled={isSubmitting} className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-lg disabled:opacity-40 transition-colors border border-emerald-500/30"><Check size={14}/></button>
                        <button onClick={() => setEditingAssemblyId(null)} className="p-2 bg-[#209EBB]/10 text-[#8ECAE6] hover:bg-[#209EBB]/20 rounded-lg transition-colors border border-[#209EBB]/30"><X size={14}/></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-black text-white text-xs uppercase tracking-widest">{assem.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingAssemblyId(assem.id); setEditingAssemblyName(assem.name); }} className="p-1.5 text-[#8ECAE6] hover:bg-[#209EBB]/20 hover:text-white rounded-md transition-colors"><Edit2 size={12} /></button>
                          {isTier1 && <button onClick={() => handleDeleteAssembly(assem.id, assem.name)} className="p-1.5 text-[#8ECAE6] hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"><Trash2 size={12} /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {assemblies.length === 0 && <p className="text-center text-[10px] font-bold text-[#8ECAE6] pt-10 uppercase tracking-widest">No locals found.</p>}
              </div>
            </div>

            {/* ========================================== */}
            {/* COLUMN 2: HOME CELLS RADAR                 */}
            {/* ========================================== */}
            <div className="bg-[#023047] rounded-2xl border border-[#209EBB]/30 shadow-xl flex flex-col h-[520px] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-[#209EBB]/20">
                <div className="flex items-center gap-2">
                  <Home className="text-[#FFB701]" size={16} />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">Home Cells</h2>
                </div>
                
                <div className="flex items-center gap-1.5 bg-[#209EBB]/10 px-2 py-1.5 rounded-xl border border-[#209EBB]/30 shadow-sm">
                  <Filter size={10} className="text-[#FFB701] shrink-0" />
                  <select value={groupCardFilter} onChange={e => setGroupCardFilter(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-[#8ECAE6] focus:outline-none cursor-pointer [&>option]:text-[#023047]">
                    <option value="All Assemblies">All Assemblies</option>
                    {assemblies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {displayedCells.map((cell) => (
                  <div key={cell.key} className="flex items-center justify-between p-3 bg-[#209EBB]/5 rounded-xl border border-[#209EBB]/20 hover:border-[#FFB701]/30 transition-colors group">
                    {editingCellKey === cell.key ? (
                      <div className="flex items-center gap-2 w-full">
                        <input type="text" value={editingCellName} onChange={e => setEditingCellName(e.target.value)} className="flex-1 px-3 py-1.5 bg-[#023047] border border-[#FC8500] rounded-lg text-xs font-bold text-white focus:outline-none" autoFocus />
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdateCell(cell.name, cell.assemblyName)} disabled={isSubmitting} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-lg disabled:opacity-40 transition-colors border border-emerald-500/30"><Check size={14}/></button>
                          <button onClick={() => setEditingCellKey(null)} className="p-1.5 bg-[#209EBB]/10 text-[#8ECAE6] hover:bg-[#209EBB]/20 rounded-lg transition-colors border border-[#209EBB]/30"><X size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-xs uppercase tracking-widest">{cell.name}</span>
                          <span className="text-[9px] font-black text-[#8ECAE6] uppercase mt-0.5 tracking-widest">{cell.assemblyName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingCellKey(cell.key); setEditingCellName(cell.name); }} className="p-1.5 text-[#8ECAE6] hover:bg-[#209EBB]/20 hover:text-white rounded-md transition-colors"><Edit2 size={12} /></button>
                          {isTier1 && <button onClick={() => handleDeleteCell(cell.name, cell.assemblyName)} className="p-1.5 text-[#8ECAE6] hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"><Trash2 size={12} /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {displayedCells.length === 0 && <p className="text-center text-[10px] font-bold text-[#8ECAE6] pt-10 uppercase tracking-widest">No Home Cells detected.</p>}
              </div>
            </div>

            {/* ========================================== */}
            {/* COLUMN 3: BIBLE STUDY GROUPS RADAR         */}
            {/* ========================================== */}
            <div className="bg-[#023047] rounded-2xl border border-[#209EBB]/30 shadow-xl flex flex-col h-[520px] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-[#209EBB]/20">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-[#FC8500]" size={16} />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">Bible Studies</h2>
                </div>
                
                <div className="flex items-center gap-1.5 bg-[#209EBB]/10 px-2 py-1.5 rounded-xl border border-[#209EBB]/30 shadow-sm">
                  <Filter size={10} className="text-[#FFB701] shrink-0" />
                  <select value={groupCardFilter} onChange={e => setGroupCardFilter(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-[#8ECAE6] focus:outline-none cursor-pointer [&>option]:text-[#023047]">
                    <option value="All Assemblies">All Assemblies</option>
                    {assemblies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {displayedStudies.map((study) => (
                  <div key={study.key} className="flex items-center justify-between p-3 bg-[#209EBB]/5 rounded-xl border border-[#209EBB]/20 hover:border-[#FFB701]/30 transition-colors group">
                    {editingStudyKey === study.key ? (
                      <div className="flex items-center gap-2 w-full">
                        <input type="text" value={editingStudyName} onChange={e => setEditingStudyName(e.target.value)} className="flex-1 px-3 py-1.5 bg-[#023047] border border-[#FFB701] rounded-lg text-xs font-bold text-white focus:outline-none" autoFocus />
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdateStudy(study.name, study.assemblyName)} disabled={isSubmitting} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-lg disabled:opacity-40 transition-colors border border-emerald-500/30"><Check size={14}/></button>
                          <button onClick={() => setEditingStudyKey(null)} className="p-1.5 bg-[#209EBB]/10 text-[#8ECAE6] hover:bg-[#209EBB]/20 rounded-lg transition-colors border border-[#209EBB]/30"><X size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-xs uppercase tracking-widest">{study.name}</span>
                          <span className="text-[9px] font-black text-[#8ECAE6] uppercase mt-0.5 tracking-widest">{study.assemblyName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingStudyKey(study.key); setEditingStudyName(study.name); }} className="p-1.5 text-[#8ECAE6] hover:bg-[#209EBB]/20 hover:text-white rounded-md transition-colors"><Edit2 size={12} /></button>
                          {isTier1 && <button onClick={() => handleDeleteStudy(study.name, study.assemblyName)} className="p-1.5 text-[#8ECAE6] hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"><Trash2 size={12} /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {displayedStudies.length === 0 && <p className="text-center text-[10px] font-bold text-[#8ECAE6] pt-10 uppercase tracking-widest">No Bible Study groups detected.</p>}
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* ROW 2: GLOBAL SYSTEM BRANDING TRINITY      */}
          {/* ========================================== */}
          <form onSubmit={handleSaveSettings} className="bg-[#023047] p-6 md:p-8 rounded-[2rem] border border-[#209EBB]/30 shadow-xl space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#209EBB]/20">
              <Building2 className="text-[#FFB701]" size={18} />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Global System Branding</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="flex flex-col items-center justify-center bg-[#209EBB]/5 border border-[#209EBB]/20 p-5 rounded-2xl">
                <label className={labelStyle}>Official Logo Icon</label>
                <div className="w-24 h-24 rounded-full border-[3px] border-[#FFB701] shadow-lg flex items-center justify-center bg-[#023047] overflow-hidden relative group mb-3">
                  <img src={logoPreview} alt="District Branding Asset" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#023047]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <UploadCloud size={16} className="text-[#FFB701] mb-1" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <p className="text-[8px] font-black text-[#8ECAE6] text-center uppercase tracking-widest">PNG or JPG up to 1MB max</p>
              </div>

              <div>
                <label className={labelStyle}>District Identity Name</label>
                <input 
                  type="text" required value={districtName} 
                  onChange={(e) => setDistrictName(e.target.value.toUpperCase())} 
                  className={inputStyle} 
                  placeholder="e.g. KETIEJILI"
                />
              </div>

              <div>
                <label className={labelStyle}>System Slogan / Subtitle Text</label>
                <input 
                  type="text" required value={districtSlogan} 
                  onChange={(e) => setDistrictSlogan(e.target.value)} 
                  className={inputStyle} 
                  placeholder="e.g. District Command Center"
                />
              </div>
            </div>

            <div className="pt-5 border-t border-[#209EBB]/20 flex justify-end">
              <button type="submit" disabled={isSubmitting} className={`px-8 py-3.5 rounded-xl font-black transition-all shadow-md flex items-center justify-center gap-2 text-[#023047] text-[10px] uppercase tracking-widest w-full sm:w-auto border border-[#FFB701] ${isSubmitting ? 'bg-[#209EBB]/10 text-[#8ECAE6] cursor-not-allowed border-[#209EBB]/30' : 'bg-[#FFB701] hover:bg-[#FC8500]'}`}>
                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Committing...</> : <><Save size={14} /> Save Branding</>}
              </button>
            </div>
          </form>

        </div>
      </div>
    </DashboardLayout>
  );
}