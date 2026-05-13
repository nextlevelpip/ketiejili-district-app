"use client";
import { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, Heart, MapPin, Phone, User } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

export default function ConnectKiosk() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assembly, setAssembly] = useState('');
  const [connectionType, setConnectionType] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // --- DYNAMIC ASSEMBLY FETCHING ---
  const [uniqueAssemblies, setUniqueAssemblies] = useState([]);

  useEffect(() => {
    // Fetch existing members just to extract the live assembly names
    const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => doc.data());
      const assemblies = [...new Set(fetchedMembers.map(m => m.localAssembly).filter(Boolean))].sort();
      setUniqueAssemblies(assemblies);
      if (assemblies.length > 0) setAssembly(assemblies[0]); // Default to the first one
    });
    return () => unsub();
  }, []);

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    setPhone(val.slice(0, 10));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'pending_connections'), {
        name,
        phone,
        localAssembly: assembly,
        connectionType,
        notes,
        status: 'Pending',
        timestamp: new Date().toISOString()
      });
      setIsSuccess(true);
    } catch (err) {
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-[30px] shadow-xl text-center max-w-md w-full animate-fade-in border border-gray-100">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4">God Bless You!</h1>
          <p className="text-gray-500 font-bold leading-relaxed mb-8">
            Your connection details have been received by the Ketiejili District leadership. A pastor or leader will reach out to you shortly.
          </p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200 transition-all text-sm w-full">
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = "w-full p-4 pl-12 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl font-bold outline-none transition-all text-gray-800 text-sm";

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col items-center py-10 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-900 rounded-b-[100px] opacity-50"></div>

      {/* BRANDING HEADER */}
      <div className="text-center mb-8 animate-fade-in relative z-10 mt-4">
        <img src="/logo.jpg" alt="Ketiejili Logo" className="w-24 h-24 rounded-full shadow-2xl object-cover mx-auto mb-4 border-4 border-white/20" />
        <h1 className="text-2xl font-black text-white tracking-widest uppercase">Ketiejili District</h1>
        <p className="text-blue-300 font-bold text-sm mt-1">Digital Connect Card</p>
      </div>

      {/* THE FORM */}
      <div className="bg-white p-6 md:p-10 rounded-[32px] shadow-2xl w-full max-w-xl animate-fade-in relative z-10">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 font-bold rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-4 text-gray-400" size={18}/>
              <input required type="text" placeholder="Your Full Name" value={name} onChange={e => setName(e.target.value)} className={inputStyle} />
            </div>

            <div className="relative">
              <Phone className="absolute left-4 top-4 text-gray-400" size={18}/>
              <input required type="tel" placeholder="Phone Number (e.g. 024...)" value={phone} onChange={handlePhoneChange} className={`${inputStyle} tracking-widest`} />
            </div>

            <div className="relative">
              <MapPin className="absolute left-4 top-4 text-gray-400" size={18}/>
              <select required value={assembly} onChange={e => setAssembly(e.target.value)} className={`${inputStyle} appearance-none`}>
                <option value="">- Select Assembly -</option>
                {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="relative">
              <Heart className="absolute left-4 top-4 text-gray-400" size={18}/>
              <select required value={connectionType} onChange={e => setConnectionType(e.target.value)} className={`${inputStyle} appearance-none`}>
                <option value="">- Why are you connecting today? -</option>
                <option value="First-Time Visitor">I am a First-Time Visitor</option>
                <option value="New Convert">I recently gave my life to Christ</option>
                <option value="Update Info">I am a member updating my info</option>
                <option value="Prayer Request">I need Pastoral Prayer</option>
              </select>
            </div>

            <div>
              <textarea 
                placeholder="Any prayer requests or messages for the Pastor? (Optional)" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-2xl font-bold outline-none transition-all text-gray-800 text-sm min-h-[120px] resize-none"
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || uniqueAssemblies.length === 0} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm mt-8">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            {isSubmitting ? 'Sending securely...' : 'Submit Connection'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-blue-300/50 text-[10px] font-black uppercase tracking-widest relative z-10">
        Secured by Ketiejili Command
      </div>
    </div>
  );
}