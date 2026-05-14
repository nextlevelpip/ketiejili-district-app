"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { db, auth } from '../app/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  LayoutDashboard, Users, ClipboardCheck, Target, Flame, 
  Shield, MessageSquare, BookOpen, Download, UserCog, 
  Settings, LogOut, Menu, Cloud, Lock,
  Heart
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // --- THE WATCHMAN STATES ---
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [pinError, setPinError] = useState('');

  // --- GLOBAL BRANDING STATES ---
  const [globalName, setGlobalName] = useState('KETIEJILI');
  const [globalSlogan, setGlobalSlogan] = useState('District Command');
  const [globalLogo, setGlobalLogo] = useState('/logo.jpg');

  // --- REAL USER DATA (Now with Tier Level!) ---
  const [currentUser, setCurrentUser] = useState({
    fullName: "Loading...",
    role: "Verifying",
    localPin: null,
    tierLevel: 3 // Default to lowest clearance until proven otherwise
  });

  // --- FIREBASE SECURITY & USER FETCH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login'); 
      } else {
        // Find who this phone belongs to!
        const deviceId = localStorage.getItem('ketiejili_device_id');
        if (deviceId) {
          const q = query(collection(db, 'users'), where('authorizedDevice', '==', deviceId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setCurrentUser({
              // Support both 'name' and 'fullName' depending on how it was saved
              fullName: userData.name || userData.fullName || "Authorized Leader",
              role: userData.role || "District Leader",
              localPin: userData.localPin,
              tierLevel: userData.tierLevel || 3 // GRAB THE CLEARANCE LEVEL HERE!
            });
            setIsAuthorized(true); 
          } else {
            // Device not recognized in database, kick them out
            signOut(auth);
            router.push('/login');
          }
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- LISTEN FOR DISTRICT SETTINGS ---
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.districtName) setGlobalName(data.districtName);
        if (data.districtSlogan) setGlobalSlogan(data.districtSlogan);
        if (data.logoBase64) setGlobalLogo(data.logoBase64);
      }
    });
    return () => unsubSettings();
  }, []);

  // --- THE AUTO-LOCK WATCHMAN ---
  useEffect(() => {
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 60000 ms = 60 seconds. 
      timeoutId = setTimeout(() => {
        if (isAuthorized) setIsLocked(true);
      }, 60000); 
    };

    if (!isLocked) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keypress', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [isAuthorized, isLocked]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (unlockPin === currentUser.localPin) {
      setIsLocked(false);
      setUnlockPin('');
      setPinError('');
    } else {
      setPinError('Incorrect PIN');
    }
  };

  const getInitials = (name) => {
    if (!name || name === "Loading...") return "PK";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to securely log out?")) {
      try {
        await signOut(auth);
        router.push('/login');
      } catch (error) {
        alert("Failed to log out. Please check your connection.");
      }
    }
  };

  // --- MASTER LIST OF ALL POSSIBLE LINKS ---
  const navItems = [
    { name: 'Connection Inbox', href: '/inbox', icon: MessageSquare },
    { name: 'Analytics Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Directory', href: '/directory', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'Discipleship Tracker', href: '/discipleship', icon: Target },
    { name: 'Evangelism & Souls', href: '/evangelism', icon: Flame },
    { name: 'Leaders Council', href: '/presbytery', icon: Shield },
    { name: 'Bulk SMS Contacts', href: '/sms', icon: MessageSquare },
    { name: 'District Heritage', href: '/heritage', icon: BookOpen },
    { name: 'Data Export', href: '/export', icon: Download },
  ];

  const bottomNavItems = [
    { name: 'Pastoral Prayers', href: "/prayers", icon: Heart },
    { name: 'User Accounts', href: '/accounts', icon: UserCog },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // --- THE DOOR FILTERS (SECURITY LOGIC) ---
  const authorizedNavItems = navItems.filter(item => {
    if (currentUser.tierLevel === 1) return true; // Supreme Command sees all
    
    if (currentUser.tierLevel === 2) {
      // Presiding Elders see everything EXCEPT Data Export
      const restricted = ['Data Export'];
      return !restricted.includes(item.name);
    }
    
    if (currentUser.tierLevel === 3) {
      // Group Leaders ONLY see Operational Tools
      const allowed = ['Directory', 'Attendance', 'Discipleship Tracker'];
      return allowed.includes(item.name);
    }
    return false;
  });

  const authorizedBottomNavItems = bottomNavItems.filter(item => {
    if (currentUser.tierLevel === 1) return true; // Supreme Command sees all
    
    if (currentUser.tierLevel === 2) {
      // Presiding Elders cannot access Master Settings or User Accounts
      const restricted = ['User Accounts', 'Settings'];
      return !restricted.includes(item.name);
    }
    
    if (currentUser.tierLevel === 3) {
      // Group Leaders have no access to bottom admin tools
      return false; 
    }
    return false;
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center text-white font-black tracking-widest uppercase text-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Verifying Security Clearance...
        </div>
      </div>
    );
  }

  // --- THE IDLE LOCK SCREEN OVERLAY ---
  if (isLocked) {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4 z-[100] relative">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-900">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-blue-950 mb-1">Session Locked</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">
            Welcome back, {currentUser.fullName.split(' ')[0]}
          </p>

          {pinError && <p className="text-red-500 text-sm font-bold mb-4">{pinError}</p>}

          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              placeholder="••••"
              maxLength="4"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-black text-3xl text-center tracking-[0.5em] mb-4"
              autoFocus
            />
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors">
              Unlock Dashboard
            </button>
          </form>
          
          <button onClick={handleLogout} className="mt-4 text-xs font-bold text-red-500 hover:text-red-700">
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={globalLogo} 
              alt="Logo" 
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-900 shadow-sm" 
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=1e3a8a&color=fff'; }} 
            />
            <div className="overflow-hidden">
              <h1 className="font-black text-blue-950 leading-tight tracking-tight text-lg truncate" title={globalName}>{globalName}</h1>
              <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest truncate">{globalSlogan}</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-center gap-2 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Active</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
          <div className="px-3 pb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Main Menu</p>
          </div>
          {authorizedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm
                  ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1 bg-gray-50/50">
          {authorizedBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm
                  ${isActive ? 'bg-gray-200 text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm text-red-600 hover:bg-red-50 mt-2 border border-transparent hover:border-red-100"
          >
            <LogOut size={18} />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="hidden sm:block text-xl font-black text-gray-800 tracking-tight">COP {globalName}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
              <Cloud size={14} className="fill-current" />
              <span className="text-xs font-black uppercase tracking-wider">Cloud Synced</span>
            </div>
            <div className="flex items-center gap-3 bg-white pl-1 pr-3 sm:pr-4 py-1 rounded-full border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-900 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-inner">
                {getInitials(currentUser.fullName)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-extrabold text-gray-900 leading-none">{currentUser.fullName}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
}