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

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec)
  const inputStyle = "w-full px-4 py-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:text-[#000814] [&>optgroup>option]:text-[#000814]";
  const labelStyle = "block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-xs uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><BookOpen size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">District Heritage</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">The Book of Chronicles for the District.</p>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border flex items-center gap-1.5 ${activeTab === 'timeline' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <History size={12} /> Historical Timeline
              </button>
              <button onClick={() => setActiveTab('roll')} className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border flex items-center gap-1.5 ${activeTab === 'roll' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <Award size={12} /> Ministerial Roll of Honor
              </button>
            </div>
          </div>

          {/* ================= TAB 1: HISTORICAL TIMELINE ================= */}
          {activeTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-1 bg-[#000814] rounded-2xl border border-[#003566] p-6 shadow-xl h-fit sticky top-32">
                <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-6 pb-4 border-b border-[#003566]">
                  <Milestone size={16} className="text-[#FFC300]" /> Record Milestone
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
                  <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center justify-center gap-2 ${isSubmitting ? 'bg-white/10 text-white/50 cursor-not-allowed border border-[#003566]' : 'bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] border border-[#FFC300]'}`}>
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Archive Event</>}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] p-6 md:p-8">
                  {timeline.length === 0 ? (
                    <div className="text-center py-12 text-white/30">
                      <History size={36} className="mx-auto mb-4 opacity-30 text-[#FFC300]" />
                      <p className="font-bold text-xs uppercase tracking-widest">The archives are currently empty.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-[3px] border-[#003566] ml-4 md:ml-6 space-y-6 pb-4">
                      {timeline.map((event) => (
                        <div key={event.id} className="relative pl-6 md:pl-10 group">
                          <div className="absolute -left-[14px] top-1 w-6 h-6 bg-[#000814] rounded-full border-[3px] border-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.4)]"></div>
                          <div className="bg-[#001D3D] border border-[#003566] rounded-xl p-5 hover:border-[#FFC300]/50 transition-all shadow-inner relative">
                            <button onClick={() => handleDelete('heritage_timeline', event.id)} className="absolute top-4 right-4 text-white/30 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                            <span className="inline-block px-3 py-1 bg-[#000814] text-[#FFC300] font-black text-[10px] rounded-lg mb-2 tracking-widest uppercase border border-[#003566]">
                              {event.year}
                            </span>
                            <h3 className="text-sm font-black text-white">{event.title}</h3>
                            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest block mb-2">{event.category}</span>
                            <p className="text-white/70 font-bold text-xs leading-relaxed">{event.description}</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-1 bg-[#000814] rounded-2xl border border-[#003566] p-6 shadow-xl h-fit sticky top-32">
                <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-6 pb-4 border-b border-[#003566]">
                  <UserCheck size={16} className="text-[#FFC300]" /> Induct Minister
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
                  <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center justify-center gap-2 ${isSubmitting ? 'bg-white/10 text-white/50 cursor-not-allowed border border-[#003566]' : 'bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] border border-[#FFC300]'}`}>
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Award size={14} /> Add to Roll</>}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {rollOfHonor.map((minister) => (
                    <div key={minister.id} className="bg-[#000814] rounded-2xl p-6 shadow-xl border border-[#003566] relative overflow-hidden group hover:border-[#FFC300]/50 transition-all">
                      <button onClick={() => handleDelete('heritage_roll', minister.id)} className="absolute top-4 right-4 text-white/30 hover:text-red-400 z-10"><Trash2 size={14} /></button>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.5)]"></div>
                      <Award size={80} className="absolute -bottom-4 -right-4 text-[#FFC300]/5 transform rotate-12 group-hover:scale-110 transition-transform" />
                      
                      <div className="relative z-10 pl-2 flex flex-col h-full">
                        <span className="inline-block px-3 py-1 bg-[#001D3D] text-[#FFC300] font-black text-[9px] uppercase tracking-widest rounded-lg mb-3 border border-[#003566] w-fit">
                          {minister.startYear} — {minister.endYear || 'Present'}
                        </span>
                        <h3 className="text-sm font-black text-white mb-2 leading-tight uppercase tracking-widest">{minister.name}</h3>
                        <p className="text-xs text-white/60 font-bold italic border-l-2 border-[#003566] pl-3 mt-auto">
                          "{minister.achievement || 'Faithfully served the Ketiejili District.'}"
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {rollOfHonor.length === 0 && (
                    <div className="md:col-span-2 text-center py-12 text-white/30 bg-[#000814] rounded-[2rem] border border-[#003566]">
                      <Award size={36} className="mx-auto mb-4 opacity-30 text-[#FFC300]" />
                      <p className="font-bold text-xs uppercase tracking-widest">The Ministerial Roll of Honor is empty.</p>
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