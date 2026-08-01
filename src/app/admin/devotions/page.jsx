"use client";
import { useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { BookOpenCheck, Send, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";

export default function AdminDevotionUploader() {
  const [seriesTitle, setSeriesTitle] = useState("THE TWO SONS | MATTHEW 21:31");
  const [themePrayer, setThemePrayer] = useState("Lord Jesus, I repent of my religious lip service. Wash my heart with Your holy blood. Give me the grace to execute Your will through daily action. Be my Lord and Savior. Amen.");
  const [isPublishing, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Default empty structure for Sunday to Saturday
  const [days, setDays] = useState([
    { dayName: "Sun", title: "WEEKLY ANNOUNCEMENT & CHARGE", dateText: "Sunday, August 2, 2026", hook: "", message: "", lesson: "" },
    { dayName: "Mon", title: "THE HONEST REBEL", dateText: "Monday, August 3, 2026", hook: "", message: "", lesson: "" },
    { dayName: "Tue", title: "THE POLITE HYPOCRITE", dateText: "Tuesday, August 4, 2026", hook: "", message: "", lesson: "" },
    { dayName: "Wed", title: "THE FRUIT OF REPENTANCE", dateText: "Wednesday, August 5, 2026", hook: "", message: "", lesson: "" },
    { dayName: "Thu", title: "THE SHOCKING QUEUE", dateText: "Thursday, August 6, 2026", hook: "", message: "", lesson: "" },
    { dayName: "Fri", title: "THE FATHER'S VINEYARD", dateText: "Friday, August 7, 2026", hook: "", message: "", lesson: "" },
    { dayName: "Sat", title: "CONCLUSION: OBEY WITH ACTION", dateText: "Saturday, August 8, 2026", hook: "", message: "", lesson: "" },
  ]);

  const handleDayChange = (index, field, value) => {
    const updatedDays = [...days];
    updatedDays[index][field] = value;
    setDays(updatedDays);
  };

  const handlePublishDevotion = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      // Overwrites the current_week document with the fresh weekly teaching
      await setDoc(doc(db, "devotions", "current_week"), {
        seriesTitle,
        themePrayer,
        days,
        updatedAt: new Date().toISOString(),
      });

      setSuccessMessage("Weekly Devotion successfully published to the public portal!");
    } catch (error) {
      console.error("Error publishing devotion:", error);
      alert("Failed to publish devotion. Check your Firestore admin permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-[#0A0E1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#FF8E00] transition-all";
  const labelStyle = "text-[10px] font-bold text-[#FF8E00] uppercase block mb-1 tracking-wider";

  return (
    <div className="min-h-screen bg-[#03060D] text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="border-b border-white/10 pb-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8ECAE6]">
              District Command Dashboard
            </span>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mt-1">
              Weekly Devotion Publisher
            </h1>
          </div>
          <div className="p-3 bg-[#FF8E00]/10 border border-[#FF8E00]/30 rounded-2xl text-[#FF8E00]">
            <BookOpenCheck size={24} />
          </div>
        </div>

        {/* SUCCESS BANNER */}
        {successMessage && (
          <div className="p-4 bg-[#FF8E00] text-black rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {/* PUBLISHING FORM */}
        <form onSubmit={handlePublishDevotion} className="space-y-8">
          
          {/* GENERAL WEEKLY THEME SETTINGS */}
          <div className="bg-[#0A0E1A]/80 border border-white/10 p-6 rounded-2xl space-y-4">
            <h2 className="text-xs font-black text-[#FF8E00] uppercase tracking-widest border-b border-white/10 pb-2">
              1. Weekly Series Overview
            </h2>
            
            <div>
              <label className={labelStyle}>Weekly Series Title & Reference</label>
              <input 
                type="text" 
                value={seriesTitle} 
                onChange={(e) => setSeriesTitle(e.target.value)} 
                className={inputStyle} 
                required 
              />
            </div>

            <div>
              <label className={labelStyle}>Theme-Specific Sinner's Prayer</label>
              <textarea 
                rows={3} 
                value={themePrayer} 
                onChange={(e) => setThemePrayer(e.target.value)} 
                className={inputStyle} 
                required 
              />
            </div>
          </div>

          {/* 7-DAY LESSON BUILDER */}
          <div className="space-y-6">
            <h2 className="text-xs font-black text-[#FF8E00] uppercase tracking-widest border-b border-white/10 pb-2">
              2. Daily Lessons (Sunday to Saturday)
            </h2>

            {days.map((dayItem, idx) => (
              <div key={dayItem.dayName} className="bg-[#0A0E1A]/40 border border-white/10 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="px-3 py-1 bg-[#FF8E00] text-black font-black text-[10px] uppercase rounded">
                    Day {idx + 1}: {dayItem.dayName}
                  </span>
                  <input 
                    type="text" 
                    value={dayItem.dateText} 
                    onChange={(e) => handleDayChange(idx, "dateText", e.target.value)}
                    className="bg-transparent border-b border-white/20 text-right text-xs text-white/70 focus:outline-none focus:border-[#FF8E00]" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Daily Title</label>
                    <input 
                      type="text" 
                      value={dayItem.title} 
                      onChange={(e) => handleDayChange(idx, "title", e.target.value)} 
                      className={inputStyle} 
                      placeholder="e.g. THE HONEST REBEL"
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>6-Second Evangelical Message</label>
                    <input 
                      type="text" 
                      value={dayItem.message} 
                      onChange={(e) => handleDayChange(idx, "message", e.target.value)} 
                      className={inputStyle} 
                      placeholder="Short evangelistic summary..."
                    />
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Daily Hook / Question</label>
                  <input 
                    type="text" 
                    value={dayItem.hook} 
                    onChange={(e) => handleDayChange(idx, "hook", e.target.value)} 
                    className={inputStyle} 
                    placeholder="Engaging question for the card..."
                  />
                </div>

                <div>
                  <label className={labelStyle}>Full Daily Lesson Text</label>
                  <textarea 
                    rows={4} 
                    value={dayItem.lesson} 
                    onChange={(e) => handleDayChange(idx, "lesson", e.target.value)} 
                    className={inputStyle} 
                    placeholder="Paste the full teaching for this day..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="sticky bottom-6 z-30">
            <button 
              type="submit" 
              disabled={isPublishing}
              className="w-full py-5 bg-gradient-to-r from-[#FF8E00] via-[#FF6A00] to-[#FF8E00] hover:scale-[1.01] text-black font-black uppercase tracking-widest text-sm rounded-2xl shadow-[0_0_40px_rgba(255,142,0,0.4)] transition-all flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Publishing to Kingdom Portal...
                </>
              ) : (
                <>
                  <Send size={18} /> Publish Weekly Devotion Now
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}