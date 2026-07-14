"use client";
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Settings, Save, CheckCircle2, AlertCircle, MapPin, Plus, Trash2, Target, Loader2, UploadCloud, Building2, Edit2, Check, X, Filter, BookOpen, Home, Mic, Globe, FileAudio, MessageSquare, Phone, Lock } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE CONNECTION FOR ALTARCONNECT STUDIO & VAULT ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'PASTE_URL_HERE',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'PASTE_KEY_HERE'
);

export default function SystemSettings() {
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // --- BRANDING STATES ---
  const [areaName, setAreaName] = useState(''); 
  const [districtName, setDistrictName] = useState('KETIEJILI');
  const [districtSlogan, setDistrictSlogan] = useState('District Command');
  const [logoPreview, setLogoPreview] = useState('/logo.jpg');

  // --- OPERATIONAL VAULT STATES ---
  const [senderId, setSenderId] = useState('COP-KETIEJI');
  const [pastorContact, setPastorContact] = useState('+233541437815');

  // --- ALTARCONNECT STUDIO STATES ---
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [language, setLanguage] = useState("English");
  const [customLanguage, setCustomLanguage] = useState("");
  const [dayNumber, setDayNumber] = useState("Welcome");
  const [automatedSms, setAutomatedSms] = useState("");
  const [availableLanguages, setAvailableLanguages] = useState(["English", "Twi", "Konkomba"]);
  const fileInputRef = useRef(null);

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

  // --- FIREBASE & SUPABASE CONNECTION ---
  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const fetchSettings = async () => {
      try {
        // 1. Fetch Frontend Branding from Firebase
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.areaName) setAreaName(data.areaName);
          if (data.districtName) setDistrictName(data.districtName);
          if (data.districtSlogan) setDistrictSlogan(data.districtSlogan);
          if (data.logoBase64) setLogoPreview(data.logoBase64);
        }

        // 2. Fetch Operational Vault from Supabase (for backend Edge Functions)
        const { data: vaultData, error: vaultError } = await supabase
          .from('district_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (vaultData) {
          if (vaultData.sender_id) setSenderId(vaultData.sender_id);
          if (vaultData.pastor_contact) setPastorContact(vaultData.pastor_contact);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();

    const fetchLanguages = async () => {
      try {
        const { data } = await supabase.from("languages").select("name");
        if (data && data.length > 0) {
          setAvailableLanguages(data.map(l => l.name).sort());
        }
      } catch (error) {
        console.log("Supabase language fetch skipped or failed.");
      }
    };
    fetchLanguages();

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      setAssemblies(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubAssem(); unsubMembers(); };
  }, []);

  // --- DYNAMICALLY FETCH EXISTING AUTOMATION SLOT ---
  useEffect(() => {
    const fetchExistingTemplate = async () => {
      if (language && language !== "Other" && dayNumber) {
        try {
          const safeLanguage = language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
          const docRef = doc(db, 'altarconnect_sms_templates', `${dayNumber}_${safeLanguage}`);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().message) {
            setAutomatedSms(docSnap.data().message);
          } else {
            setAutomatedSms("");
          }
        } catch (error) {
          console.error("Error fetching existing template:", error);
        }
        
        // Reset staged audio upload when switching slots
        setAudioBlob(null);
        setAudioUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setAutomatedSms("");
      }
    };

    fetchExistingTemplate();
  }, [dayNumber, language]);

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

  const handleUpdateCell = async (oldName, assemblyName) => {
    const newName = editingCellName.trim();
    if (!newName || newName === oldName) { setEditingCellKey(null); return; }
    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'members'), where('homeCell', '==', oldName), where('localAssembly', '==', assemblyName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) { await updateDoc(doc(db, 'members', memberDoc.id), { homeCell: newName }); }
      setEditingCellKey(null);
      showNotification('success', 'Home Cell renamed successfully.');
    } catch (error) { showNotification('error', 'Failed to rename Home Cell records.'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteCell = async (cellName, assemName) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (!window.confirm(`Delete Home Cell "${cellName}" from ${assemName}? Members will be marked as 'None'.`)) return;
    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'members'), where('homeCell', '==', cellName), where('localAssembly', '==', assemName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) { await updateDoc(doc(db, 'members', memberDoc.id), { homeCell: 'None' }); }
      showNotification('success', 'Home Cell dissolved smoothly.');
    } catch (error) { showNotification('error', 'Cascade execution failed.'); } finally { setIsSubmitting(false); }
  };

  const handleUpdateStudy = async (oldName, assemblyName) => {
    const newName = editingStudyName.trim();
    if (!newName || newName === oldName) { setEditingStudyKey(null); return; }
    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'members'), where('bibleStudy', '==', oldName), where('localAssembly', '==', assemblyName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) { await updateDoc(doc(db, 'members', memberDoc.id), { bibleStudy: newName }); }
      setEditingStudyKey(null);
      showNotification('success', 'Bible Study Group renamed successfully.');
    } catch (error) { showNotification('error', 'Failed to rename Bible Study records.'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteStudy = async (studyName, assemName) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (!window.confirm(`Delete Bible Study Group "${studyName}" from ${assemName}? Members will be marked as 'None'.`)) return;
    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'members'), where('bibleStudy', '==', studyName), where('localAssembly', '==', assemName));
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) { await updateDoc(doc(db, 'members', memberDoc.id), { bibleStudy: 'None' }); }
      showNotification('success', 'Bible Study Group dissolved smoothly.');
    } catch (error) { showNotification('error', 'Cascade execution failed.'); } finally { setIsSubmitting(false); }
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
      // 1. Sync Frontend Settings to Firebase
      await setDoc(doc(db, 'system_settings', 'general'), {
        areaName, 
        districtName,
        districtSlogan,
        logoBase64: logoPreview,
        pastorContact, // Keep synchronized for public kiosk components
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      // 2. Sync Operational Vault to Supabase (for Edge Functions)
      const { error: vaultError } = await supabase
        .from('district_settings')
        .upsert({
          id: 1, // Locks to single row
          sender_id: senderId.trim(),
          pastor_contact: pastorContact.trim(),
          updated_at: new Date().toISOString()
        });

      if (vaultError) throw vaultError;

      showNotification('success', 'Branding & Vault configurations locked in globally.');
    } catch (error) {
      console.error(error);
      showNotification('error', 'Configuration save script failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // ALTARCONNECT STUDIO LOGIC
  // ==========================================
  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3")) {
        const url = URL.createObjectURL(file);
        setAudioBlob(file);
        setAudioUrl(url);
      } else {
        showNotification("error", "Invalid File. Please upload a valid .mp3 file for automation.");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const saveAutomationToCloud = async () => {
    const finalLanguage = language === "Other" ? customLanguage.trim() : language;
    if (!finalLanguage) return showNotification("error", "Please specify the language for this sequence.");
    if (!audioBlob && !automatedSms) return showNotification("error", "Please provide either an MP3 or an SMS template to save.");

    setIsSubmitting(true);
    const safeLanguage = finalLanguage.charAt(0).toUpperCase() + finalLanguage.slice(1).toLowerCase();
    const fileName = `${dayNumber}_${safeLanguage}.mp3`;

    try {
      // 1. Save Audio to Supabase if provided
      if (audioBlob) {
        const { error: storageError } = await supabase.storage
          .from('voice_messages')
          .upload(fileName, audioBlob, { cacheControl: '3600', upsert: true, contentType: 'audio/mpeg' });
        if (storageError) throw storageError;
      }

      // 2. Save SMS template to Firebase
      const smsDocRef = doc(db, 'altarconnect_sms_templates', `${dayNumber}_${safeLanguage}`);
      await setDoc(smsDocRef, {
        daySequence: dayNumber,
        language: safeLanguage,
        message: automatedSms,
        lastUpdated: new Date().toISOString()
      });

      // 3. Register custom language if new
      if (language === "Other" && customLanguage.trim() !== "") {
        const { data: existing } = await supabase.from("languages").select("name").ilike("name", safeLanguage);
        if (!existing || existing.length === 0) {
          await supabase.from("languages").insert([{ name: safeLanguage }]);
          setAvailableLanguages(prev => [...prev, safeLanguage].sort());
        }
      }

      showNotification("success", `Automation for ${dayNumber.replace('_', ' ')} (${safeLanguage}) secured globally.`);
      setAudioBlob(null);
      setAudioUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (language === "Other") setLanguage(safeLanguage);
      setCustomLanguage("");
      // We intentionally do not clear setAutomatedSms so the user can verify their saved text.

    } catch (error) {
      showNotification("error", "Upload Failed. Check Supabase/Firebase connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // NAVY & GOLD SOLID INPUT STYLE
  const inputStyle = "w-full p-3.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFC300] transition-all placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white shadow-inner";
  const labelStyle = "block text-[9px] font-black text-[#FFC300] uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative pb-20">
        
        <div className="relative z-10 space-y-6 animate-fade-in max-w-[1400px] mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-[10px] uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER (Locks to top when scrolling down)          */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block">
                <Settings size={24} />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">System Settings</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Configure network parameters, branding, and automation infrastructure.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* ========================================== */}
            {/* COLUMN 1: LOCAL ASSEMBLIES CARD            */}
            {/* ========================================== */}
            <div className="bg-[#000814] rounded-2xl border border-[#003566] shadow-xl flex flex-col h-[520px] p-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#003566]">
                <MapPin className="text-[#FFC300]" size={16} />
                <h2 className="text-xs font-black text-white uppercase tracking-widest">Local Assemblies</h2>
              </div>

              <form onSubmit={handleAddAssembly} className="flex gap-2 mb-4">
                <input 
                  type="text" value={newAssembly} onChange={e => setNewAssembly(e.target.value)}
                  placeholder="Type Local Name (e.g. Central)"
                  className="flex-1 px-4 py-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs focus:outline-none focus:border-[#FFC300] text-white placeholder:text-white/30 transition-all"
                  required
                />
                <button type="submit" disabled={isSubmitting} className="px-4 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-40 border border-[#FFC300]">
                  <Plus size={14} />
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {assemblies.map((assem) => (
                  <div key={assem.id} className="flex items-center justify-between p-3 bg-[#001D3D] rounded-xl border border-[#003566] hover:border-[#FFC300]/30 transition-colors group">
                    {editingAssemblyId === assem.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input 
                          type="text" value={editingAssemblyName} onChange={e => setEditingAssemblyName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-[#000814] border border-[#FFC300] rounded-lg text-xs font-bold text-white focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateAssembly(assem.id, assem.name)} disabled={isSubmitting} className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg disabled:opacity-40 transition-colors border border-emerald-500/30"><Check size={14}/></button>
                        <button onClick={() => setEditingAssemblyId(null)} className="p-2 bg-[#000814] text-white/50 hover:bg-[#003566] hover:text-white rounded-lg transition-colors border border-[#003566]"><X size={14}/></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-black text-white text-xs uppercase tracking-widest">{assem.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingAssemblyId(assem.id); setEditingAssemblyName(assem.name); }} className="p-1.5 text-white/40 hover:bg-[#003566] hover:text-white rounded-md transition-colors"><Edit2 size={12} /></button>
                          {isTier1 && <button onClick={() => handleDeleteAssembly(assem.id, assem.name)} className="p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"><Trash2 size={12} /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {assemblies.length === 0 && <p className="text-center text-[10px] font-bold text-white/40 pt-10 uppercase tracking-widest">No locals found.</p>}
              </div>
            </div>

            {/* ========================================== */}
            {/* COLUMN 2: HOME CELLS RADAR                 */}
            {/* ========================================== */}
            <div className="bg-[#000814] rounded-2xl border border-[#003566] shadow-xl flex flex-col h-[520px] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-[#003566]">
                <div className="flex items-center gap-2">
                  <Home className="text-[#FFC300]" size={16} />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">Home Cells</h2>
                </div>
                
                <div className="flex items-center gap-1.5 bg-[#001D3D] px-2 py-1.5 rounded-xl border border-[#003566] shadow-sm">
                  <Filter size={10} className="text-[#FFC300] shrink-0" />
                  <select value={groupCardFilter} onChange={e => setGroupCardFilter(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 focus:outline-none cursor-pointer [&>option]:text-[#001D3D]">
                    <option value="All Assemblies">All Assemblies</option>
                    {assemblies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {displayedCells.map((cell) => (
                  <div key={cell.key} className="flex items-center justify-between p-3 bg-[#001D3D] rounded-xl border border-[#003566] hover:border-[#FFC300]/30 transition-colors group">
                    {editingCellKey === cell.key ? (
                      <div className="flex items-center gap-2 w-full">
                        <input type="text" value={editingCellName} onChange={e => setEditingCellName(e.target.value)} className="flex-1 px-3 py-1.5 bg-[#000814] border border-[#FFC300] rounded-lg text-xs font-bold text-white focus:outline-none" autoFocus />
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdateCell(cell.name, cell.assemblyName)} disabled={isSubmitting} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg disabled:opacity-40 transition-colors border border-emerald-500/30"><Check size={14}/></button>
                          <button onClick={() => setEditingCellKey(null)} className="p-1.5 bg-[#000814] text-white/50 hover:bg-[#003566] hover:text-white rounded-lg transition-colors border border-[#003566]"><X size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-xs uppercase tracking-widest">{cell.name}</span>
                          <span className="text-[9px] font-black text-[#FFC300] uppercase mt-0.5 tracking-widest">{cell.assemblyName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingCellKey(cell.key); setEditingCellName(cell.name); }} className="p-1.5 text-white/40 hover:bg-[#003566] hover:text-white rounded-md transition-colors"><Edit2 size={12} /></button>
                          {isTier1 && <button onClick={() => handleDeleteCell(cell.name, cell.assemblyName)} className="p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"><Trash2 size={12} /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {displayedCells.length === 0 && <p className="text-center text-[10px] font-bold text-white/40 pt-10 uppercase tracking-widest">No Home Cells detected.</p>}
              </div>
            </div>

            {/* ========================================== */}
            {/* COLUMN 3: BIBLE STUDY GROUPS RADAR         */}
            {/* ========================================== */}
            <div className="bg-[#000814] rounded-2xl border border-[#003566] shadow-xl flex flex-col h-[520px] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-[#003566]">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-[#FFC300]" size={16} />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">Bible Studies</h2>
                </div>
                
                <div className="flex items-center gap-1.5 bg-[#001D3D] px-2 py-1.5 rounded-xl border border-[#003566] shadow-sm">
                  <Filter size={10} className="text-[#FFC300] shrink-0" />
                  <select value={groupCardFilter} onChange={e => setGroupCardFilter(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 focus:outline-none cursor-pointer [&>option]:text-[#001D3D]">
                    <option value="All Assemblies">All Assemblies</option>
                    {assemblies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {displayedStudies.map((study) => (
                  <div key={study.key} className="flex items-center justify-between p-3 bg-[#001D3D] rounded-xl border border-[#003566] hover:border-[#FFC300]/30 transition-colors group">
                    {editingStudyKey === study.key ? (
                      <div className="flex items-center gap-2 w-full">
                        <input type="text" value={editingStudyName} onChange={e => setEditingStudyName(e.target.value)} className="flex-1 px-3 py-1.5 bg-[#000814] border border-[#FFC300] rounded-lg text-xs font-bold text-white focus:outline-none" autoFocus />
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdateStudy(study.name, study.assemblyName)} disabled={isSubmitting} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg disabled:opacity-40 transition-colors border border-emerald-500/30"><Check size={14}/></button>
                          <button onClick={() => setEditingStudyKey(null)} className="p-1.5 bg-[#000814] text-white/50 hover:bg-[#003566] hover:text-white rounded-lg transition-colors border border-[#003566]"><X size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-xs uppercase tracking-widest">{study.name}</span>
                          <span className="text-[9px] font-black text-[#FFC300] uppercase mt-0.5 tracking-widest">{study.assemblyName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingStudyKey(study.key); setEditingStudyName(study.name); }} className="p-1.5 text-white/40 hover:bg-[#003566] hover:text-white rounded-md transition-colors"><Edit2 size={12} /></button>
                          {isTier1 && <button onClick={() => handleDeleteStudy(study.name, study.assemblyName)} className="p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"><Trash2 size={12} /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {displayedStudies.length === 0 && <p className="text-center text-[10px] font-bold text-white/40 pt-10 uppercase tracking-widest">No Bible Study groups detected.</p>}
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* ROW 2: GLOBAL SYSTEM BRANDING TRINITY      */}
          {/* ========================================== */}
          <form onSubmit={handleSaveSettings} className="bg-[#000814] p-6 md:p-8 rounded-[2rem] border border-[#003566] shadow-xl space-y-6">
            
            {/* FRONTEND BRANDING */}
            <div className="flex items-center gap-2 pb-3 border-b border-[#003566]">
              <Building2 className="text-[#FFC300]" size={18} />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Global System Branding</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div className="flex flex-col items-center justify-center bg-[#001D3D] border border-[#003566] p-5 rounded-2xl">
                <label className={labelStyle}>Official Logo Icon</label>
                <div className="w-24 h-24 rounded-full border-[3px] border-[#FFC300] shadow-lg flex items-center justify-center bg-[#000814] overflow-hidden relative group mb-3">
                  <img src={logoPreview} alt="District Branding Asset" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#000814]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <UploadCloud size={16} className="text-[#FFC300] mb-1" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <p className="text-[8px] font-black text-white/50 text-center uppercase tracking-widest">PNG or JPG up to 1MB max</p>
              </div>

              <div>
                <label className={labelStyle}>Area Identity Name</label>
                <input 
                  type="text" value={areaName} 
                  onChange={(e) => setAreaName(e.target.value.toUpperCase())} 
                  className={inputStyle} 
                  placeholder="e.g. KOFORIDUA AREA"
                />
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

            {/* NEW: OPERATIONAL VAULT */}
            <div className="pt-6 border-t border-[#003566]">
              <div className="flex items-center gap-2 pb-3 mb-5">
                <Lock className="text-[#FFC300]" size={16} />
                <h2 className="text-sm font-black text-[#8ECAE6] uppercase tracking-widest">Operational Vault (Backend Automations)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>Approved Sender ID (MNotify)</label>
                  <input 
                    type="text" required maxLength={11} value={senderId} 
                    onChange={(e) => setSenderId(e.target.value)} 
                    className={inputStyle} 
                    placeholder="e.g. Ketiejili"
                  />
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1.5 ml-1">Must exactly match MNotify dashboard.</p>
                </div>
                <div>
                  <label className={labelStyle}>District Minister Contact</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
                    <input 
                      type="text" required value={pastorContact} 
                      onChange={(e) => setPastorContact(e.target.value)} 
                      className={`${inputStyle} pl-10`} 
                      placeholder="e.g. +233 24 000 0000"
                    />
                  </div>
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1.5 ml-1">Included in automated morning SMS.</p>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[#003566] flex justify-end">
              <button type="submit" disabled={isSubmitting} className={`px-8 py-3.5 rounded-xl font-black transition-all shadow-md flex items-center justify-center gap-2 text-[#000814] text-[10px] uppercase tracking-widest w-full sm:w-auto border border-[#FFC300] ${isSubmitting ? 'bg-[#003566] text-white/50 cursor-not-allowed border-[#003566]' : 'bg-[#FFC300] hover:bg-[#FFD60A]'}`}>
                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Committing...</> : <><Save size={14} /> Secure Vault & Branding</>}
              </button>
            </div>
          </form>

          {/* ========================================== */}
          {/* ROW 3: ALTARCONNECT AUTOMATION STUDIO      */}
          {/* ========================================== */}
          <div className="bg-[#000814] p-6 md:p-8 rounded-[2rem] border border-[#003566] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FC8500]"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#003566] mt-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-lg text-[#FFC300]">
                  <Mic size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">AltarConnect Studio</h2>
                  <p className="text-[9px] font-bold text-[#8ECAE6] uppercase tracking-widest mt-1">Configure automated discipleship files</p>
                </div>
              </div>

              {/* DYNAMIC TARGET SLOT BADGE */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-lg shadow-sm">
                <span className="text-[9px] font-black text-[#FFC300] uppercase tracking-widest flex items-center gap-1.5">
                  <Target size={12} className="animate-pulse" /> Target Slot: {dayNumber.replace('_', ' ')} • {language === 'Other' ? (customLanguage || 'New Language') : language}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className={labelStyle}>Automated Sequence Day</label>
                <select value={dayNumber} onChange={e => setDayNumber(e.target.value)} className={inputStyle}>
                  <option value="Welcome">Initial Welcome Message</option>
                  {[2, 3, 4, 5, 6, 7].map(day => <option key={day} value={`Day_${day}`}>Grounding Day {day}</option>)}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Message Dialect / Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className={inputStyle}>
                  <option value="" disabled>- Select Language -</option>
                  {availableLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  <option value="Other" className="text-[#FFC300]">Other (Add new language)</option>
                </select>

                {language === "Other" && (
                  <div className="mt-4 animate-fade-in relative">
                    <Globe className="absolute left-4 top-3.5 h-4 w-4 text-[#FFC300]" />
                    <input type="text" placeholder="Type new language..." value={customLanguage} onChange={e => setCustomLanguage(e.target.value)} className={inputStyle} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Voice Upload Column */}
              <div className="bg-[#001D3D] rounded-2xl p-6 text-center border-2 border-dashed border-[#003566] hover:border-[#FFC300]/50 transition-colors relative flex flex-col justify-center min-h-[280px]">
                {!audioUrl && (
                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <div className="p-4 bg-[#FFC300]/10 text-[#FFC300] rounded-full border border-[#FFC300]/30 mb-2 shadow-inner">
                      <UploadCloud size={32} />
                    </div>
                    <p className="font-black text-white text-sm uppercase tracking-widest">Upload Pre-Recorded MP3 Voice</p>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Required format for Twilio broadcast compatibility.</p>
                    <input type="file" accept="audio/mpeg, .mp3" ref={fileInputRef} onChange={handleAudioUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                )}

                {audioUrl && (
                  <div className="flex flex-col items-center gap-4 relative z-10 w-full">
                    <div className="w-full bg-[#000814] p-4 rounded-xl shadow-inner border border-[#003566]">
                      <p className="text-[10px] font-black text-[#FFC300] uppercase tracking-widest mb-3 text-left flex items-center gap-2">
                        <FileAudio size={14} /> MP3 Ready for Deployment
                      </p>
                      <audio src={audioUrl} controls className="w-full rounded-md" />
                    </div>
                    <button onClick={() => { setAudioUrl(null); setAudioBlob(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest text-white/50 bg-[#000814] hover:bg-[#003566] hover:text-white border border-[#003566] transition-colors w-full">
                      Remove / Change File
                    </button>
                  </div>
                )}
              </div>

              {/* Automated SMS Column */}
              <div className="bg-[#001D3D] rounded-2xl p-6 border border-[#003566] flex flex-col min-h-[280px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#FFC300]"/>
                    <label className="text-[10px] font-black text-white uppercase tracking-widest">Automated SMS Template</label>
                  </div>
                  {automatedSms.trim() !== '' && (
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-widest">
                      Currently Saved
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-bold text-[#8ECAE6]/70 uppercase tracking-widest mb-3">This text will be dispatched alongside the voice file on the specified sequence day.</p>
                <textarea 
                  rows="6" 
                  value={automatedSms} 
                  onChange={e => setAutomatedSms(e.target.value)}
                  placeholder="e.g. God bless you for answering the call! Listen to this brief prayer from the District Minister..."
                  className={`${inputStyle} resize-none flex-1 leading-relaxed border-[#FFC300]/20 focus:border-[#FFC300]`}
                ></textarea>
              </div>

            </div>

            <div className="pt-6 mt-6 border-t border-[#003566] flex justify-end">
              <button onClick={saveAutomationToCloud} disabled={isSubmitting} className="px-10 py-3.5 rounded-xl font-black text-[#000814] bg-[#FFC300] hover:bg-[#FFD60A] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-[10px] uppercase tracking-widest w-full sm:w-auto">
                {isSubmitting ? <><Loader2 className="animate-spin" size={14} /> Securing to Global Automation...</> : <><Save size={14} /> Deploy Automations</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}