"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { BookOpen, Award, History, Calendar, MapPin, Save, Trash2, CheckCircle2, AlertCircle, Loader2, Milestone, UserCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

export default function DistrictHeritage() {
  const [timeline, setTimeline] = useState([]);
  const [rollOfHonor, setRollOfHonor] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline');

  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- TIMELINE FORM STATES ---
  const [eventYear, setEventYear] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('');

  // --- ROLL OF HONOR FORM STATES ---
  const [ministerName, setMinisterName] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [keyAchievement, setKeyAchievement] = useState('');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const unsubTimeline = onSnapshot(collection(db, 'heritage_timeline'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedEvents.sort((a, b) => parseInt(b.year) - parseInt(a.year)); // Sorted newest to oldest
      setTimeline(fetchedEvents);
    });

    const unsubRoll = onSnapshot(collection(db, 'heritage_roll'), (snapshot) => {
      const fetchedMinisters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMinisters.sort((a, b) => parseInt(b.startYear) - parseInt(a.startYear)); // Sorted newest to oldest
      setRollOfHonor(fetchedMinisters);
      setIsLoading(false);
    });

    return () => { unsubTimeline(); unsubRoll(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handleSaveTimeline = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'heritage_timeline'), {
        year: eventYear,
        title: eventTitle,
        description: eventDescription,
        category: eventCategory,
        timestamp: new Date().toISOString()
      });
      showNotification('success', 'Historical milestone recorded in the archives.');
      setEventYear(''); setEventTitle(''); setEventDescription(''); setEventCategory('');
    } catch (error) {
      showNotification('error', 'Failed to save milestone.');
    } finally { setIsSubmitting(false); }
  };

  const handleSaveMinister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'heritage_roll'), {
        name: ministerName,
        startYear: startYear,
        endYear: endYear || 'Present',
        achievement: keyAchievement,
        timestamp: new Date().toISOString()
      });
      showNotification('success', 'Minister added to the Roll of Honor.');
      setMinisterName(''); setStartYear(''); setEndYear(''); setKeyAchievement('');
    } catch (error) {
      showNotification('error', 'Failed to save minister record.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (collectionName, id) => {
    if (window.confirm('Are you sure you want to permanently delete this historical record?')) {
      await deleteDoc(doc(db, collectionName, id));
      showNotification('success', 'Record permanently removed from archives.');
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:bg-black/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all text-sm text-white placeholder:text-amber-200/40 shadow-sm font-bold [&>option]:text-gray-900";
  const labelStyle = "block text-[10px] font-black text-amber-200 uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-amber-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* HERITAGE AMBER GRADIENT WRAPPER */}
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#451a03] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 space-y-8 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><BookOpen size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">District Heritage</h1>
              <p className="font-bold text-amber-200">The Book of Chronicles for the Ketiejili District</p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button onClick={() => setActiveTab('timeline')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border backdrop-blur-md ${activeTab === 'timeline' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-amber-200 border-white/10 hover:bg-white/10'}`}>
              <History size={18} /> Historical Timeline
            </button>
            <button onClick={() => setActiveTab('roll')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border backdrop-blur-md ${activeTab === 'roll' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-amber-200 border-white/10 hover:bg-white/10'}`}>
              <Award size={18} /> Ministerial Roll of Honor
            </button>
          </div>

          {/* ================= TAB 1: HISTORICAL TIMELINE ================= */}
          {activeTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 shadow-xl h-fit sticky top-6">
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2 mb-6">
                  <Milestone size={20} className="text-amber-300" /> Record Milestone
                </h2>
                <form onSubmit={handleSaveTimeline} className="space-y-5">
                  <div>
                    <label className={labelStyle}>Year *</label>
                    <input required type="number" placeholder="e.g. 2010" value={eventYear} onChange={e => setEventYear(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Category *</label>
                    <select required value={eventCategory} onChange={e => setEventCategory(e.target.value)} className={inputStyle}>
                      <option value="">- Select -</option>
                      <option value="District Creation">District Creation</option>
                      <option value="Assembly Founded">Local Assembly Founded</option>
                      <option value="Building Dedication">Building Dedication</option>
                      <option value="Major Crusade">Major Crusade</option>
                      <option value="Other Milestone">Other Milestone</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Headline / Title *</label>
                    <input required type="text" placeholder="e.g. Central Assembly Dedication" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Historical Details</label>
                    <textarea rows="3" placeholder="Brief description of the event..." value={eventDescription} onChange={e => setEventDescription(e.target.value)} className={`${inputStyle} resize-none`}></textarea>
                  </div>
                  <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white border border-white/20 ${isSubmitting ? 'bg-white/10' : 'bg-[#d97706] hover:bg-[#b45309]'}`}>
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Archive Event</>}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 p-8">
                  {timeline.length === 0 ? (
                    <div className="text-center py-12 text-amber-200/50">
                      <History size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">The archives are currently empty.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-4 border-amber-500/30 ml-4 md:ml-6 space-y-8 pb-4">
                      {timeline.map((event) => (
                        <div key={event.id} className="relative pl-8 md:pl-10 group">
                          <div className="absolute -left-[18px] top-1 w-8 h-8 bg-amber-500 rounded-full border-4 border-[#78350f] shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                          <div className="bg-black/20 border border-white/5 rounded-2xl p-6 hover:bg-white/5 transition-all shadow-inner">
                            <button onClick={() => handleDelete('heritage_timeline', event.id)} className="absolute top-4 right-4 text-white/30 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 font-black text-sm rounded-lg mb-2 tracking-wider border border-amber-500/30">
                              {event.year}
                            </span>
                            <h3 className="text-xl font-black text-white">{event.title}</h3>
                            <span className="text-[10px] font-black text-amber-200/70 uppercase tracking-widest block mb-3">{event.category}</span>
                            <p className="text-amber-50 font-medium text-sm leading-relaxed">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: MINISTERIAL ROLL OF HONOR ================= */}
          {activeTab === 'roll' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 shadow-xl h-fit sticky top-6">
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2 mb-6">
                  <UserCheck size={20} className="text-amber-300" /> Induct Minister
                </h2>
                <form onSubmit={handleSaveMinister} className="space-y-5">
                  <div>
                    <label className={labelStyle}>Full Name & Title *</label>
                    <input required type="text" placeholder="e.g. Pastor John Doe" value={ministerName} onChange={e => setMinisterName(e.target.value)} className={inputStyle} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyle}>Start Year *</label>
                      <input required type="number" placeholder="YYYY" value={startYear} onChange={e => setStartYear(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle}>End Year</label>
                      <input type="text" placeholder="Leave blank if current" value={endYear} onChange={e => setEndYear(e.target.value)} className={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Key Legacy / Achievement</label>
                    <textarea rows="3" placeholder="e.g. Pioneered 3 new assemblies..." value={keyAchievement} onChange={e => setKeyAchievement(e.target.value)} className={`${inputStyle} resize-none`}></textarea>
                  </div>
                  <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white border border-white/20 ${isSubmitting ? 'bg-white/10' : 'bg-[#d97706] hover:bg-[#b45309]'}`}>
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Award size={18} /> Add to Roll</>}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rollOfHonor.map((minister) => (
                    <div key={minister.id} className="bg-black/20 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/5 relative overflow-hidden group hover:bg-white/5 transition-all">
                      <button onClick={() => handleDelete('heritage_roll', minister.id)} className="absolute top-4 right-4 text-white/30 hover:text-red-400 z-10"><Trash2 size={16} /></button>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                      <Award size={100} className="absolute -bottom-4 -right-4 text-amber-500/10 transform rotate-12 group-hover:scale-110 transition-transform" />
                      
                      <div className="relative z-10 pl-2">
                        <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-200 font-black text-[10px] uppercase tracking-widest rounded-lg mb-3 border border-amber-500/30">
                          {minister.startYear} — {minister.endYear || 'Present'}
                        </span>
                        <h3 className="text-xl font-black text-white mb-2 leading-tight">{minister.name}</h3>
                        <p className="text-sm text-amber-100/70 font-medium italic border-l-2 border-amber-500/50 pl-3 mt-4">
                          "{minister.achievement || 'Faithfully served the Ketiejili District.'}"
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {rollOfHonor.length === 0 && (
                    <div className="md:col-span-2 text-center py-12 text-amber-200/40 bg-white/5 rounded-[2rem] border border-white/5">
                      <Award size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">The Ministerial Roll of Honor is empty.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}