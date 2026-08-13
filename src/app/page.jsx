"use client";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from './firebase'; 
import { collection, onSnapshot, query, orderBy, doc, where } from 'firebase/firestore';
import { 
  Flame, UserCheck, Loader2, CheckCircle2, AlertCircle, Sparkles, 
  Phone, MapPin, Heart, Globe, Users, User, Shield, 
  ArrowLeft, Calendar, BookOpen, Clock, ChevronRight, Zap, 
  BookOpenCheck, X, Share2, MessageSquare, ThumbsUp, Send, Target
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
  const [districtName, setDistrictName] = useState('Ketiejli District');
  const [districtSlogan, setDistrictSlogan] = useState('Possessing the Nations: Transforming our World.');
  const [pastorContact, setPastorContact] = useState('+233 54 143 7815 / +233 20 409 2129');
  const [logoBase64, setLogoBase64] = useState('/logo.jpg');
  
  // --- DYNAMIC PASTORAL SCHEDULE STATE ---
  const [todaysEvent, setTodaysEvent] = useState(null);

  // --- MONTHLY FOCUS STATE (Linked to Firebase Settings) ---
  const [monthlyFocus, setMonthlyFocus] = useState({
    month: "August 2026",
    title: "Sharing the Love of Christ with a Dying World",
    subtitle: "Members Serving Beyond the Church Walls."
  });

  // --- DEVOTION ENGAGEMENT STATES ---
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay()); 
  const [likesCount, setLikesCount] = useState(124);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentsList, setCommentsList] = useState([
    { id: 1, name: "Elder Samuel", text: "Amen! True obedience is shown in our daily labor.", time: "2h ago" },
    { id: 2, name: "Sister Grace", text: "Lord, help me to work faithfully in Your vineyard today.", time: "1h ago" }
  ]);

  // --- ALTARCONNECT SOUL FORM STATE ---
  const [soulData, setSoulData] = useState({
    counselorName: '', fullName: '', phone: '', gender: '', language: 'English', category: 'General Prayer', customPrayer: ''
  });
  const availableLanguages = ["English", "Twi", "Konkomba", "Ga", "Ewe"];

  // ==========================================
  // WORD-BY-WORD TYPEWRITER STATE
  // ==========================================
  const [visibleWords, setVisibleWords] = useState(0);

  const themeEnWords = [
    { text: "The", type: "normal" }, { text: "Church", type: "normal" }, { text: "Unleashed", type: "normal" }, { text: "to", type: "normal" },
    { text: "Transform", type: "highlight" }, { text: "Society", type: "highlight" },
    { text: "through", type: "normal" }, { text: "the", type: "normal" }, { text: "Gospel", type: "highlight" },
    { text: "and", type: "normal" }, { text: "the", type: "normal" }, { text: "Power", type: "normal" },
    { text: "of", type: "normal" }, { text: "the", type: "normal" }, { text: "Holy", type: "highlight" }, { text: "Spirit", type: "highlight" }
  ];

  const themeTwiWords = [
    { text: "Asafo", type: "normal" }, { text: "a", type: "normal" }, { text: "Apue", type: "normal" }, { text: "Namyɛ", type: "normal" },
    { text: "so", type: "normal" }, { text: "de", type: "normal" }, { text: "Asɛmpa", type: "highlight" },
    { text: "no", type: "normal" }, { text: "ne", type: "normal" }, { text: "Honhom", type: "highlight" }, { text: "Kronkron", type: "highlight" },
    { text: "tumi", type: "normal" }, { text: "ahoɔden", type: "normal" }, { text: "resakra", type: "highlight" }, { text: "wiase", type: "highlight" }
  ];

  useEffect(() => {
    const activeArray = languageMode === 'EN' ? themeEnWords : themeTwiWords;
    const totalWords = activeArray.length;
    let currentCount = 0;
    
    setVisibleWords(0);

    const interval = setInterval(() => {
      currentCount++;
      if (currentCount > totalWords + 35) {
        currentCount = 0;
      }
      setVisibleWords(currentCount);
    }, 150);

    return () => clearInterval(interval);
  }, [languageMode]);

  // --- WEEKLY DEVOTION STATE ---
  const [weeklyDevotion, setWeeklyDevotion] = useState({
    seriesTitle: "THE TWO SONS | MATTHEW 21:31",
    themePrayer: "Lord Jesus, I repent of my religious lip service. I have spoken polite words while my heart remained far from Your vineyard. I have promised obedience but failed to act. Today, I turn away from my rebellion. I drop my empty promises. Wash my heart with Your holy blood. Give me the grace to execute Your will through daily action. Be my Lord and Savior. Amen.",
    days: [
      {
        dayName: "Sun", title: "WEEKLY ANNOUNCEMENT & CHARGE", dateText: "Sunday, August 9, 2026", hook: "Are you honoring God with your lips while your hands refuse to work in His field?", message: "Polite religious promises will not save your soul. Jesus demands your wholehearted obedience. Surrender to Him today.",
        lesson: `My dear friend, are you honoring God with your lips while your hands refuse to work in His field?\n\nJesus told a sharp story to religious leaders who loved polite speech. A father went to his first son and commanded him to work in the vineyard. The son answered bluntly, "I will not." But afterward, he changed his mind and went. The father went to the second son and gave the same command. That son answered politely, "I go, sir." But he never went.\n\nJesus asked which of the two did the will of his father. They answered correctly that the first son obeyed. Jesus then delivered a devastating verdict. He said that corrupt tax collectors and prostitutes were entering the Kingdom of God ahead of respectable religious leaders. The outcasts repented and obeyed. The leaders offered pious words but refused to change.\n\nMy brethren, this is the parable of Action Versus Words. In our communities, we respect the polished speech of the elder and the assemblyman. We judge the rough past of the common laborer. But God does not measure your faith by your religious vocabulary. He measures your faith by your actual obedience. Take courage today. Stop relying on polite promises and start working in the Father's field.\n\nCALL TO ACTION: Do not let polite words replace your obedience this week. Declare together, "We will obey with our actions!"`
      },
      {
        dayName: "Mon", title: "THE HONEST REBEL", dateText: "Monday, August 10, 2026", hook: "Is your past rebellion keeping you from believing that God can use your hands today?", message: "Your past rebellion is no match for the cleansing blood of Jesus. Turn around and enter His vineyard today.",
        lesson: `Jesus said, "A man had two sons. And he went to the first and said, 'Son, go and work in the vineyard today.' And he answered, 'I will not,' but afterward he changed his mind and went."\n\nMy brethren, look closely at the first son. His initial response was disrespectful and rebellious. He told his father to his face that he would not work. But later, genuine regret pierced his heart. He repented. He picked up his tools and walked into the field.\n\nWe see this transformation in our communities today. There are men and women who once lived in open rebellion against God. They were known sinners. Yet when the Gospel pierced their hearts, they did not just shed tears. They changed their direction. Sola Scriptura teaches us that how you finish is far more important than how you start. God honors the repentant rebel who turns his life around through action.\n\nTrue repentance is measured by your footsteps.\n\nAPPLICATION: Do not let the shame of your past rebellion paralyze you. If you have been running away from God's call, change your mind today. Step into your local church or community square and perform a practical act of service.`
      },
      {
        dayName: "Tue", title: "THE POLITE HYPOCRITE", dateText: "Tuesday, August 11, 2026", hook: "Are you hiding your disobedience behind polite religious vocabulary?", message: "Saying 'Lord, Lord' will not open the gates of heaven. You must do the will of the Father. Surrender today.",
        lesson: `And he went to the other son and said the same. And he answered, "I go, sir," but did not go.\n\nMy dear friend, look at the terrible deception of the second son. His words were perfectly respectful. He called his father "sir." He gave an immediate, willing promise to obey. Yet his feet never moved toward the vineyard. He was a master of polite disobedience.\n\nThis hypocrisy is common in our communities. We love to sound holy at church meetings. We say "Amen" to every sermon. We promise to pray, to give, and to serve our neighbors. Yet when Monday arrives, we do absolutely nothing. Sola Scriptura exposes this trap. God is not impressed by polite titles or religious etiquette. Unfulfilled promises are a mockery of His authority.\n\nPolite rebellion is still rebellion.\n\nAPPLICATION: Check your recent commitments today. Did you promise to help a neighbor or support a community project without following through? Do not make another empty promise. Go and fulfill your word before nightfall.`
      },
      {
        dayName: "Wed", title: "THE FRUIT OF REPENTANCE", dateText: "Wednesday, August 12, 2026", hook: "What visible proof exists in your community that your heart has truly changed?", message: "A changed heart always produces a changed lifestyle. Trust Jesus today and let His love transform your actions.",
        lesson: `Jesus asked, "Which of the two did the will of his father?" They said, "The first."\n\nMy brethren, look at the clear standard of Jesus Christ. The will of the Father is not a sentiment. It is an action. The first son proved his repentance by walking into the field and working the soil. His repentance produced visible, agricultural fruit.\n\nIn our communities, many people claim they have repented. Yet they still cheat in their shops. They still slander their neighbors. Sola Scriptura declares that faith without works is completely dead. John the Baptist commanded us to bear fruit in keeping with repentance. When your heart truly turns to God, your hands will automatically begin to serve your community.\n\nReal change leaves a visible trail of service.\n\nAPPLICATION: Examine your daily habits today. Find one practical way to demonstrate your faith in your neighborhood. Help an elderly neighbor with her load. Clean a public path. Let your changed heart produce visible fruit.`
      },
      {
        dayName: "Thu", title: "THE SHOCKING QUEUE", dateText: "Thursday, August 13, 2026", hook: "Why are despised outcasts entering the Kingdom of God ahead of religious leaders?", message: "No sin is too dark for the blood of Jesus. Drop your pride, believe His Word, and enter His Kingdom today.",
        lesson: `Jesus said to them, "Truly, I say to you, the tax collectors and the prostitutes go into the kingdom of God before you. For John came to you in the way of righteousness, and you did not believe him, but the tax collectors and the prostitutes believed him."\n\nMy dear friend, this statement shocked the religious elite to their core. In Jewish society, tax collectors and prostitutes were at the absolute bottom. Yet Jesus declared they were entering the Kingdom first. Why? Because when they heard the call to repent, they believed and changed their lives.\n\nIn our communities, we often despise the broken. We look down on the drunkard or the struggling laborer. Yet when they hear the Gospel, they drop their pride and obey. Sola Scriptura warns proud churchgoers. If you refuse to humble your heart and repent, God will promote the repentant outcast over you.\n\nHumility opens the door that religious pride locks.\n\nAPPLICATION: Examine your attitude toward the outcasts in your community today. Stop judging them. Pray for their salvation, and remember that God's grace is equally available to every broken soul.`
      },
      {
        dayName: "Fri", title: "THE FATHER'S VINEYARD", dateText: "Friday, August 14, 2026", hook: "Where is the vineyard God is commanding you to cultivate today?", message: "You were created to serve the King of Glory. Leave your selfish pursuits and work in His harvest field today.",
        lesson: `The father's instruction was clear and specific. "Son, go and work in the vineyard today."\n\nMy brethren, look at three key words in this command. First, go. It requires initiative. Second, work. It requires effort and sweat. Third, today. It requires immediate urgency. The father did not ask his son to sit and debate agricultural theory. He commanded him to labor in the field.\n\nYour rural community is the Father's vineyard. Your local church, your family, and your marketplace are the rows of vines where God has planted you. Sola Scriptura demands that we stop delaying our service. Do not wait for a special title or an easier season. Step into your community today and cultivate peace, justice, and the Gospel of Christ.\n\nThe vineyard needs workers, not spectators.\n\nAPPLICATION: Identify one neglected area in your local church or community today. Do not wait for an invitation. Pick up your tools, show up, and put in an hour of hard, honest service for God's glory.`
      },
      {
        dayName: "Sat", title: "CONCLUSION: OBEY WITH ACTION", dateText: "Saturday, August 15, 2026", hook: "My brethren, will your life be remembered for polite speech or faithful labor?", message: "You cannot satisfy God with polite vocabulary. Unfulfilled religious promises are empty hypocrisy. God honors the repentant rebel who goes to work.",
        lesson: `My brethren, will your life be remembered for polite speech or faithful labor?\n\nThis week, we confronted our religious lip service through The Parable of the Two Sons. Let us establish this absolute reality. You cannot satisfy the Father with polite vocabulary and unfulfilled promises. The second son said, "I go, sir," yet he never stepped into the vines. His respectful words were empty hypocrisy.\n\nGod honors the repentant rebel who changes his mind and moves his feet. The first son bluntly refused, but genuine sorrow brought him into the field. His obedient labor erased his verbal defiance.\n\nIn our communities, we must stop judging people by their polished speech or their past mistakes. God looks at who is working in His vineyard today. Drop your empty excuses. Step into your community with humble, hardworking obedience. Let your actions prove that you love the Father.\n\nCALL TO ACTION: Audit your promises this weekend. Have you been talking about faith while neglecting service? Repent of your passivity. Step into church tomorrow ready to back up your worship with practical, obedient labor.`
      }
    ]
  });

  // OFFICIAL 8 THEMATIC TOPICS (FOOTER)
  const thematicTopics = [
    { num: "01", title: "Spiritual Living in a Secular World" },
    { num: "02", title: "My Job, My Kingdom Assignment" },
    { num: "03", title: "Raising Spirit-Filled Disciples" },
    { num: "04", title: "Baptism & Infilling of the Holy Spirit" },
    { num: "05", title: "Living in Anticipation of Christ" },
    { num: "06", title: "Sharing the Love of Christ" },
    { num: "07", title: "The Godly Home" },
    { num: "08", title: "Prayer and Fasting" }
  ];

  useEffect(() => {
    // 1. Fetch Global Settings & Monthly Focus
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.areaName) setAreaName(data.areaName); 
        if (data.districtName) setDistrictName(data.districtName);
        if (data.districtSlogan) setDistrictSlogan(data.districtSlogan);
        if (data.pastorContact) setPastorContact(data.pastorContact);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
        
        // Dynamic Monthly Focus Update
        if (data.focusMonth) {
          setMonthlyFocus({
            month: data.focusMonth,
            title: data.focusTitle || "Sharing the Love of Christ",
            subtitle: data.focusSubtitle || "Members Serving Beyond the Church Walls."
          });
        }
      }
    });

    const unsubDevotion = onSnapshot(doc(db, 'devotions', 'current_week'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().days) {
        setWeeklyDevotion(docSnap.data());
      }
    });

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) setAssemblies(snapshot.docs.map(docSnap => docSnap.data().name));
    });

    // 2. Fetch Pastor's Schedule for TODAY specifically
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const qPastor = query(collection(db, 'pastor_schedule'), where('date', '==', todayStr));
    const unsubPastor = onSnapshot(qPastor, (snapshot) => {
      if (!snapshot.empty) {
        const dailyEvents = snapshot.docs.map(doc => doc.data());
        // Sort chronologically to get the next immediate event
        dailyEvents.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
        setTodaysEvent(dailyEvents[0]);
      } else {
        setTodaysEvent(null);
      }
    });

    return () => { unsubSettings(); unsubDevotion(); unsubAssem(); unsubPastor(); };
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
      
      setSoulData({ counselorName: '', fullName: '', phone: '', gender: '', language: 'English', category: 'General Prayer', customPrayer: '' });
      setActiveForm(null);
      setSuccessPopup(true); 
    } catch (err) {
      console.error("Submission Error: ", err);
      showNotification('error', 'Submission failure. Check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = { id: Date.now(), name: "Kingdom Visitor", text: commentText, time: "Just now" };
    setCommentsList([newComment, ...commentsList]);
    setCommentText("");
    showNotification('success', 'Your comment has been posted!');
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
              <span>{assemblies.length || 11} Local Assemblies</span>
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

      {/* FULL DEVOTION READING MODAL */}
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

      {/* GLOW HERO SECTION WITH WORD-BY-WORD TYPEWRITER THEME */}
      <section className="w-full max-w-6xl mx-auto pt-16 pb-12 px-6 text-center space-y-8 relative z-10">
        
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

        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#FF8E00]/10 border border-[#FF8E00]/30 rounded-full text-[#FF8E00] text-[10px] font-bold uppercase tracking-widest">
            <Zap size={13} /> {languageMode === 'EN' ? '2026 KINGDOM THEME' : 'AFE 2026 BOTAEƐ'}
          </div>

          {/* DYNAMIC LOOPING WORD-BY-WORD TYPEWRITER EFFECT */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight text-white flex flex-wrap justify-center gap-x-3 gap-y-1 sm:gap-y-2 min-h-[140px] md:min-h-[180px]">
            {(languageMode === 'EN' ? themeEnWords : themeTwiWords).map((word, i) => {
              let spanClass = "transition-all duration-300 transform ";
              spanClass += i < visibleWords ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4";
              if (word.type === "highlight") {
                spanClass += " text-[#FFC300]";
              }
              return <span key={i} className={spanClass}>{word.text}</span>;
            })}
          </h1>

          <p className="text-xs md:text-sm font-bold text-white/70 max-w-2xl mx-auto mt-4 transition-opacity duration-1000" style={{ opacity: visibleWords > 3 ? 1 : 0 }}>
            {languageMode === 'EN' ? 'Acts 8:4-8, Acts 13:1-3, Colossians 1:4-6' : 'Asomafoɔ 8:4-8, Asomafoɔ 13:1-3, Kolosefoɔ 1:4-6'}
          </p>
        </div>

        {/* INTERACTIVE COMMAND OPERATIONS CENTER (WITH DYNAMIC PASTOR SCHEDULE) */}
        <div className="w-full max-w-5xl mx-auto mt-12 p-1 rounded-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all duration-1000 transform" style={{ opacity: visibleWords > 5 ? 1 : 0, transform: visibleWords > 5 ? 'translateY(0)' : 'translateY(20px)' }}>
          <div className="bg-[#0A0E1A]/90 backdrop-blur-2xl rounded-[1.3rem] p-6 md:p-10 text-left border border-white/10 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <div>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-white">Live Operations Command</h3>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest">{areaName} Network</p>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white">
                <span className="text-[#FF8E00]">{assemblies.length || 11}</span> Assemblies Active
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-[#FF8E00]/15 to-transparent border border-[#FF8E00]/30 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#FF8E00] uppercase tracking-widest">Pastoral Care</span>
                  <h4 className="text-sm font-bold text-white mt-1">Need Prayer or Counseling?</h4>
                </div>
                <a href={`tel:${(pastorContact || '+233000000000').split('/')[0].trim()}`} className="mt-4 block text-center w-full py-3 bg-[#FF8E00] text-black font-black text-xs uppercase tracking-widest hover:bg-[#FFA32A] rounded-xl transition-all shadow-md">
                  Call District Minister
                </a>
              </div>

              {/* DYNAMIC FEATURED SERVICE FROM PASTOR'S ITINERARY */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-3 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FF8E00] uppercase tracking-widest">Featured Focus Today</span>
                  {todaysEvent && <span className="text-[10px] font-mono text-[#8ECAE6]">{todaysEvent.time}</span>}
                </div>
                
                {todaysEvent ? (
                  <>
                    <h4 className="text-sm lg:text-lg font-bold text-white leading-snug">{todaysEvent.title}</h4>
                    <p className="text-xs text-white/60 font-bold">
                      {todaysEvent.type} • {todaysEvent.location || "District Wide"}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm lg:text-lg font-bold text-white leading-snug">Personal Devotion & Evangelism</h4>
                    <p className="text-xs text-white/60">
                      No district service scheduled today. Spend time in the Word or share Christ with a neighbor.
                    </p>
                  </>
                )}
              </div>

              <div className="bg-gradient-to-bl from-blue-600/15 to-transparent border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none"><Target size={40} className="text-[#8ECAE6]" /></div>
                <div>
                  <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                    {monthlyFocus.month} Focus
                  </span>
                  <h4 className="text-sm font-bold text-white mt-3 leading-snug">{monthlyFocus.title}</h4>
                  <p className="text-[11px] text-white/70 mt-2 leading-relaxed italic border-l-2 border-[#8ECAE6] pl-2">{monthlyFocus.subtitle}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-2 text-center">
              <p className="text-xs text-white/50 italic font-medium">"{languageMode === 'EN' ? 'Possessing the Nations: I am an Agent of Transformation.' : 'Yɛrefa Aman: Meyɛ Nsakyeraeɛ Bɔfoɔ.'}"</p>
            </div>
          </div>
        </div>
      </section>

      {/* WEEKLY DEVOTION SPOTLIGHT SECTION */}
      <section className="w-full max-w-5xl mx-auto my-12 px-6">
        <div className="bg-gradient-to-br from-[#0A0E1A] via-[#11172A] to-[#0A0E1A] border border-[#FF8E00]/40 rounded-3xl p-8 md:p-10 shadow-[0_0_40px_rgba(255,142,0,0.15)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FF8E00]/10 text-[#FF8E00]"><BookOpenCheck size={20} /></div>
              <div>
                <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest block">Weekly Devotional Series • External Firestore Sync</span>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-white">{weeklyDevotion.seriesTitle}</h3>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
              {weeklyDevotion.days.map((dayItem, idx) => (
                <button key={dayItem.dayName} onClick={() => setSelectedDayIndex(idx)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${selectedDayIndex === idx ? 'bg-[#FF8E00] text-black shadow' : 'text-white/60 hover:text-white'}`}>{dayItem.dayName}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest block">{currentDayData.dateText}</span>
            <h4 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">{currentDayData.title}</h4>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed italic border-l-2 border-[#FF8E00] pl-3">"{currentDayData.hook}"</p>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal pt-2">{currentDayData.message}</p>
          </div>
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={handleLikeToggle} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${hasLiked ? 'bg-[#FF8E00]/20 border-[#FF8E00] text-[#FF8E00]' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'}`}><ThumbsUp size={14} className={hasLiked ? 'fill-current' : ''} /> {likesCount} Likes</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white transition-all"><Share2 size={14} /> Share Word</button>
              <button onClick={() => setActiveDevotionModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-[#8ECAE6] hover:text-white transition-all"><MessageSquare size={14} /> Comment</button>
            </div>
            <button onClick={() => setActiveDevotionModal(true)} className="w-full sm:w-auto px-6 py-3 bg-[#FF8E00] hover:bg-[#FFA32A] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"><span>Read Full Lesson & Pray</span> <ChevronRight size={14} /></button>
          </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <section className="w-full max-w-4xl mx-auto my-12 px-6">
        <div className="bg-gradient-to-r from-[#FF8E00] via-[#FF6A00] to-[#FF8E00] rounded-3xl p-8 md:p-12 text-center text-black space-y-6 shadow-[0_0_50px_rgba(255,142,0,0.25)]">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">Ready to Surrender to Christ?</h2>
          <p className="text-xs md:text-sm font-bold max-w-lg mx-auto opacity-90">"Lord Jesus, wash me with Your precious blood. I accept You today as my Lord and personal Savior. Amen."</p>
          <button onClick={() => setActiveForm('soul')} className="px-8 py-4 bg-black text-white hover:bg-black/80 font-black text-xs uppercase tracking-widest rounded-full shadow-2xl transition-all inline-flex items-center gap-2">
            <Flame size={16} className="text-[#FF8E00]" /> Surrender & Register Your Soul
          </button>
        </div>
      </section>

      {/* SLEEK EXECUTIVE SAAS FOOTER */}
      <footer className="w-full bg-[#020408] border-t border-white/10 pt-16 pb-12 px-6 md:px-12 text-white/70 font-sans relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/altarconnect-logo.png" alt="AltarConnect Seal" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=COP&background=03060D&color=FF8E00'; }} />
              <span className="text-sm font-black uppercase tracking-widest text-white">AltarConnect</span>
            </div>
            <p className="text-xs leading-relaxed text-white/60">The unified digital command portal for {districtName}. Built to streamline soul registration, member updates, and pastoral discipleship.</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Quick Operations</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => setActiveForm('soul')} className="hover:text-[#FF8E00] transition-colors">Register a Soul</button></li>
              <li><button onClick={() => router.push('/connect')} className="hover:text-[#FF8E00] transition-colors">Update Member Info</button></li>
              <li><button onClick={() => router.push('/login')} className="hover:text-[#FF8E00] transition-colors">Officer Sign In</button></li>
            </ul>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#FF8E00] flex items-center gap-2"><BookOpen size={14} /> 2026 Strategic Focus Areas</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[11px] text-white/70 font-medium">
              {thematicTopics.map((topic) => (
                <li key={topic.num} className="flex items-start gap-2 hover:text-white transition-colors cursor-default">
                  <span className="text-[#FF8E00] font-black">{topic.num}.</span> {topic.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} {districtName} • A Ministry of The Church of Pentecost.</p>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
            <span>Possessing the Nations</span> <span>•</span> <span>Transforming Society</span>
          </div>
        </div>
      </footer>
    </div>
  );
}