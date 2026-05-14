"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Settings, Save, Image as ImageIcon, CheckCircle2, AlertCircle, MapPin, Plus, Trash2, Loader2, UploadCloud, Building2, Edit2, Check, X  } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function SystemSettings() {
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- SETTINGS STATES ---
  const [districtName, setDistrictName] = useState('KETIEJILI');
  const [districtSlogan, setDistrictSlogan] = useState('District Command');
  const [logoPreview, setLogoPreview] = useState('/logo.jpg');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
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
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };
// --- ASSEMBLIES MANAGEMENT STATES & LOGIC ---
  const [assemblies, setAssemblies] = useState([]);
  const [newAssembly, setNewAssembly] = useState('');

  // Live wire to Firebase for assemblies
  useEffect(() => {
    const q = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssemblies(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddAssembly = async (e) => {
    e.preventDefault();
    if (!newAssembly.trim()) return;
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'assemblies'), { name: newAssembly.trim() });
      setNewAssembly('');
      showNotification('success', 'Local Assembly added successfully!');
    } catch (error) {
      showNotification('error', 'Failed to add assembly.');
    }
    setIsLoading(false);
  };

  const [editingAssembly, setEditingAssembly] = useState(null);

  const handleUpdateAssembly = async (id) => {
    if (!editingAssembly.name.trim()) return;
    try {
      await updateDoc(doc(db, 'assemblies', id), { name: editingAssembly.name.trim() });
      setEditingAssembly(null);
      showNotification('success', 'Assembly updated!');
    } catch (error) {
      showNotification('error', 'Failed to update assembly.');
    }
  };

  const handleDeleteAssembly = async (id, name) => {
    if (window.confirm(`Remove ${name} from the District list?`)) {
      try {
        await deleteDoc(doc(db, 'assemblies', id));
        showNotification('success', 'Assembly removed.');
      } catch (error) {
        showNotification('error', 'Failed to remove assembly.');
      }
    }
  };

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) { // 1MB limit for optimal database storage
        showNotification('error', 'Image is too large. Please upload a logo smaller than 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result); // Converts image to a Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SAVE SETTINGS ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification({ type: '', message: '' });

    try {
      // Save directly to a master settings document
      await setDoc(doc(db, 'system_settings', 'general'), {
        districtName,
        districtSlogan,
        logoBase64: logoPreview,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      showNotification('success', 'System configurations successfully updated! Refresh to see changes globally.');
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to save settings. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm text-gray-900 shadow-sm font-bold";



  if (isLoading) return (
    <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-slate-400" /></div></DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto relative pb-10">
        
        {/* NOTIFICATION BANNER */}
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-6">
          <div className="bg-slate-800 p-4 rounded-2xl text-slate-100 shadow-lg"><Settings size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">System Settings</h1>
            <p className="font-bold text-gray-500">Configure global application branding and parameters.</p>
          </div>
        </div>
        
         {/* SIDE-BY-SIDE GRID WRAPPER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-6">
          
          {/* 1. ASSEMBLIES MANAGEMENT CARD */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
              <MapPin className="text-emerald-500" size={24} />
              <h2 className="text-xl font-black text-gray-900">Local Assemblies</h2>
            </div>

            <form onSubmit={handleAddAssembly} className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newAssembly}
                onChange={(e) => setNewAssembly(e.target.value)}
                placeholder="e.g. New Town Assembly"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-sm text-gray-800"
                required
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Plus size={18} /> Add
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {assemblies.length === 0 ? (
                <p className="text-center text-sm font-bold text-gray-400 py-4">No assemblies found.</p>
              ) : (
                assemblies.map((assembly) => (
                  <div key={assembly.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                    <span className="font-bold text-gray-700">{assembly.name}</span>
                    <button 
                      type="button"
                      onClick={() => handleDeleteAssembly(assembly.id, assembly.name)}
                      className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. SYSTEM SETTINGS FORM */}
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            
            {/* Note: I changed grid-cols-3 to flex-col because it is now sharing half the screen! */}
            <div className="p-6 flex flex-col gap-8 flex-1">
              
              {/* LOGO UPLOAD SECTION */}
              <div className="flex flex-col items-center justify-center border-b border-gray-100 pb-6">
                <h3 className="font-black text-gray-800 mb-6 w-full text-left flex items-center gap-2"><ImageIcon size={18} className="text-slate-500" /> Official Logo</h3>
                
                <div className="w-40 h-40 rounded-full border-4 border-slate-100 shadow-md flex items-center justify-center bg-gray-50 overflow-hidden relative group mb-4">
                  <img src={logoPreview} alt="District Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <UploadCloud size={28} className="text-white mb-2" />
                    <span className="text-xs font-bold text-white">Change Logo</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-400 text-center px-4">Click the logo above to upload a new PNG or JPG (Max 1MB).</p>
              </div>

              {/* DISTRICT IDENTITY SECTION */}
              <div className="space-y-6">
                <h3 className="font-black text-gray-800 mb-2 w-full flex items-center gap-2"><Building2 size={18} className="text-slate-500" /> District Identity</h3>
                
                <div>
                  <label className="block text-sm font-black text-gray-500 mb-2 uppercase tracking-wider">District Name</label>
                  <input 
                    type="text" required value={districtName} 
                    onChange={(e) => setDistrictName(e.target.value.toUpperCase())} 
                    className={`${inputStyle} text-lg tracking-wide`} 
                    placeholder="e.g. KETIEJILI"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-500 mb-2 uppercase tracking-wider">System Slogan / Subtitle</label>
                  <input 
                    type="text" required value={districtSlogan} 
                    onChange={(e) => setDistrictSlogan(e.target.value)} 
                    className={inputStyle} 
                    placeholder="e.g. District Command"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end mt-auto">
              <button type="submit" disabled={isSubmitting} className={`px-6 py-3 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-3 text-white w-full sm:w-auto ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>
                {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Saving...</> : <><Save size={20} /> Save Settings</>}
              </button>
            </div>

          </form>

        </div>
         
      </div>
    </DashboardLayout>
  );
}