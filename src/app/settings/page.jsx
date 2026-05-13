"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Settings, Save, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Building2, UploadCloud } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* LOGO UPLOAD SECTION */}
            <div className="col-span-1 flex flex-col items-center justify-center border-r border-gray-100 pr-0 md:pr-8">
              <h3 className="font-black text-gray-800 mb-6 w-full text-left flex items-center gap-2"><ImageIcon size={18} className="text-slate-500" /> Official Logo</h3>
              
              <div className="w-40 h-40 rounded-full border-4 border-slate-100 shadow-md flex items-center justify-center bg-gray-50 overflow-hidden relative group mb-6">
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
            <div className="col-span-1 md:col-span-2 space-y-6">
              <h3 className="font-black text-gray-800 mb-2 w-full flex items-center gap-2"><Building2 size={18} className="text-slate-500" /> District Identity</h3>
              
              <div>
                <label className="block text-sm font-black text-gray-500 mb-2 uppercase tracking-wider">District Name</label>
                <input 
                  type="text" 
                  required 
                  value={districtName} 
                  onChange={(e) => setDistrictName(e.target.value.toUpperCase())} 
                  className={`${inputStyle} text-lg tracking-wide`} 
                  placeholder="e.g. KETIEJILI"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-500 mb-2 uppercase tracking-wider">System Slogan / Subtitle</label>
                <input 
                  type="text" 
                  required 
                  value={districtSlogan} 
                  onChange={(e) => setDistrictSlogan(e.target.value)} 
                  className={inputStyle} 
                  placeholder="e.g. District Command"
                />
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="mt-8 bg-slate-900 rounded-2xl p-6 flex items-center gap-4 border-l-4 border-blue-500">
                 <img src={logoPreview} alt="Preview" className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover" />
                 <div>
                   <h1 className="font-black text-white leading-tight tracking-tight text-xl">{districtName}</h1>
                   <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">{districtSlogan}</p>
                 </div>
                 <div className="ml-auto text-slate-500 text-xs font-bold uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-lg">
                   Sidebar Preview
                 </div>
              </div>

            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={isSubmitting} className={`px-10 py-4 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-3 text-white ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>
              {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Saving Configuration...</> : <><Save size={20} /> Save Global Settings</>}
            </button>
          </div>

        </form>

      </div>
    </DashboardLayout>
  );
}