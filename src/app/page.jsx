"use client";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from './firebase'; 
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { 
  Flame, UserCheck, Loader2, CheckCircle2, AlertCircle, Sparkles, 
  Phone, MapPin, Heart, Globe, Users, User, Shield, 
  ArrowLeft, Calendar, BookOpen, Clock, ChevronRight, Zap, 
  BookOpenCheck, X, Share2, MessageSquare, ThumbsUp, Send
} from 'lucide-react';

export default function PublicGateway() {
  const router = useRouter();
 
  // --- SUPABASE ENGINE CONNECTION ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
  const supabase = createClient(supabaseUrl, supabaseKey);  
 
  // --- SYSTEM STATES ---
  const [activeForm, setActiveForm] = useState(null);
  const [activeDevotionModal, setActiveDevotionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [successPopup, setSuccessPopup] = useState(false);
  const [assemblies, setAssemblies] = useState([]);
  const [languageMode, setLanguageMode] = useState('EN');
  
  // --- DYNAMIC SETTINGS & ACTIVITIES STATES ---
  const [areaName, setAreaName] = useState('Kete-Krachi Area'); 
  const [districtName, setDistrictName] = useState('Katiejeli District');
  const [districtSlogan, setDistrictSlogan] = useState('Possessing the Nations: Transforming our World.');
  const [pastorContact, setPastorContact] = useState('+233 54 143 7815 / +233 20 409 2129');
  const [logoBase64, setLogoBase64] = useState('/logo.jpg');
  const [schedules, setSchedules] = useState([]);

  // --- DEVOTION ENGAGEMENT STATES ---
  // Index 6 lands directly on Saturday, August 1, 2026 (Conclusion of Week 31)
  const [selectedDayIndex, setSelectedDayIndex] = useState(6); 
  const [likesCount, setLikesCount] = useState(124);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentsList, setCommentsList] = useState([
    { id: 1, name: "Elder Samuel", text: "Amen! True obedience is shown in our daily labor.", time: "2h ago" },
    { id: 2, name: "Sister Grace", text: "Lord, help me to work faithfully in Your vineyard today.", time: "1h ago" }
  ]);

  // --- ALTARCONNECT SOUL FORM STATE ---
  const [soulData, setSoulData] = useState({
    counselorName: '', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: ''
  });
  const availableLanguages = ["English", "Twi", "Konkomba", "Ga", "Ewe"];

  // --- WEEKLY DEVOTION STATE (FULL MULTI-PARAGRAPH LESSONS RESTORED) ---
  const [weeklyDevotion, setWeeklyDevotion] = useState({
    seriesTitle: "THE TWO SONS | MATTHEW 21:31",
    themePrayer: "Lord Jesus, I repent of my religious lip service. I have spoken polite words while my heart remained far from Your vineyard. I have promised obedience but failed to act. Today, I turn away from my rebellion. I drop my empty promises. Wash my heart with Your holy blood. Give me the grace to execute Your will through daily action. Be my Lord and Savior. Amen.",
    days: [
      {
        dayName: "Sun",
        title: "WEEKLY ANNOUNCEMENT & CHARGE",
        dateText: "Sunday, July 26, 2026",
        hook: "Are you honoring God with your lips while your hands refuse to work in His field?",
        message: "Polite religious promises will not save your soul. Jesus demands your wholehearted obedience. Surrender to Him today.",
        lesson: `My dear friend, are you honoring God with your lips while your hands refuse to work in His field?

Jesus told a sharp story to religious leaders who loved polite speech. A father went to his first son and commanded him to work in the vineyard. The son answered bluntly, "I will not." But afterward, he changed his mind and went. The father went to the second son and gave the same command. That son answered politely, "I go, sir." But he never went.

Jesus asked which of the two did the will of his father. They answered correctly that the first son obeyed. Jesus then delivered a devastating verdict. He said that corrupt tax collectors and prostitutes were entering the Kingdom of God ahead of respectable religious leaders. The outcasts repented and obeyed. The leaders offered pious words but refused to change.

My brethren, this is the parable of Action Versus Words. In our communities, we respect the polished speech of the elder and the assemblyman. We judge the rough past of the common laborer. But God does not measure your faith by your religious vocabulary. He measures your faith by your actual obedience. Take courage today. Stop relying on polite promises and start working in the Father's field.

CALL TO ACTION: Do not let polite words replace your obedience this week. Declare together, "We will obey with our actions!"`
      },
      {
        dayName: "Mon",
        title: "THE HONEST REBEL",
        dateText: "Monday, July 27, 2026",
        hook: "Is your past rebellion keeping you from believing that God can use your hands today?",
        message: "Your past rebellion is no match for the cleansing blood of Jesus. Turn around and enter His vineyard today.",
        lesson: `Jesus said, "A man had two sons. And he went to the first and said, 'Son, go and work in the vineyard today.' And he answered, 'I will not,' but afterward he changed his mind and went."

My brethren, look closely at the first son. His initial response was disrespectful and rebellious. He told his father to his face that he would not work. But later, genuine regret pierced his heart. He repented. He picked up his tools and walked into the field.

We see this transformation in our communities today. There are men and women who once lived in open rebellion against God. They were known sinners. Yet when the Gospel pierced their hearts, they did not just shed tears. They changed their direction. Sola Scriptura teaches us that how you finish is far more important than how you start. God honors the repentant rebel who turns his life around through action.

True repentance is measured by your footsteps.

APPLICATION: Do not let the shame of your past rebellion paralyze you. If you have been running away from God's call, change your mind today. Step into your local church or community square and perform a practical act of service.`
      },
      {
        dayName: "Tue",
        title: "THE POLITE HYPOCRITE",
        dateText: "Tuesday, July 28, 2026",
        hook: "Are you hiding your disobedience behind polite religious vocabulary?",
        message: "Saying 'Lord, Lord' will not open the gates of heaven. You must do the will of the Father. Surrender today.",
        lesson: `And he went to the other son and said the same. And he answered, "I go, sir," but did not go.

My dear friend, look at the terrible deception of the second son. His words were perfectly respectful. He called his father "sir." He gave an immediate, willing promise to obey. Yet his feet never moved toward the vineyard. He was a master of polite disobedience.

This hypocrisy is common in our communities. We love to sound holy at church meetings. We say "Amen" to every sermon. We promise to pray, to give, and to serve our neighbors. Yet when Monday arrives, we do absolutely nothing. Sola Scriptura exposes this trap. God is not impressed by polite titles or religious etiquette. Unfulfilled promises are a mockery of His authority.

Polite rebellion is still rebellion.

APPLICATION: Check your recent commitments today. Did you promise to help a neighbor or support a community project without following through? Do not make another empty promise. Go and fulfill your word before nightfall.`
      },
      {
        dayName: "Wed",
        title: "THE FRUIT OF REPENTANCE",
        dateText: "Wednesday, July 29, 2026",
        hook: "What visible proof exists in your community that your heart has truly changed?",
        message: "A changed heart always produces a changed lifestyle. Trust Jesus today and let His love transform your actions.",
        lesson: `Jesus asked, "Which of the two did the will of his father?" They said, "The first."

My brethren, look at the clear standard of Jesus Christ. The will of the Father is not a sentiment. It is an action. The first son proved his repentance by walking into the field and working the soil. His repentance produced visible, agricultural fruit.

In our communities, many people claim they have repented. Yet they still cheat in their shops. They still slander their neighbors. Sola Scriptura declares that faith without works is completely dead. John the Baptist commanded us to bear fruit in keeping with repentance. When your heart truly turns to God, your hands will automatically begin to serve your community.

Real change leaves a visible trail of service.

APPLICATION: Examine your daily habits today. Find one practical way to demonstrate your faith in your neighborhood. Help an elderly neighbor with her load. Clean a public path. Let your changed heart produce visible fruit.`
      },
      {
        dayName: "Thu",
        title: "THE SHOCKING QUEUE",
        dateText: "Thursday, July 30, 2026",
        hook: "Why are despised outcasts entering the Kingdom of God ahead of religious leaders?",
        message: "No sin is too dark for the blood of Jesus. Drop your pride, believe His Word, and enter His Kingdom today.",
        lesson: `Jesus said to them, "Truly, I say to you, the tax collectors and the prostitutes go into the kingdom of God before you. For John came to you in the way of righteousness, and you did not believe him, but the tax collectors and the prostitutes believed him."

My dear friend, this statement shocked the religious elite to their core. In Jewish society, tax collectors and prostitutes were at the absolute bottom. Yet Jesus declared they were entering the Kingdom first. Why? Because when they heard the call to repent, they believed and changed their lives.

In our communities, we often despise the broken. We look down on the drunkard or the struggling laborer. Yet when they hear the Gospel, they drop their pride and obey. Sola Scriptura warns proud churchgoers. If you refuse to humble your heart and repent, God will promote the repentant outcast over you.

Humility opens the door that religious pride locks.

APPLICATION: Examine your attitude toward the outcasts in your community today. Stop judging them. Pray for their salvation, and remember that God's grace is equally available to every broken soul.`
      },
      {
        dayName: "Fri",
        title: "THE FATHER'S VINEYARD",
        dateText: "Friday, July 31, 2026",
        hook: "Where is the vineyard God is commanding you to cultivate today?",
        message: "You were created to serve the King of Glory. Leave your selfish pursuits and work in His harvest field today.",
        lesson: `The father's instruction was clear and specific. "Son, go and work in the vineyard today."

My brethren, look at three key words in this command. First, go. It requires initiative. Second, work. It requires effort and sweat. Third, today. It requires immediate urgency. The father did not ask his son to sit and debate agricultural theory. He commanded him to labor in the field.

Your rural community is the Father's vineyard. Your local church, your family, and your marketplace are the rows of vines where God has planted you. Sola Scriptura demands that we stop delaying our service. Do not wait for a special title or an easier season. Step into your community today and cultivate peace, justice, and the Gospel of Christ.

The vineyard needs workers, not spectators.

APPLICATION: Identify one neglected area in your local church or community today. Do not wait for an invitation. Pick up your tools, show up, and put in an hour of hard, honest service for God's glory.`
      },
      {
        dayName: "Sat",
        title: "CONCLUSION: OBEY WITH ACTION",
        dateText: "Saturday, August 1, 2026",
        hook: "My brethren, will your life be remembered for polite speech or faithful labor?",
        message: "You cannot satisfy God with polite vocabulary. Unfulfilled religious promises are empty hypocrisy. God honors the repentant rebel who goes to work.",
        lesson: `My brethren, will your life be remembered for polite speech or faithful labor?

This week, we confronted our religious lip service through The Parable of the Two Sons. Let us establish this absolute reality. You cannot satisfy the Father with polite vocabulary and unfulfilled promises. The second son said, "I go, sir," yet he never stepped into the vines. His respectful words were empty hypocrisy.

God honors the repentant rebel who changes his mind and moves his feet. The first son bluntly refused, but genuine sorrow brought him into the field. His obedient labor erased his verbal defiance.

In our communities, we must stop judging people by their polished speech or their past mistakes. God looks at who is working in His vineyard today. Drop your empty excuses. Step into your community with humble, hardworking obedience. Let your actions prove that you love the Father.

CALL TO ACTION: Audit your promises this weekend. Have you been talking about faith while neglecting service? Repent of your passivity. Step into church tomorrow ready to back up your worship with practical, obedient labor.`
      }
    ]
  });

  // --- OFFICIAL 8 THEMATIC TOPICS ---
  const thematicTopics = [
    { num: "01", title: "Spiritual Living in a Secular World", desc: "Lessons from the Exploits of Daniel in a Pagan World." },
    { num: "02", title: "My Job, My Kingdom Assignment", desc: "Authenticating Conversion into Credible Testimony in the Public Sphere." },
    { num: "03", title: "Raising Spirit-Filled Disciples", desc: "The Role of The Local Church in the Unleashing Agenda." },
    { num: "04", title: "Baptism & Infilling of the Holy Spirit", desc: "Divine Sources of Strength and Empowerment." },
    { num: "05", title: "Living in Anticipation of Christ", desc: "The Second Coming as Motivation for the Agenda." },
    { num: "06", title: "Sharing the Love of Christ", desc: "Members Serving Beyond the Church Walls." },
    { num: "07", title: "The Godly Home", desc: "Raising God-Fearing Families to Strengthen the Church." },
    { num: "08", title: "Prayer and Fasting", desc: "Engaging Divine Power for National Transformation." }
  ];

  useEffect(() => {
    // 1. FETCH GENERAL SETTINGS OUTSIDE THE CODE
    const unsubSettings = onSnapshot(
      doc(db, 'system_settings', 'general'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.areaName) setAreaName(data.areaName); 
          if (data.districtName) setDistrictName(data.districtName);
          if (data.districtSlogan) setDistrictSlogan(data.districtSlogan);
          if (data.pastorContact) setPastorContact(data.pastorContact);
          if (data.logoBase64) setLogoBase64(data.logoBase64);
        }
      },
      (error) => console.log("Settings snapshot notice:", error.message)
    );

    // 2. FETCH ACTIVE WEEKLY DEVOTION OUTSIDE THE CODE FROM FIRESTORE
    const unsubDevotion = onSnapshot(
      doc(db, 'devotions', 'current_week'),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().days) {
          setWeeklyDevotion(docSnap.data());
        }
      },
      (error) => console.log("Using default weekly devotion fallback.", error.message)
    );

    // 3. FETCH ASSEMBLIES
    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(
      qAssem, 
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => doc.data().name);
          setAssemblies(fetched);
        }
      },
      (error) => console.log("Assemblies snapshot notice:", error.message)
    );

    // 4. FETCH SCHEDULES
    const defaultSchedules = [
      { id: '1', day: 'Sundays', time: '8:00 AM - 10:30 AM', event: 'Divine Encounter Worship Service', tag: 'Featured Today' },
      { id: '2', day: 'Tuesdays', time: '6:30 PM - 8:00 PM', event: 'District Bible Study & Discipleship', tag: 'Midweek' },
      { id: '3', day: 'Fridays', time: '7:00 PM - 9:00 PM', event: 'Atmosphere of Miracle Prayer Service', tag: 'Prayer' },
      { id: '4', day: 'Saturdays', time: '4:00 PM - 6:00 PM', event: 'Evangelistic Outreach & Follow-up', tag: 'Outreach' }
    ];

    const qSchedules = query(collection(db, 'scheduled_activities'), orderBy('order', 'asc'));
    const unsubSchedules = onSnapshot(
      qSchedules, 
      (snapshot) => {
        if (!snapshot.empty) {
          setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setSchedules(defaultSchedules);
        }
      },
      (error) => {
        console.log("Schedules snapshot fallback:", error.message);
        setSchedules(defaultSchedules);
      }
    );

    return () => { unsubSettings(); unsubDevotion(); unsubAssem(); unsubSchedules(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handlePhoneFormat = (phoneVal) => {
    let val = phoneVal.replace(/\D/g, ''); 
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    return val.slice(0, 10);
  };

  // --- LIKE ACTION ---
  const handleLikeToggle = () => {
    if (!hasLiked) {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
      showNotification('success', 'You blessed this devotion!');
    } else {
      setLikesCount(prev => prev - 1);
      setHasLiked(false);
    }
  };

  // --- SHARE ACTION ---
  const handleShare = () => {
    const activeDay = weeklyDevotion.days[selectedDayIndex];
    const shareData = {
      title: `${activeDay.title} | ${weeklyDevotion.seriesTitle}`,
      text: `Read today's devotion from ${districtName}: "${activeDay.hook}"`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification('info', 'Devotion link copied to clipboard!');
    }
  };

  // --- COMMENT SUBMIT ---
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      name: "Kingdom Visitor",
      text: commentText,
      time: "Just now"
    };

    setCommentsList([newComment, ...commentsList]);
    setCommentText("");
    showNotification('success', 'Your comment has been posted!');
  };

  // --- SUBMIT ALTARCONNECT SOUL ---
  const handleSoulSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const cleanPhone = soulData.phone;
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      showNotification('error', 'Phone number must be exactly 10 digits starting with 0.');
      setIsSubmitting(false);
      return;
    }
    
    const finalSpiritualNeed = soulData.category === "Other" ? soulData.customPrayer : soulData.category;

    try {
      const { error } = await supabase.from('souls').insert([{
        counselor_name: soulData.counselorName || "Digital Gateway",
        full_name: soulData.fullName,
        phone_number: cleanPhone,
        gender: soulData.gender,
        language: soulData.language || "English",
        spiritual_need: finalSpiritualNeed,
        current_day: 1,
        follow_up_status: "active"
      }]);

      if (error) throw error;
      
      setSoulData({ counselorName: '', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: '' });
      setActiveForm(null);
      setSuccessPopup(true); 
    } catch (err) {
      console.error("Submission Error: ", err);
      showNotification('error', 'Submission failure. Check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDayData = weeklyDevotion.days[selectedDayIndex] || weeklyDevotion.days[0];

  const inputStyle = "w-full pl-11 pr-4 py-3.5 bg-[#0A0D18] border border-white/10 rounded-xl font-medium text-xs text-white outline-none focus:border-[#FF8E00] transition-all placeholder:text-white/30";
  const labelStyle = "text-[10px] font-bold text-[#FF8E00] uppercase ml-1 mb-1.5 block tracking-wider";
  const iconStyle = "absolute left-3.5 top-3.5 h-4 w-4 text-[#FF8E00]";

  return (
    <div className="min-h-screen bg-[#03060D] flex flex-col relative overflow-x-hidden text-white font-sans selection:bg-[#FF8E00] selection:text-black">
      
      {/* AMBIENT GLOW LIGHTS IN THE BACKGROUND */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-[#FF8E00]/20 via-[#FF5E00]/10 to-transparent blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* PASTORAL MARQUEE BAR */}
      <div className="bg-gradient-to-r from-[#FF8E00] to-[#FFB800] text-[#03060D] py-1.5 overflow-hidden z-50 shrink-0 font-extrabold shadow-md">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-12 text-[10px] uppercase tracking-widest">
          <span><Phone size={11} className="inline mr-1.5 -mt-0.5"/> For Prayers & Counseling, Contact the District Minister: {pastorContact}</span>
          <span><Sparkles size={11} className="inline mr-1.5 -mt-0.5"/> God richly bless you for visiting the District Portal</span>
          <span><Phone size={11} className="inline mr-1.5 -mt-0.5"/> For Prayers & Counseling, Contact the District Minister: {pastorContact}</span>
          <span><Sparkles size={11} className="inline mr-1.5 -mt-0.5"/> God richly bless you for visiting the District Portal</span>
        </div>
      </div>

      {/* SLEEK SAAS NAVIGATION HEADER WITH LARGE CENTERED LOGO & DISTRICT IDENTITY */}
      <header className="px-4 md:px-10 py-3 flex items-center justify-between z-40 bg-[#03060D]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 gap-2">
        
        {/* LEFT: MINIMIZED ALTARCONNECT BRANDING */}
        <div className="flex items-center gap-2 shrink-0">
          <img 
            src="/altarconnect-logo.png" 
            alt="AltarConnect Engine" 
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow-[0_0_12px_rgba(255,142,0,0.4)]"
            onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=COP&background=03060D&color=FF8E00'; }}
          />
          <div className="hidden md:block">
            <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">AltarConnect</h2>
            <p className="text-[8px] font-bold text-[#FF8E00] uppercase tracking-widest mt-0.5">Kingdom Portal</p>
          </div>
        </div>

        {/* MIDDLE: PROMINENT LARGE CHURCH LOGO & DISTRICT HEADER BADGE */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 px-3 sm:px-5 py-1.5 sm:py-2 bg-white/[0.04] border border-white/15 rounded-2xl shadow-[0_0_25px_rgba(255,142,0,0.18)] hover:border-[#FF8E00]/50 transition-all">
          <img 
            src={logoBase64} 
            alt="Church of Pentecost Logo" 
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-[#FF8E00] shadow-[0_0_15px_rgba(255,142,0,0.5)] object-cover bg-[#03060D] shrink-0"
            onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=COP&background=03060D&color=FF8E00'; }}
          />
          <div className="flex flex-col items-start justify-center text-left">
            <h1 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-white drop-shadow-md leading-none">
              {districtName}
            </h1>
            <div className="inline-flex items-center gap-1.5 text-[9px] sm:text-[11px] font-bold text-[#FF8E00] uppercase tracking-widest mt-1">
              <MapPin size={11} className="text-[#FF8E00] shrink-0" /> 
              <span>11 Local Assemblies</span>
              <span className="text-white/40 hidden sm:inline">•</span>
              <span className="text-white/70 hidden sm:inline">The Church of Pentecost</span>
            </div>
          </div>
        </div>

        {/* RIGHT: COMPACT / MINIMIZED ACTION BUTTONS FOR MOBILE */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button 
            onClick={() => setActiveForm('soul')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#FF8E00] to-[#FF6A00] text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,142,0,0.3)] hover:scale-105"
            title="Register a Soul"
          >
            <Flame size={13} className="fill-current" />
            <span className="hidden lg:inline">Register Soul</span>
          </button>

          <button 
            onClick={() => router.push('/connect')} 
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
            title="Update Member Info"
          >
            <UserCheck size={13} className="text-[#8ECAE6]" />
            <span className="hidden xl:inline">Update Info</span>
          </button>

          <button 
            onClick={() => router.push('/login')} 
            className="flex items-center gap-1.5 bg-[#0A0E1A] hover:bg-[#11172A] border border-[#FF8E00]/40 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
            title="Sign In"
          >
            <Shield size={13} className="text-[#FF8E00]" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        </div>
      </header>

      {/* GLOBAL NOTIFICATIONS */}
      {notification.message && (
        <div className={`fixed top-20 right-6 z-[99999] px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${
          notification.type === 'success' ? 'bg-[#FF8E00] text-black' : 
          notification.type === 'info' ? 'bg-[#8ECAE6] text-black' : 
          'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          {notification.message}
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-[#0A0E1A] rounded-3xl shadow-2xl w-full max-w-md border border-white/10 text-center p-8">
            <div className="w-16 h-16 bg-[#FF8E00]/10 border border-[#FF8E00]/30 rounded-full flex items-center justify-center mx-auto mb-5 text-[#FF8E00]">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Soul Registered</h2>
            <p className="text-xs font-medium text-white/80 leading-relaxed mb-6">
              The soul has been securely logged into the AltarConnect Engine for automated discipleship follow-up.
            </p>
            <div className="bg-[#03060D] p-5 rounded-2xl border border-white/10 mb-6">
              <p className="text-[10px] font-bold text-[#FF8E00] uppercase tracking-widest mb-2">Pastoral Office Contact</p>
              <div className="flex items-center justify-center gap-2 text-base font-black text-white font-mono">
                <Phone size={16} className="text-[#FF8E00]" /> {pastorContact}
              </div>
            </div>
            <button 
              onClick={() => setSuccessPopup(false)}
              className="w-full bg-gradient-to-r from-[#FF8E00] to-[#FF6A00] text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* SOUL REGISTRATION MODAL */}
      {activeForm === 'soul' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[90] animate-fade-in overflow-y-auto">
          <div className="bg-[#0A0E1A] border border-white/10 p-8 md:p-10 rounded-3xl max-w-xl w-full text-left shadow-2xl relative my-auto">
            <button 
              onClick={() => setActiveForm(null)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8ECAE6] hover:text-[#FF8E00] transition-colors mb-6"
            >
              <ArrowLeft size={15} /> Close Registration
            </button>

            <div className="mb-6 border-b border-white/10 pb-4">
              <h3 className="text-base font-black uppercase tracking-widest text-[#FF8E00] flex items-center gap-2"><Flame size={20}/> AltarConnect Engine</h3>
              <p className="text-xs font-medium text-white/70 mt-1">Register new convert for automated discipleship</p>
            </div>

            <form onSubmit={handleSoulSubmit} className="space-y-4">
              <div className="relative">
                <label className={labelStyle}>Soul Winner's Name</label>
                <UserCheck className={iconStyle} />
                <input required type="text" placeholder="Who is registering this soul?" value={soulData.counselorName} onChange={e => setSoulData({...soulData, counselorName: e.target.value})} className={inputStyle} />
              </div>
              
              <div className="relative">
                <label className={labelStyle}>Soul's Full Name</label>
                <User className={iconStyle} />
                <input required type="text" placeholder="Enter soul's name" value={soulData.fullName} onChange={e => setSoulData({...soulData, fullName: e.target.value})} className={inputStyle} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className={labelStyle}>Phone Number</label>
                  <Phone className={iconStyle} />
                  <input required type="tel" placeholder="024XXXXXXX" value={soulData.phone} onChange={e => setSoulData({...soulData, phone: handlePhoneFormat(e.target.value)})} className={inputStyle} />
                </div>
                <div className="relative">
                  <label className={labelStyle}>Gender</label>
                  <Users className={iconStyle} />
                  <select required value={soulData.gender} onChange={e => setSoulData({...soulData, gender: e.target.value})} className={inputStyle}>
                    <option value="" disabled>- Select Gender -</option>
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className={labelStyle}>Preferred Language</label>
                  <Globe className={iconStyle} />
                  <select required value={soulData.language} onChange={e => setSoulData({...soulData, language: e.target.value})} className={inputStyle}>
                    <option value="" disabled>- Language -</option>
                    {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <label className={labelStyle}>Spiritual Need</label>
                  <Heart className={iconStyle} />
                  <select required value={soulData.category} onChange={e => setSoulData({...soulData, category: e.target.value})} className={inputStyle}>
                    <option value="General Prayer">General Prayer</option>
                    <option value="First Time Salvation">First Time Salvation</option>
                    <option value="Deliverance">Deliverance</option>
                    <option value="Financial Breakthrough">Financial Breakthrough</option>
                    <option value="Healing">Physical Healing</option>
                    <option value="Other">Other (Type Specific)</option>
                  </select>
                </div>
              </div>

              {soulData.category === 'Other' && (
                <div className="relative pt-1">
                  <input required type="text" placeholder="Specify spiritual need..." value={soulData.customPrayer} onChange={e => setSoulData({...soulData, customPrayer: e.target.value})} className={inputStyle} />
                </div>
              )}

              <div className="pt-4 border-t border-white/10 mt-6">
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-[#FF8E00] to-[#FF6A00] text-black text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] transition-all flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : 'Register Soul & Deploy Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY DEVOTIONAL READING MODAL WITH FULL LESSON TEXT RESTORED */}
      {activeDevotionModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto">
          <div className="bg-[#0A0E1A] border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-10 text-left shadow-2xl relative my-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-[#FF8E00] font-black text-xs uppercase tracking-widest">
                <BookOpenCheck size={18} /> {weeklyDevotion.seriesTitle}
              </div>
              <button 
                onClick={() => setActiveDevotionModal(false)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest block">
                {currentDayData.dateText}
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-snug">
                {currentDayData.title}
              </h2>
            </div>

            {/* ENTIRE MULTI-PARAGRAPH LESSON WITH WHITESPACE-PRE-LINE */}
            <div className="text-xs sm:text-sm text-white/80 leading-relaxed space-y-4 whitespace-pre-line font-medium border-y border-white/10 py-6">
              {currentDayData.lesson}
            </div>

            <div className="bg-[#03060D] p-5 rounded-2xl border border-[#FF8E00]/30 space-y-3">
              <h4 className="text-xs font-black text-[#FF8E00] uppercase tracking-widest flex items-center gap-1.5">
                <Heart size={15} /> Sinner's Prayer & Surrender
              </h4>
              <p className="text-xs text-white/90 italic leading-relaxed font-medium">
                "{weeklyDevotion.themePrayer}"
              </p>
            </div>

            {/* MODAL COMMENTS SECTION */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <MessageSquare size={14} className="text-[#FF8E00]" /> Brethren Reflections ({commentsList.length})
              </h4>
              
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share how this devotion spoke to your heart..."
                  className="flex-1 px-4 py-2.5 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#FF8E00]"
                />
                <button 
                  type="submit"
                  className="px-4 py-2.5 bg-[#FF8E00] hover:bg-[#FFA32A] text-black rounded-xl text-xs font-bold transition-all"
                >
                  <Send size={14} />
                </button>
              </form>

              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                {commentsList.map((comm) => (
                  <div key={comm.id} className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-[#8ECAE6]">{comm.name}</span>
                      <span className="text-white/40">{comm.time}</span>
                    </div>
                    <p className="text-xs text-white/80">{comm.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION BAR: LIKE, SHARE & CLOSE */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleLikeToggle}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    hasLiked 
                      ? 'bg-[#FF8E00]/20 border-[#FF8E00] text-[#FF8E00]' 
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <ThumbsUp size={14} className={hasLiked ? 'fill-current' : ''} /> {likesCount} Likes
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white transition-all"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>

              <button 
                onClick={() => setActiveDevotionModal(false)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTIVE GLOW HERO SECTION WITH REPLICATED WORD EMPHASIS */}
      <section className="w-full max-w-6xl mx-auto pt-16 pb-12 px-6 text-center space-y-8 relative z-10">
        
        {/* Language Toggle Pill Switch */}
        <div className="inline-flex items-center gap-1 p-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-lg">
          <button 
            onClick={() => setLanguageMode('EN')}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              languageMode === 'EN' ? 'bg-[#FF8E00] text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            English
          </button>
          <button 
            onClick={() => setLanguageMode('TWI')}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              languageMode === 'TWI' ? 'bg-[#FF8E00] text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            Twi
          </button>
        </div>

        {/* Replicated Official Word Emphasis Typography */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#FF8E00]/10 border border-[#FF8E00]/30 rounded-full text-[#FF8E00] text-[10px] font-bold uppercase tracking-widest">
            <Zap size={13} /> {languageMode === 'EN' ? '2026 KINGDOM THEME' : 'AFE 2026 BOTAEƐ'}
          </div>

          {languageMode === 'EN' ? (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight text-white">
              The Church Unleashed to <span className="text-[#FFC300] underline decoration-[#FFC300]/40 decoration-wavy">Transform Society</span> through the <span className="text-[#FFC300]">Gospel</span> and the Power of the <span className="text-[#FFC300]">Holy Spirit</span>
            </h1>
          ) : (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight text-white">
              Asafo a Apue Namyɛ so de <span className="text-[#FFC300]">Asɛmpa</span> no ne <span className="text-[#FFC300]">Honhom Kronkron</span> tumi ahoɔden <span className="text-[#FFC300] underline decoration-[#FFC300]/40 decoration-wavy">resakra wiase</span>
            </h1>
          )}

          <p className="text-xs md:text-sm font-bold text-white/70 max-w-2xl mx-auto">
            {languageMode === 'EN' 
              ? 'Acts 8:4-8, Acts 13:1-3, Colossians 1:4-6'
              : 'Asomafoɔ 8:4-8, Asomafoɔ 13:1-3, Kolosefoɔ 1:4-6'
            }
          </p>
        </div>

        {/* INTERACTIVE COMMAND OPERATIONS CENTER */}
        <div className="w-full max-w-5xl mx-auto mt-12 p-1 md:p-2 rounded-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="bg-[#0A0E1A]/90 backdrop-blur-2xl rounded-[1.3rem] p-6 md:p-10 text-left border border-white/10 space-y-8">
            
            {/* Top Bar of Operations Center */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <div>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-white">
                    Live Operations Command
                  </h3>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest">
                    {areaName} Network
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
                  <span className="text-[#FF8E00]">11</span> Assemblies Active
                </div>
                <a 
                  href={`tel:${(pastorContact || '+233000000000').split('/')[0].trim()}`}
                  className="px-5 py-2.5 rounded-xl bg-[#FF8E00] text-black font-black text-xs uppercase tracking-widest hover:bg-[#FFA32A] transition-all inline-flex items-center gap-1.5"
                >
                  <Phone size={13} /> Call District Minister
                </a>
              </div>
            </div>

            {/* Dashboard Inner Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FF8E00] uppercase tracking-widest">
                    Featured Service Today
                  </span>
                  <span className="text-[10px] font-mono text-[#8ECAE6]">8:00 AM - 10:30 AM</span>
                </div>
                <h4 className="text-lg font-bold text-white">Divine Encounter Worship Service</h4>
                <p className="text-xs text-white/60">
                  Anointed worship, intense prayer, and discipleship across all 11 local assemblies in the district.
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#FF8E00]/15 to-transparent border border-[#FF8E00]/30 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#FF8E00] uppercase tracking-widest">Pastoral Care</span>
                  <h4 className="text-sm font-bold text-white mt-1">Need Prayer or Counseling?</h4>
                </div>
                <a 
                  href={`tel:${(pastorContact || '+233000000000').split('/')[0].trim()}`} 
                  className="mt-4 block text-center w-full py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs uppercase rounded-xl transition-all"
                >
                  Call District Minister
                </a>
              </div>
            </div>

            {/* Slogan Banner Bottom */}
            <div className="pt-2 text-center">
              <p className="text-xs text-white/50 italic font-medium">
                "{languageMode === 'EN' 
                  ? 'Possessing the Nations: I am an Agent of Transformation. Possessing the Nations: Transforming my World.'
                  : 'Yɛrefa Aman: Meyɛ Nsakyeraeɛ Bɔfoɔ. Yɛrefa Aman: Meresakyera Me Wiase.'
                }"
              </p>
            </div>

          </div>
        </div>

      </section>

      {/* 8 THEMATIC PILLARS (SLEEK SAAS GRID) */}
      <section className="w-full max-w-6xl mx-auto py-16 px-6 border-t border-white/10">
        <div className="text-center space-y-2 mb-12">
          <span className="text-[10px] font-black text-[#FF8E00] uppercase tracking-widest bg-[#FF8E00]/10 px-3 py-1 rounded-full border border-[#FF8E00]/20">
            2026 Strategic Focus
          </span>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            8 Key Thematic Pillars
          </h2>
          <p className="text-xs text-white/60 max-w-xl mx-auto">
            Our local assemblies are united around eight core transformational areas to possess our nations for Christ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {thematicTopics.map((topic) => (
            <div 
              key={topic.num} 
              className="bg-[#0A0E1A]/60 border border-white/10 hover:border-[#FF8E00]/50 p-6 rounded-2xl transition-all group flex flex-col justify-between space-y-4 hover:bg-[#0A0E1A]"
            >
              <div className="space-y-3">
                <span className="inline-block text-[10px] font-black text-[#FF8E00] bg-[#FF8E00]/10 px-2.5 py-1 rounded border border-[#FF8E00]/20">
                  PILLAR {topic.num}
                </span>
                <h4 className="text-sm font-bold text-white group-hover:text-[#FF8E00] transition-colors leading-snug">
                  {topic.title}
                </h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed pt-3 border-t border-white/10">
                {topic.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WEEKLY DEVOTION SPOTLIGHT SECTION (SUNDAY TO SATURDAY CYCLE) */}
      <section className="w-full max-w-5xl mx-auto my-12 px-6">
        <div className="bg-gradient-to-br from-[#0A0E1A] via-[#11172A] to-[#0A0E1A] border border-[#FF8E00]/40 rounded-3xl p-8 md:p-10 shadow-[0_0_40px_rgba(255,142,0,0.15)] space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FF8E00]/10 text-[#FF8E00]">
                <BookOpenCheck size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest block">
                  Weekly Devotional Series • External Firestore Sync
                </span>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-white">
                  {weeklyDevotion.seriesTitle}
                </h3>
              </div>
            </div>

            {/* WEEKLY DAY SELECTOR PILL TABS (SUN TO SAT) */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
              {weeklyDevotion.days.map((dayItem, idx) => (
                <button
                  key={dayItem.dayName}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                    selectedDayIndex === idx 
                      ? 'bg-[#FF8E00] text-black shadow' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {dayItem.dayName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest block">
              {currentDayData.dateText}
            </span>
            <h4 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
              {currentDayData.title}
            </h4>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed italic border-l-2 border-[#FF8E00] pl-3">
              "{currentDayData.hook}"
            </p>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal pt-2">
              {currentDayData.message}
            </p>
          </div>

          {/* ENGAGEMENT BAR: LIKES, SHARES & MODAL OPEN */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLikeToggle}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  hasLiked 
                    ? 'bg-[#FF8E00]/20 border-[#FF8E00] text-[#FF8E00]' 
                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                }`}
              >
                <ThumbsUp size={14} className={hasLiked ? 'fill-current' : ''} /> {likesCount} Likes
              </button>

              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white transition-all"
              >
                <Share2 size={14} /> Share Word
              </button>

              <button 
                onClick={() => setActiveDevotionModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-[#8ECAE6] hover:text-white transition-all"
              >
                <MessageSquare size={14} /> Comment
              </button>
            </div>

            <button
              onClick={() => setActiveDevotionModal(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#FF8E00] hover:bg-[#FFA32A] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Read Full Lesson & Pray</span> <ChevronRight size={14} />
            </button>
          </div>

        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <section className="w-full max-w-4xl mx-auto my-12 px-6">
        <div className="bg-gradient-to-r from-[#FF8E00] via-[#FF6A00] to-[#FF8E00] rounded-3xl p-8 md:p-12 text-center text-black space-y-6 shadow-[0_0_50px_rgba(255,142,0,0.25)]">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">
            Ready to Surrender to Christ?
          </h2>
          <p className="text-xs md:text-sm font-bold max-w-lg mx-auto opacity-90">
            "Lord Jesus, wash me with Your precious blood. I accept You today as my Lord and personal Savior. Amen."
          </p>
          <button 
            onClick={() => setActiveForm('soul')}
            className="px-8 py-4 bg-black text-white hover:bg-black/80 font-black text-xs uppercase tracking-widest rounded-full shadow-2xl transition-all inline-flex items-center gap-2"
          >
            <Flame size={16} className="text-[#FF8E00]" /> Surrender & Register Your Soul
          </button>
        </div>
      </section>

      {/* SLEEK EXECUTIVE SAAS FOOTER */}
      <footer className="w-full bg-[#020408] border-t border-white/10 pt-16 pb-12 px-6 md:px-12 text-white/70 font-sans relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          
          {/* COL 1: BRANDING & VISION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/altarconnect-logo.png" 
                alt="AltarConnect Seal" 
                className="w-8 h-8 object-contain"
                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=COP&background=03060D&color=FF8E00'; }}
              />
              <span className="text-sm font-black uppercase tracking-widest text-white">
                AltarConnect
              </span>
            </div>
            <p className="text-xs leading-relaxed text-white/60">
              The unified digital command portal for {districtName}. Built to streamline soul registration, member updates, and pastoral discipleship across all 11 local assemblies.
            </p>
            <div className="pt-2 text-[10px] font-bold uppercase tracking-widest text-[#FF8E00]">
              Under {areaName}
            </div>
          </div>

          {/* COL 2: QUICK KINGDOM ACTIONS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Quick Operations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => setActiveForm('soul')} 
                  className="hover:text-[#FF8E00] transition-colors"
                >
                  Register a Soul
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push('/connect')} 
                  className="hover:text-[#FF8E00] transition-colors"
                >
                  Update Member Information
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push('/login')} 
                  className="hover:text-[#FF8E00] transition-colors"
                >
                  Officer & Minister Sign In
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push('/connect')} 
                  className="hover:text-[#FF8E00] transition-colors"
                >
                  Find Local Assembly Directory
                </button>
              </li>
            </ul>
          </div>

          {/* COL 3: STRATEGIC FOCUS AREAS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              2026 Focus Areas
            </h4>
            <ul className="space-y-2 text-xs">
              <li>Spiritual Living in a Secular World</li>
              <li>Kingdom Assignment in Public Sphere</li>
              <li>Raising Spirit-Filled Disciples</li>
              <li>Infilling of the Holy Spirit</li>
              <li>National Transformation via Prayer</li>
            </ul>
          </div>

          {/* COL 4: PASTORAL DESK & COUNSELING */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Pastoral Help Desk
            </h4>
            <p className="text-xs text-white/60">
              For immediate prayer support, counseling appointments, or child dedications:
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8ECAE6]">
                Direct Ministerial Lines
              </span>
              <div className="text-xs font-black text-white font-mono">
                {pastorContact}
              </div>
              <a 
                href={`tel:${(pastorContact || '+233000000000').split('/')[0].trim()}`} 
                className="block text-center w-full py-2 bg-[#FF8E00] hover:bg-[#FFA32A] text-black font-black text-[10px] uppercase tracking-widest rounded-lg transition-all"
              >
                Call District Minister
              </a>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT & INSTITUTIONAL ATTRIBUTION */}
        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>
            © {new Date().getFullYear()} {districtName} • A Ministry of The Church of Pentecost.
          </p>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
            <span>Possessing the Nations</span>
            <span>•</span>
            <span>Transforming Society</span>
          </div>
        </div>
      </footer>

      {/* FOOTER MARQUEE STYLES */}
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 25s linear infinite; }
      `}</style>
    </div>
  );
}