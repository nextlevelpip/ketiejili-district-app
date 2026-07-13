"use client";
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Flame, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, MapPin, CalendarDays, Users, Megaphone, Target, FileSpreadsheet, Info, Download, X, Edit3, Upload, UploadCloud, AlertTriangle, Send, MessageSquare, Phone, FileText, RotateCcw, MessageCircle, UserPlus, Globe, Heart, UserCheck, User } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE CONNECTION FOR ALTARCONNECT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

const supabase = createClient(supabaseUrl, supabaseKey);

export default function EvangelismAndSouls() {
  const [activeTab, setActiveTab] = useState('log'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pastorContact, setPastorContact] = useState('+233 24 000 0000');

  // --- FIREBASE OUTREACH STATES ---
  const [logs, setLogs] = useState([]);
  const [assemblies, setAssemblies] = useState(['Central']);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, location: '' });

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [localAssembly, setLocalAssembly] = useState('Central');
  const [location, setLocation] = useState('');
  const [outreachType, setOutreachType] = useState('');
  const [targetDemographic, setTargetDemographic] = useState('');
  const [testimonies, setTestimonies] = useState('');
  const [adultSoulsCop, setAdultSoulsCop] = useState('');
  const [otherSoulsNonCop, setOtherSoulsNonCop] = useState('');
  const [gospelSundaySouls, setGospelSundaySouls] = useState('');
  const [childrenWon, setChildrenWon] = useState('');

  const [searchTermOutreach, setSearchTermOutreach] = useState('');
  const [fAssembly, setFAssembly] = useState('All Assemblies');
  const [fDemographic, setFDemographic] = useState('All Categories');

  // --- SUPABASE ALTARCONNECT STATES ---
  const [altarSouls, setAltarSouls] = useState([]);
  const [searchTermSouls, setSearchTermSouls] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSoul, setSelectedSoul] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [messageType, setMessageType] = useState("sms");
  const [smsMessage, setSmsMessage] = useState("");
  const [followUpSms, setFollowUpSms] = useState(""); 
  const [audioFile, setAudioFile] = useState(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  
  // Broadcast Success Modal State
  const [broadcastSuccessModal, setBroadcastSuccessModal] = useState({ isOpen: false, count: 0 });

  // --- NEW: SOUL REGISTRATION STATES ---
  const [availableLanguages, setAvailableLanguages] = useState(["English", "Twi", "Konkomba", "Ga", "Ewe"]);
  const [soulData, setSoulData] = useState({
    counselorName: '', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: '', customLanguage: ''
  });

  const fileInputRef = useRef(null);
  const audioUploadRef = useRef(null); 

  const outreachTypes = [
    "Crusades", "Rallies & Campaigns", "House-to-House Outreach", 
    "Traditional Ministries Outreaches", "HUM, MPWDs & Specialized Ministries", "Other Organized Evangelistic Activities"
  ];

  const pentChmsDemographics = [
    "General Church", "HUM (Home & Urban Missions)", "MPWD (Persons With Disabilities)", 
    "Chaplaincy", "Chieftaincy", "SOM (Schools Outreach)", "TOSM", "Digital Space", "Marketplace", "Prisons", "Children Ministry", "Youth Ministry", "Women's Ministry", "Men's Ministry", "Other"
  ];

  // --- INITIALIZATION ---
  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setCurrentUser(parsedUser);
      // Auto-fill Soul Winner's Name
      setSoulData(prev => ({ ...prev, counselorName: parsedUser.fullName || parsedUser.name || 'District Minister' }));
    }

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
        if (settingsDoc.exists() && settingsDoc.data().pastorContact) {
          setPastorContact(settingsDoc.data().pastorContact);
          setFollowUpSms(`God bless you! If you need further prayers or counseling, please call the District Minister on ${settingsDoc.data().pastorContact}.`);
        }
      } catch (e) {}
    };
    fetchSettings();

    const fetchLanguages = async () => {
      try {
        const { data } = await supabase.from("languages").select("name");
        if (data && data.length > 0) setAvailableLanguages(data.map(l => l.name).sort());
      } catch (error) {}
    };
    fetchLanguages();

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetched);
        setLocalAssembly(fetched[0]);
      }
    });

    const qLogs = query(collection(db, 'evangelism_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    fetchHarvest();

    return () => { unsubAssem(); unsubLogs(); };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // ==========================================================
  // FIREBASE OUTREACH LOGIC
  // ==========================================================
  const resetForm = () => {
    setLocation(''); setOutreachType(''); setTargetDemographic(''); 
    setAdultSoulsCop(''); setOtherSoulsNonCop(''); setGospelSundaySouls(''); setChildrenWon('');
    setTestimonies(''); setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSaveOutreach = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const aCop = parseInt(adultSoulsCop) || 0;
    const oNonCop = parseInt(otherSoulsNonCop) || 0;
    const gSunday = parseInt(gospelSundaySouls) || 0;
    const cWon = parseInt(childrenWon) || 0;
    const totalSouls = aCop + oNonCop + cWon;

    try {
      await addDoc(collection(db, 'evangelism_logs'), { 
        date, localAssembly, location: location.trim(), outreachType, targetDemographic,
        adultSoulsCop: aCop, otherSoulsNonCop: oNonCop, gospelSundaySouls: gSunday, childrenWon: cWon,
        totalSoulsWon: totalSouls, testimonies: testimonies.trim(), recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.fullName || 'System Admin'
      });
      showNotification('success', 'Outreach event logged successfully.');
      resetForm(); 
      setActiveTab('history');
    } catch (err) {
      showNotification('error', 'Critical Error: Data Not Saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDeleteOutreach = (id, location) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    setDeleteModal({ isOpen: true, id, location });
  };

  const confirmDeleteOutreach = async () => {
    try {
      await deleteDoc(doc(db, 'evangelism_logs', deleteModal.id));
      showNotification('success', 'Outreach log successfully purged.');
    } catch (err) { showNotification('error', 'Purge Failed.'); } 
    finally { setDeleteModal({ isOpen: false, id: null, location: '' }); }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.location || '').toLowerCase().includes(searchTermOutreach.toLowerCase());
    const matchesAssembly = fAssembly === 'All Assemblies' || log.localAssembly === fAssembly;
    const matchesDemo = fDemographic === 'All Categories' || log.targetDemographic === fDemographic;
    return matchesSearch && matchesAssembly && matchesDemo;
  });

  const totalPrograms = filteredLogs.length;
  const totalAdultCop = filteredLogs.reduce((sum, log) => sum + (log.adultSoulsCop || 0), 0);
  const totalOtherNonCop = filteredLogs.reduce((sum, log) => sum + (log.otherSoulsNonCop || 0), 0);
  const totalGospelSunday = filteredLogs.reduce((sum, log) => sum + (log.gospelSundaySouls || 0), 0);
  const totalChildren = filteredLogs.reduce((sum, log) => sum + (log.childrenWon || 0), 0);
  const totalAllSouls = totalAdultCop + totalOtherNonCop + totalChildren;

  // ==========================================================
  // SUPABASE ALTARCONNECT LOGIC
  // ==========================================================
  const fetchHarvest = async () => {
    try {
      const { data } = await supabase.from("souls").select("*").order("created_at", { ascending: false });
      if (data) setAltarSouls(data);
    } catch (e) {} finally { setIsLoading(false); }
  };

  const calculateDay = (createdAt) => {
    if (!createdAt) return 1;
    const start = new Date(createdAt); const now = new Date();
    start.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '233' + cleanPhone.substring(1);
    }
    return `https://wa.me/${cleanPhone}`;
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3")) {
        setAudioFile(file);
      } else {
        showNotification("error", "Invalid File. Please upload an .mp3 file.");
      }
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    if (messageType === "sms" && !smsMessage) return;
    if (messageType === "voice" && !audioFile) return;

    setIsSendingBroadcast(true);
    const recipients = altarSouls.filter(s => selectedIds.includes(s.id)).map(s => s.phone_number);

    try {
      if (messageType === "sms") {
        const formData = new FormData();
        formData.append("type", "sms");
        formData.append("recipients", JSON.stringify(recipients));
        formData.append("message", smsMessage);
        formData.append("senderId", "COP-KETIEJI"); 
        await fetch("/api/mnotify", { method: "POST", body: formData });
      } else {
        const voiceData = new FormData();
        voiceData.append("type", "voice");
        voiceData.append("recipients", JSON.stringify(recipients));
        voiceData.append("file", audioFile);
        await fetch("/api/mnotify", { method: "POST", body: voiceData });

        if (followUpSms.trim() !== "") {
          const smsData = new FormData();
          smsData.append("type", "sms");
          smsData.append("recipients", JSON.stringify(recipients));
          smsData.append("message", followUpSms);
          smsData.append("senderId", "COP-KETIEJI"); 
          await fetch("/api/mnotify", { method: "POST", body: smsData });
        }
      }

      setIsBroadcastModalOpen(false);
      setBroadcastSuccessModal({ isOpen: true, count: recipients.length });
      setSmsMessage(""); setAudioFile(null); setSelectedIds([]);
    } catch (error) {
      showNotification("error", "Network Error during broadcast.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const updateStatus = async (e, id, status) => {
    e.stopPropagation(); setProcessingId(id);
    const { error } = await supabase.from("souls").update({ follow_up_status: status }).eq("id", id);
    if (!error) setAltarSouls(altarSouls.map(soul => soul.id === id ? { ...soul, follow_up_status: status } : soul));
    setProcessingId(null);
  };

  const confirmDeleteSoul = async () => {
    if (!deleteConfirmId) return;
    setProcessingId(deleteConfirmId);
    const { error } = await supabase.from("souls").delete().eq("id", deleteConfirmId);
    if (!error) {
      setAltarSouls(altarSouls.filter(soul => soul.id !== deleteConfirmId));
      setSelectedIds(selectedIds.filter(selId => selId !== deleteConfirmId));
      showNotification("success", "Soul removed from tracking registry.");
    } else { showNotification("error", "Deletion Failed."); }
    setProcessingId(null); setDeleteConfirmId(null);
  };

  const saveNote = async () => {
    if (!selectedSoul) return;
    setSavingNote(true);
    const { error } = await supabase.from("souls").update({ pastoral_notes: noteText }).eq("id", selectedSoul.id);
    if (!error) {
      setAltarSouls(altarSouls.map(soul => soul.id === selectedSoul.id ? { ...soul, pastoral_notes: noteText } : soul));
      setSelectedSoul(null); 
    }
    setSavingNote(false);
  };

  const downloadTemplate = () => {
    const headers = "Full Name,Phone Number,Soul Winner,Gender,Preferred Language,Primary Spiritual Need\n";
    const sampleRow = "John Doe,0241234567,Pastor Alex,Male,English,General Prayer\n";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'AltarConnect_Import_Template.csv'; a.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        if (rows.length < 2) return showNotification("error", "File contains no data.");

        const validSouls = []; let errorCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim());
          if (!cols[0] || !cols[1] || cols[1].length < 9) { errorCount++; continue; }
          validSouls.push({
            full_name: cols[0], phone_number: cols[1].replace(/[^0-9+]/g, ''), counselor_name: cols[2] || "System Import",
            gender: cols[3] || "", language: cols[4] || "English", spiritual_need: cols[5] || "General Prayer",
            current_day: 1, follow_up_status: 'active'
          });
        }
        if (validSouls.length === 0) return showNotification("error", "No valid records found in CSV.");
        const { error } = await supabase.from("souls").insert(validSouls);
        if (!error) {
          await fetchHarvest(); 
          showNotification("success", `Import Complete! ${validSouls.length} souls added.`);
        } else { showNotification("error", "Database rejected file format."); }
      } catch (err) { showNotification("error", "Format error. Use standard CSV."); } 
      finally { setIsSubmitting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsText(file);
  };

  const exportRegistry = () => {
    const headers = "Name,Phone,Gender,Language,Entry Date,Day,Status,Need,Notes\n";
    const csvData = altarSouls.map(s => `"${s.full_name}","${s.phone_number}","${s.gender || ''}","${s.language || ''}","${s.created_at}","Day ${calculateDay(s.created_at)}","${s.follow_up_status}","${s.spiritual_need || ''}","${s.pastoral_notes || ''}"`).join("\n");
    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Ketiejili_Harvest_Registry.csv'; a.click();
  };

  const filteredSouls = altarSouls.filter(soul => {
    const matchesSearch = soul.full_name.toLowerCase().includes(searchTermSouls.toLowerCase()) || soul.phone_number.includes(searchTermSouls);
    const matchesStatus = filterStatus === "all" ? true : soul.follow_up_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = (e) => e.target.checked ? setSelectedIds(filteredSouls.map(s => s.id)) : setSelectedIds([]);
  const toggleSelectSoul = (id) => selectedIds.includes(id) ? setSelectedIds(selectedIds.filter(selId => selId !== id)) : setSelectedIds([...selectedIds, id]);

  // ==========================================================
  // INTERNAL SOUL REGISTRATION LOGIC
  // ==========================================================
  const handleSoulSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let cleanPhone = soulData.phone.replace(/\D/g, ''); 
    if (cleanPhone.length > 0 && cleanPhone[0] !== '0') cleanPhone = '0' + cleanPhone;

    if (cleanPhone.length !== 10) {
      showNotification('error', 'Phone number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    let finalLang = soulData.language;
    if (finalLang === "Other" && soulData.customLanguage) {
      finalLang = soulData.customLanguage.charAt(0).toUpperCase() + soulData.customLanguage.slice(1).toLowerCase();
      try {
        await supabase.from("languages").insert([{ name: finalLang }]);
        setAvailableLanguages(prev => [...prev, finalLang].sort());
      } catch (err) {}
    }
    
    const finalSpiritualNeed = soulData.category === "Other" ? soulData.customPrayer : soulData.category;

    try {
      const { error } = await supabase.from('souls').insert([{
        counselor_name: soulData.counselorName,
        full_name: soulData.fullName,
        phone_number: cleanPhone,
        gender: soulData.gender,
        language: finalLang || "English",
        spiritual_need: finalSpiritualNeed,
        current_day: 1,
        follow_up_status: "active"
      }]);

      if (error) throw error;

      showNotification('success', 'Soul successfully registered to AltarConnect Engine!');
      setSoulData({ counselorName: currentUser?.fullName || 'District Minister', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: '', customLanguage: '' });
      await fetchHarvest();
      setActiveTab('souls');
    } catch (err) {
      showNotification('error', 'Submission failure. Check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NAVY & GOLD SOLID INPUT STYLE
  const inputStyle = "w-full px-4 py-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white shadow-inner";
  const labelStyle = "block text-[9px] font-black text-[#FFC300] uppercase tracking-widest mb-1.5 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        {/* ========================================================= */}
        {/* GLOBAL MODALS (Fixed Z-Index & Styling)                   */}
        {/* ========================================================= */}

        {/* OUTREACH DELETE MODAL */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400"><AlertCircle size={28} /></div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Purge Record</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">Are you sure you want to permanently delete the outreach log for <span className="text-white">{deleteModal.location}</span>?</p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button onClick={() => setDeleteModal({ isOpen: false, id: null, location: '' })} className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]">Cancel</button>
                <button onClick={confirmDeleteOutreach} className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors">Confirm Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* SOUL DELETE MODAL */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400"><AlertTriangle size={28} /></div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Delete Soul?</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">Are you absolutely sure you want to remove this soul from the registry? Action cannot be undone.</p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]">Cancel</button>
                <button onClick={confirmDeleteSoul} className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors">Yes, Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* BROADCAST SUCCESS MODAL */}
        {broadcastSuccessModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Broadcast Dispatched!</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Successfully transmitted messages to <span className="text-[#FFC300]">{broadcastSuccessModal.count}</span> souls across the network.
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button onClick={() => setBroadcastSuccessModal({ isOpen: false, count: 0 })} className="w-full py-4 text-[10px] font-black text-[#FFC300] uppercase tracking-widest hover:bg-[#000814] transition-colors">
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASTORAL NOTES MODAL */}
        {selectedSoul && (
          <div className="fixed inset-0 bg-[#000814]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-[#001D3D] rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-[#003566]">
              <div className="bg-[#000814] p-5 text-white flex justify-between items-center border-b border-[#003566]">
                <h2 className="font-black text-sm uppercase tracking-widest text-[#FFC300]">Details: {selectedSoul.full_name}</h2>
                <button onClick={() => setSelectedSoul(null)} className="hover:text-white text-white/50 transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 md:p-8">
                <div className="mb-6 p-4 bg-[#000814] rounded-xl border border-[#003566] shadow-inner">
                  <p className="text-[9px] text-[#8ECAE6] font-black uppercase tracking-widest">Primary Spiritual Need</p>
                  <p className="text-sm font-black text-white mt-1 uppercase tracking-wider">{selectedSoul.spiritual_need || "General Prayer"}</p>
                </div>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={5} className={`${inputStyle} mb-6 leading-relaxed resize-none`} placeholder="Enter pastoral notes here..."></textarea>
                <div className="flex justify-end gap-3 border-t border-[#003566] pt-4">
                  <button onClick={() => setSelectedSoul(null)} className="px-6 py-3 text-white/50 hover:bg-[#000814] rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">Cancel</button>
                  <button onClick={saveNote} disabled={savingNote} className="px-8 py-3 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50 shadow-lg">Save Record</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BROADCAST MODAL */}
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 bg-[#000814]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-[#001D3D] rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-[#003566] scale-100">
              <div className="bg-[#000814] p-5 text-white flex justify-between items-center border-b border-[#003566]">
                <div>
                  <h2 className="font-black text-sm uppercase tracking-widest text-[#FFC300] flex items-center gap-2"><Send className="h-4 w-4"/> Broadcast Studio</h2>
                  <p className="text-[#8ECAE6] font-bold text-[9px] uppercase tracking-widest mt-1">Sending to {selectedIds.length} selected souls</p>
                </div>
                <button onClick={() => setIsBroadcastModalOpen(false)} className="hover:text-[#FFC300] text-white/50 transition-colors"><X className="h-5 w-5" /></button>
              </div>
              
              <div className="p-6 md:p-8">
                <form onSubmit={handleSendBroadcast} className="space-y-6">
                  <div>
                    <label className={labelStyle}>Communication Type</label>
                    <div className="flex bg-[#000814] p-1.5 rounded-xl border border-[#003566]">
                      <button type="button" onClick={() => setMessageType("sms")} className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all flex items-center justify-center gap-2 ${messageType === "sms" ? "bg-[#FFC300] text-[#000814] shadow-md" : "text-white/50 hover:text-white"}`}>
                        <MessageSquare className="h-3 w-3" /> Text SMS
                      </button>
                      <button type="button" onClick={() => setMessageType("voice")} className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all flex items-center justify-center gap-2 ${messageType === "voice" ? "bg-[#FFC300] text-[#000814] shadow-md" : "text-white/50 hover:text-white"}`}>
                        <Phone className="h-3 w-3" /> Voice Audio
                      </button>
                    </div>
                  </div>

                  {messageType === "sms" ? (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <label className={labelStyle}>Text Message</label>
                        <textarea required rows={5} placeholder="Type your pastoral message here..." value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} className={`${inputStyle} resize-none leading-relaxed`} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <label className={labelStyle}>Upload Voice File (.mp3)</label>
                        <div className="relative border-2 border-dashed border-[#003566] rounded-2xl p-8 text-center hover:border-[#FFC300]/50 transition-colors bg-[#000814]">
                          <input required type="file" accept="audio/mpeg, .mp3" onChange={handleAudioUpload} ref={audioUploadRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                            <div className="p-4 bg-[#FFC300]/10 rounded-full border border-[#FFC300]/30 shadow-sm">
                              <UploadCloud className="h-6 w-6 text-[#FFC300]" />
                            </div>
                            <span className="font-bold text-xs uppercase tracking-widest text-white/70">
                              {audioFile ? <span className="text-[#FFC300]">{audioFile.name}</span> : "Click or drag an MP3 file here"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#003566]">
                        <label className={labelStyle}>Follow-Up SMS (Sent immediately after voice call)</label>
                        <textarea 
                          rows={3} placeholder="Optional: Add a text message to send alongside the call..." 
                          value={followUpSms} onChange={(e) => setFollowUpSms(e.target.value)} 
                          className={`${inputStyle} resize-none leading-relaxed`} 
                        />
                        <p className="text-[8px] font-bold text-[#8ECAE6]/70 uppercase tracking-widest mt-2">Useful for dropping the Pastor's callback number.</p>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={isSendingBroadcast || (messageType === 'voice' && !audioFile) || (messageType === 'sms' && !smsMessage)} className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4 text-[10px] uppercase tracking-widest">
                    {isSendingBroadcast ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isSendingBroadcast ? "DISPATCHING TO FLOCK..." : `BROADCAST TO ${selectedIds.length} SOULS`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {notification.message}
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS                                      */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><Flame size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Evangelism & Souls</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Track outreach efforts & harvested souls.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'log', label: 'Log Outreach', icon: Megaphone },
                { id: 'history', label: `Reports (${logs.length})`, icon: FileSpreadsheet },
                { id: 'souls', label: `Harvested Souls (${altarSouls.length})`, icon: Users },
                { id: 'register', label: 'Register Soul', icon: UserPlus } // NEW TAB
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}
                  >
                    <Icon size={12}/> {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ================= TAB 1: LOG OUTREACH ================= */}
          {activeTab === 'log' && (
            <div className="bg-[#000814] p-6 md:p-10 rounded-[2rem] shadow-xl border border-[#003566] max-w-5xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
              
              <div className="mb-6 border-b border-[#003566] pb-4 flex justify-between items-start flex-wrap gap-4 mt-1">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Record Evangelism Event</h2>
                  <p className="text-[9px] font-bold text-[#FFC300] uppercase tracking-widest mt-1.5">Inputs are strictly aligned with the Headquarters portal.</p>
                </div>
              </div>

              <div className="bg-[#001D3D] border border-[#003566] p-4 rounded-xl mb-6 flex items-start gap-3">
                <Info size={16} className="text-[#FFC300] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mb-1">Counting Rule Notice</h4>
                  <p className="text-[9px] font-bold text-[#8ECAE6] leading-relaxed uppercase tracking-widest">
                    If an outreach is held for continuous days, it should be counted as separate events per day.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveOutreach} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className={labelStyle}>Date of Outreach *</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} /></div>
                  <div><label className={labelStyle}>Executing Assembly *</label><select required value={localAssembly} onChange={e => setLocalAssembly(e.target.value)} className={inputStyle}>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  <div><label className={labelStyle}>Strategy / Type *</label><select required value={outreachType} onChange={e => setOutreachType(e.target.value)} className={inputStyle}><option value="">- Select Type -</option>{outreachTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className={labelStyle}>Target Demographic *</label><select required value={targetDemographic} onChange={e => setTargetDemographic(e.target.value)} className={inputStyle}>{pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                </div>

                <div><label className={labelStyle}>Specific Location / Community *</label><input required type="text" placeholder="e.g. Katanga Market Square" value={location} onChange={e => setLocation(e.target.value)} className={inputStyle} /></div>

                <div className="bg-[#001D3D] p-6 rounded-2xl border border-[#003566] shadow-inner">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mb-5 flex items-center gap-2"><Target size={14}/> Souls Won Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <div>
                      <label className={labelStyle}>Adult Souls Won (COP)</label>
                      <input type="number" min="0" placeholder="0" value={adultSoulsCop} onChange={e => setAdultSoulsCop(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle}>Other Souls Won (Non-COP)</label>
                      <input type="number" min="0" placeholder="0" value={otherSoulsNonCop} onChange={e => setOtherSoulsNonCop(e.target.value)} className={inputStyle} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelStyle}>Gospel Sunday Souls</label>
                      <input type="number" min="0" placeholder="0" value={gospelSundaySouls} onChange={e => setGospelSundaySouls(e.target.value)} className={inputStyle} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelStyle}>Children Won And Retained</label>
                      <input type="number" min="0" placeholder="0" value={childrenWon} onChange={e => setChildrenWon(e.target.value)} className={inputStyle} />
                    </div>
                  </div>
                </div>

                <div><label className={labelStyle}>Testimonies & Notes</label><textarea rows="3" placeholder="Any notable miracles or occurrences?" value={testimonies} onChange={e => setTestimonies(e.target.value)} className={`${inputStyle} resize-none`} /></div>

                <div className="pt-4 border-t border-[#003566] flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-3.5 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Save Outreach Log</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 2: REPORTS ================= */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#000814] rounded-[2rem] border border-[#003566] overflow-hidden shadow-2xl">
                <div className="bg-[#001D3D] border-b border-[#003566] p-6">
                  <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Auto-Generated Report Matrix</h2>
                </div>
                <div className="p-6 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  <div className="bg-[#001D3D] p-5 rounded-2xl border border-[#003566] text-center shadow-inner"><p className="text-[8px] font-black text-[#8ECAE6] uppercase tracking-widest">Programs</p><p className="text-xl font-black text-white mt-1.5">{totalPrograms}</p></div>
                  <div className="bg-[#001D3D] p-5 rounded-2xl border border-[#003566] text-center shadow-inner"><p className="text-[8px] font-black text-[#8ECAE6] uppercase tracking-widest">Adult COP</p><p className="text-xl font-black text-white mt-1.5">{totalAdultCop}</p></div>
                  <div className="bg-[#001D3D] p-5 rounded-2xl border border-[#003566] text-center shadow-inner"><p className="text-[8px] font-black text-[#8ECAE6] uppercase tracking-widest">Other Non-COP</p><p className="text-xl font-black text-white mt-1.5">{totalOtherNonCop}</p></div>
                  <div className="bg-[#001D3D] p-5 rounded-2xl border border-[#003566] text-center shadow-inner"><p className="text-[8px] font-black text-[#8ECAE6] uppercase tracking-widest">Gospel Subset</p><p className="text-xl font-black text-white mt-1.5">{totalGospelSunday}</p></div>
                  <div className="bg-[#001D3D] p-5 rounded-2xl border border-[#003566] text-center shadow-inner"><p className="text-[8px] font-black text-[#8ECAE6] uppercase tracking-widest">Children</p><p className="text-xl font-black text-white mt-1.5">{totalChildren}</p></div>
                  <div className="bg-[#FFC300]/10 p-5 rounded-2xl border border-[#FFC300]/50 text-center shadow-inner"><p className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest">Total Souls</p><p className="text-2xl font-black text-white mt-1.5">{totalAllSouls}</p></div>
                </div>
              </div>

              <div className="bg-[#000814] p-5 rounded-2xl border border-[#003566] grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl">
                <div className="relative"><Search className="absolute left-3 top-3.5 text-white/30" size={14}/><input placeholder="Search locations..." value={searchTermOutreach} onChange={e => setSearchTermOutreach(e.target.value)} className={`${inputStyle} pl-9`} /></div>
                <select value={fDemographic} onChange={e => setFDemographic(e.target.value)} className={inputStyle}><option value="All Categories">All Demographics</option>{pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className={inputStyle}><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] overflow-hidden">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead><tr className="bg-[#001D3D] border-b border-[#003566] text-[9px] font-black text-[#FFC300] uppercase tracking-widest"><th className="p-5">Date</th><th className="p-5">Location & Strategy</th><th className="p-5">Demographic</th><th className="p-5 text-center">Souls Tally</th>{isTier1 && <th className="p-5 text-center">Action</th>}</tr></thead>
                  <tbody className="divide-y divide-[#003566]">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#001D3D]/50 transition-colors">
                        <td className="p-5 font-bold text-white"><CalendarDays size={12} className="inline mr-2 text-[#FFC300]" />{new Date(log.date).toLocaleDateString()}</td>
                        <td className="p-5 font-black text-white text-xs">{log.location}<br/><span className="text-[9px] font-bold text-[#8ECAE6] uppercase tracking-widest mt-1">{log.outreachType}</span></td>
                        <td className="p-5 font-bold text-white/70">{log.targetDemographic}</td>
                        <td className="p-5 text-center">
                          <div className="font-black text-sm text-emerald-400">{log.totalSoulsWon || 0}</div>
                          <div className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                            <span><span className="text-[#FFC300]">COP:</span> {log.adultSoulsCop || 0}</span>
                            <span><span className="text-blue-400">NON-COP:</span> {log.otherSoulsNonCop || 0}</span>
                            <span><span className="text-purple-400">CHIL:</span> {log.childrenWon || 0}</span>
                            {log.gospelSundaySouls > 0 && <span className="text-[#FFC300]/50"> (Gospel: {log.gospelSundaySouls})</span>}
                          </div>
                        </td>
                        {isTier1 && <td className="p-5 text-center"><button onClick={() => triggerDeleteOutreach(log.id, log.location)} className="p-2 text-white/30 hover:text-red-400"><Trash2 size={14}/></button></td>}
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-10 text-center text-[#8ECAE6]/50 font-bold italic text-xs">No outreach records found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: ALTARCONNECT SOULS DASHBOARD ================= */}
          {activeTab === 'souls' && (
            <div className="space-y-6 animate-fade-in">

              {/* STATS ROW */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[#001D3D] p-5 rounded-2xl shadow-xl border border-[#003566] col-span-2 md:col-span-1 shadow-inner">
                  <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">Total Souls</p>
                  <p className="text-2xl font-black text-white mt-1">{altarSouls.length}</p>
                </div>
                <div className="bg-[#FFC300]/10 p-5 rounded-2xl shadow-xl border border-[#FFC300]/30 shadow-inner">
                  <p className="text-[9px] text-[#FFC300] font-black uppercase tracking-widest">Active</p>
                  <p className="text-2xl font-black text-[#FFC300] mt-1">{altarSouls.filter(s => s.follow_up_status === 'active').length}</p>
                </div>
                <div className="bg-purple-500/10 p-5 rounded-2xl shadow-xl border border-purple-500/30 shadow-inner">
                  <p className="text-[9px] text-purple-400 font-black uppercase tracking-widest">Thinking</p>
                  <p className="text-2xl font-black text-purple-400 mt-1">{altarSouls.filter(s => s.follow_up_status === 'thinking').length}</p>
                </div>
                <div className="bg-red-500/10 p-5 rounded-2xl shadow-xl border border-red-500/30 shadow-inner">
                  <p className="text-[9px] text-red-400 font-black uppercase flex items-center gap-1.5 tracking-widest"><AlertTriangle size={12} /> Needs Visit</p>
                  <p className="text-2xl font-black text-red-400 mt-1">{altarSouls.filter(s => s.follow_up_status === 'visitation_needed').length}</p>
                </div>
                <div className="bg-emerald-500/10 p-5 rounded-2xl shadow-xl border border-emerald-500/30 shadow-inner">
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Ready</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{altarSouls.filter(s => s.follow_up_status === 'ready_for_main_system').length}</p>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row justify-between items-center bg-[#000814] p-5 rounded-2xl shadow-xl border border-[#003566] gap-5">
                <div className="flex flex-col sm:flex-row w-full xl:w-1/2 gap-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
                    <input type="text" placeholder="Search by name or phone..." value={searchTermSouls} onChange={(e) => setSearchTermSouls(e.target.value)} className={`${inputStyle} pl-9`} />
                  </div>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputStyle}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active Grounding</option>
                    <option value="thinking">Thinking About It</option>
                    <option value="visitation_needed">Needs Visitation</option>
                    <option value="ready_for_main_system">Ready for Church</option>
                  </select>
                </div>
                
                <div className="flex flex-wrap justify-center xl:justify-end gap-3 w-full xl:w-auto">
                  <button 
                    onClick={() => {
                      if (selectedIds.length === 0) showNotification("info", "Please select at least one soul using the checkboxes.");
                      else setIsBroadcastModalOpen(true);
                    }}
                    className={`flex items-center gap-2 font-black py-3 px-5 rounded-xl transition-all shadow-lg text-[10px] uppercase tracking-widest w-full sm:w-auto justify-center ${selectedIds.length > 0 ? 'bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] animate-pulse' : 'bg-[#001D3D] text-white/30 border border-[#003566]'}`}
                  >
                    <Send size={14} /> BROADCAST {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                  </button>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={downloadTemplate} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#001D3D] hover:bg-[#003566] text-[#8ECAE6] font-black py-3 px-4 rounded-xl transition-colors text-[9px] uppercase tracking-widest border border-[#003566]">
                      <FileText size={14} /> Template
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#001D3D] hover:bg-[#003566] text-[#8ECAE6] font-black py-3 px-4 rounded-xl transition-colors text-[9px] uppercase tracking-widest border border-[#003566]">
                      <Upload size={14} /> Import
                    </button>
                    <button onClick={exportRegistry} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#001D3D] hover:bg-[#003566] text-[#8ECAE6] font-black py-3 px-4 rounded-xl transition-colors text-[9px] uppercase tracking-widest border border-[#003566]">
                      <Download size={14} /> Export
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-[#001D3D] border-b border-[#003566] font-black text-[#FFC300] uppercase tracking-widest text-[9px]">
                    <tr>
                      <th className="p-5 w-12 text-center">
                        <input type="checkbox" className="w-4 h-4 cursor-pointer accent-[#FFC300] rounded" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredSouls.length} />
                      </th>
                      <th className="p-5">Name & Soulwinner</th>
                      <th className="p-5">Direct Contact</th>
                      <th className="p-5">Spiritual Need</th>
                      <th className="p-5 text-center">Day</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]">
                    {filteredSouls.map((soul) => (
                      <tr key={soul.id} className={`transition-colors ${selectedIds.includes(soul.id) ? 'bg-[#FFC300]/10' : 'hover:bg-[#001D3D]/50'}`}>
                        <td className="p-5 text-center">
                          <input type="checkbox" className="w-4 h-4 cursor-pointer accent-[#FFC300] rounded" checked={selectedIds.includes(soul.id)} onChange={() => toggleSelectSoul(soul.id)} />
                        </td>
                        <td className="p-5 cursor-pointer" onClick={() => { setSelectedSoul(soul); setNoteText(soul.pastoral_notes || ""); }}>
                          <div className="flex flex-col">
                            <div className="font-black text-white flex items-center gap-2 text-sm">
                              {soul.full_name} 
                              {soul.pastoral_notes && <Edit3 size={12} className="text-[#8ECAE6]" />}
                            </div>
                            {soul.counselor_name && <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest mt-1">Won by: {soul.counselor_name}</span>}
                          </div>
                        </td>
                        
                        <td className="p-5">
                          <span className="font-mono font-bold text-[#8ECAE6] block mb-2">{soul.phone_number}</span>
                          <div className="flex gap-2">
                            <a href={`tel:${soul.phone_number}`} className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/30" title="Initiate Call Link">
                              <Phone size={12} />
                            </a>
                            <a href={getWhatsAppLink(soul.phone_number)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30" title="Open WhatsApp Window">
                              <MessageCircle size={12} />
                            </a>
                          </div>
                        </td>

                        <td className="p-5">
                          <span className="text-[9px] font-black text-[#FFC300] bg-[#003566] px-2.5 py-1 rounded-lg border border-[#FFC300]/30 uppercase tracking-widest whitespace-nowrap">
                            {soul.spiritual_need || "General Prayer"}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <span className="bg-[#001D3D] text-[#8ECAE6] px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-[#003566]">Day {calculateDay(soul.created_at)}</span>
                        </td>
                        <td className="p-5 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                            soul.follow_up_status === 'active' ? 'bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/30' : 
                            soul.follow_up_status === 'thinking' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 
                            soul.follow_up_status === 'visitation_needed' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {soul.follow_up_status === 'active' ? 'Grounding' : 
                             soul.follow_up_status === 'thinking' ? 'Thinking' : 
                             soul.follow_up_status === 'visitation_needed' ? 'Needs Visit' : 'Ready'}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center justify-center gap-2">
                            {soul.follow_up_status === 'active' || soul.follow_up_status === 'thinking' ? (
                              <div className="flex gap-1.5">
                                {soul.follow_up_status === 'active' && (
                                  <button onClick={(e) => updateStatus(e, soul.id, 'thinking')} disabled={processingId === soul.id} className="bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 px-2 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-black transition-colors">Think</button>
                                )}
                                {soul.follow_up_status === 'thinking' && (
                                  <button onClick={(e) => updateStatus(e, soul.id, 'active')} disabled={processingId === soul.id} className="bg-[#FFC300]/20 hover:bg-[#FFC300]/40 text-[#FFC300] border border-[#FFC300]/30 px-2 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-black transition-colors">Active</button>
                                )}
                                <button onClick={(e) => updateStatus(e, soul.id, 'visitation_needed')} disabled={processingId === soul.id} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 px-2 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-black transition-colors">Visit</button>
                                <button onClick={(e) => updateStatus(e, soul.id, 'ready_for_main_system')} disabled={processingId === soul.id} className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-black transition-colors">Admit</button>
                              </div>
                            ) : soul.follow_up_status === 'visitation_needed' ? (
                              <div className="flex gap-1.5">
                                <button onClick={(e) => updateStatus(e, soul.id, 'ready_for_main_system')} disabled={processingId === soul.id} className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">Admit</button>
                                <button onClick={(e) => updateStatus(e, soul.id, 'active')} disabled={processingId === soul.id} className="bg-[#001D3D] hover:bg-[#003566] text-[#8ECAE6] border border-[#003566] p-1.5 rounded-lg transition-colors"><RotateCcw size={14} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">Church System</span>
                                <button onClick={(e) => updateStatus(e, soul.id, 'active')} disabled={processingId === soul.id} className="text-[#8ECAE6] hover:text-white transition-colors bg-[#001D3D] p-1.5 rounded-lg border border-[#003566]"><RotateCcw size={14} /></button>
                              </div>
                            )}
                            <button onClick={(e) => triggerDelete(e, soul.id)} disabled={processingId === soul.id} className="ml-1 text-red-400 hover:text-white hover:bg-red-500/20 p-1.5 rounded-lg transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSouls.length === 0 && <div className="p-10 text-center text-[#8ECAE6]/50 text-xs font-bold uppercase tracking-widest">No souls match your current search.</div>}
              </div>
            </div>
          )}

          {/* ================= TAB 4: NEW SECURE SOUL REGISTRATION ================= */}
          {activeTab === 'register' && (
            <div className="bg-[#000814] p-8 md:p-10 rounded-[2rem] max-w-2xl mx-auto text-left shadow-2xl border border-[#003566] animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FFC300] to-[#FC8500]"></div>
              
              <div className="flex justify-between items-center mb-8 border-b border-[#003566] pb-4 mt-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#FFC300] flex items-center gap-2"><Flame size={18}/> AltarConnect Engine</h3>
                  <p className="text-[9px] font-bold text-[#8ECAE6]/60 mt-1 uppercase tracking-widest">Register a new soul directly into the network</p>
                </div>
              </div>

              <form onSubmit={handleSoulSubmit} className="space-y-6">
                <div className="relative">
                  <label className={labelStyle}>Soul Winner's Name</label>
                  <UserCheck className="absolute left-4 top-10 h-4 w-4 text-[#FFC300]" />
                  <input required type="text" value={soulData.counselorName} onChange={e => setSoulData({...soulData, counselorName: e.target.value})} className={`${inputStyle} pl-12`} />
                </div>
                
                <div className="relative">
                  <label className={labelStyle}>Soul's Full Name</label>
                  <User className="absolute left-4 top-10 h-4 w-4 text-[#FFC300]" />
                  <input required type="text" placeholder="Enter soul's name" value={soulData.fullName} onChange={e => setSoulData({...soulData, fullName: e.target.value})} className={`${inputStyle} pl-12`} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className={labelStyle}>Phone Number</label>
                    <Phone className="absolute left-4 top-10 h-4 w-4 text-[#FFC300]" />
                    <input required type="tel" placeholder="024XXXXXXX" value={soulData.phone} onChange={e => setSoulData({...soulData, phone: e.target.value})} className={`${inputStyle} pl-12 tracking-widest`} />
                  </div>
                  <div className="relative">
                    <label className={labelStyle}>Gender</label>
                    <Users className="absolute left-4 top-10 h-4 w-4 text-[#FFC300]" />
                    <select required value={soulData.gender} onChange={e => setSoulData({...soulData, gender: e.target.value})} className={`${inputStyle} pl-12`}>
                      <option value="" disabled>- Select Gender -</option>
                      <option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className={labelStyle}>Preferred Language</label>
                    <Globe className="absolute left-4 top-10 h-4 w-4 text-[#FFC300]" />
                    <select required value={soulData.language} onChange={e => setSoulData({...soulData, language: e.target.value})} className={`${inputStyle} pl-12`}>
                      <option value="" disabled>- Language -</option>
                      {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                      <option value="Other" className="text-[#FFC300]">Other (Add new language)</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className={labelStyle}>Spiritual Need</label>
                    <Heart className="absolute left-4 top-10 h-4 w-4 text-[#FFC300]" />
                    <select required value={soulData.category} onChange={e => setSoulData({...soulData, category: e.target.value})} className={`${inputStyle} pl-12`}>
                      <option value="General Prayer">General Prayer</option>
                      <option value="First Time Salvation">First Time Salvation</option>
                      <option value="Deliverance">Deliverance</option>
                      <option value="Financial Breakthrough">Financial Breakthrough</option>
                      <option value="Healing">Physical Healing</option>
                      <option value="Other" className="text-[#FFC300]">Other (Type Specific)</option>
                    </select>
                  </div>
                </div>

                {soulData.language === 'Other' && (
                  <div className="relative animate-fade-in pt-2">
                    <label className={labelStyle}>Specify New Language</label>
                    <input required type="text" placeholder="Type language name..." value={soulData.customLanguage} onChange={e => setSoulData({...soulData, customLanguage: e.target.value})} className={`${inputStyle} pl-4 border-[#FFC300]/50`} />
                  </div>
                )}

                {soulData.category === 'Other' && (
                  <div className="relative animate-fade-in pt-2">
                    <label className={labelStyle}>Specify Spiritual Need</label>
                    <input required type="text" placeholder="Describe the need..." value={soulData.customPrayer} onChange={e => setSoulData({...soulData, customPrayer: e.target.value})} className={`${inputStyle} pl-4 border-[#FFC300]/50`} />
                  </div>
                )}

                <div className="pt-4 border-t border-[#003566] mt-6">
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#FFC300] text-[#000814] text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#FFD60A] transition-all flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : 'Register Soul & Initiate Tracking'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}