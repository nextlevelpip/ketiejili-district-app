"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { FileSpreadsheet, Save, Download, CheckCircle2, AlertCircle, Loader2, Calendar, MapPin, Calculator, RefreshCw, Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';

export default function HQReports() {
  const [assemblies, setAssemblies] = useState([]);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // --- REPORT PARAMS ---
  const [selectedAssembly, setSelectedAssembly] = useState('ALL_ASSEMBLIES');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeSection, setActiveSection] = useState('Outreach & Souls');

  // --- MATRIX STATE ---
  // Structure: { metric_id: { w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, prev: 0 } }
  const [reportData, setReportData] = useState({});
  const isDistrictMode = selectedAssembly === 'ALL_ASSEMBLIES';

  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetched);
      }
    });

    return () => unsubAssem();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const getWeekNumber = (dateString) => {
    if (!dateString) return 1;
    const day = new Date(dateString).getDate();
    if (day <= 7) return 1;
    if (day <= 14) return 2;
    if (day <= 21) return 3;
    if (day <= 28) return 4;
    return 5;
  };

  // --- THE OFFICIAL HQ REPORT STRUCTURE ---
  const reportTemplate = [
    {
      section: 'Outreach & Souls',
      metrics: [
        { id: 'total_outreach', label: '18. Total Outreach Programs' },
        { id: 'adult_cop', label: '19. Adult Souls Won (COP)' },
        { id: 'other_souls', label: '20. Other Souls Won' },
        { id: 'children_won', label: '21. Children Won & Retained' },
        { id: 'gospel_sunday', label: '22. Gospel Sunday Souls Won' },
      ]
    },
    {
      section: 'Assembly & Worship',
      metrics: [
        { id: 'home_cells_opened', label: '1. Home Cells Opened' },
        { id: 'home_cells_closed', label: '2. Home Cells Closed' },
        { id: 'total_home_cells', label: '3. No. of Home Cell Groups' },
        { id: 'sunday_services', label: '60. No. of Sunday services held' },
        { id: 'sunday_attendance', label: '61. Total Sunday Morning Attendance' },
      ]
    },
    {
      section: 'Baptisms & Live Events',
      metrics: [
        { id: 'water_baptized_total', label: '41. Total Converts Baptized in Water' },
        { id: 'spirit_baptized_new', label: '42. New Converts Baptized in Holy Spirit' },
        { id: 'child_dedications', label: '49. Total Children Dedications' },
        { id: 'marriages_blessed', label: '79. No. of Marriages Blessed' },
      ]
    },
    {
      section: 'Finances (GHS)',
      metrics: [
        { id: 'gross_tithes', label: '128. Gross Tithes' },
        { id: 'net_tithes', label: '129. Net Tithes' },
        { id: 'missions_offering', label: '130. Missions Offering' },
        { id: 'local_fund', label: '132. Local Fund' },
        { id: 'local_expenditure', label: '133. Local Expenditure' },
      ]
    }
  ];

  // --- THE DUAL-TIER REPORT ENGINE ---
  const loadAndCalculateReport = async () => {
    setIsGenerating(true);
    
    try {
      if (isDistrictMode) {
        // --- MODE B: DISTRICT MASTER ROLLUP ---
        showNotification('success', 'Aggregating all local assembly matrices...');
        const qReports = query(
          collection(db, 'hq_reports'), 
          where('year', '==', selectedYear), 
          where('month', '==', selectedMonth)
        );
        const snapshot = await getDocs(qReports);
        
        const aggregatedMatrix = {};
        
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.assembly !== 'ALL_ASSEMBLIES') {
            const localMatrix = data.matrix || {};
            Object.keys(localMatrix).forEach(mId => {
              if (!aggregatedMatrix[mId]) {
                aggregatedMatrix[mId] = { w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, prev: 0 };
              }
              aggregatedMatrix[mId].w1 += (localMatrix[mId].w1 || 0);
              aggregatedMatrix[mId].w2 += (localMatrix[mId].w2 || 0);
              aggregatedMatrix[mId].w3 += (localMatrix[mId].w3 || 0);
              aggregatedMatrix[mId].w4 += (localMatrix[mId].w4 || 0);
              aggregatedMatrix[mId].w5 += (localMatrix[mId].w5 || 0);
              aggregatedMatrix[mId].prev += (localMatrix[mId].prev || 0);
            });
          }
        });
        
        setReportData(aggregatedMatrix);
        showNotification('success', 'District Master Report generated successfully.');

      } else {
        // --- MODE A: LOCAL ASSEMBLY ENTRY & AUTO-FILL ---
        const reportId = `${selectedAssembly}_${selectedYear}_${selectedMonth}`;
        const docRef = doc(db, 'hq_reports', reportId);
        const docSnap = await getDoc(docRef);
        
        let currentMatrix = {};
        
        if (docSnap.exists()) {
          currentMatrix = docSnap.data().matrix || {};
          showNotification('success', `Existing report loaded for ${selectedAssembly}.`);
        } else {
          // Initialize empty matrix
          reportTemplate.forEach(sec => {
            sec.metrics.forEach(m => {
              currentMatrix[m.id] = { w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, prev: 0 };
            });
          });
          showNotification('success', 'Initializing fresh report matrix and scanning logs...');
        }

        // AUTO-SCAN EVANGELISM LOGS
        const startDate = `${selectedYear}-${selectedMonth}-01`;
        const endDate = `${selectedYear}-${selectedMonth}-31`;
        
        const qEvang = query(
          collection(db, 'evangelism_logs'), 
          where('localAssembly', '==', selectedAssembly),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        const evangSnapshot = await getDocs(qEvang);

        // Only auto-fill if it's a fresh report, to avoid overriding manual inputs
        if (!docSnap.exists()) {
          evangSnapshot.forEach(logSnap => {
            const data = logSnap.data();
            const weekKey = `w${getWeekNumber(data.date)}`; 
            
            if (!currentMatrix['total_outreach']) currentMatrix['total_outreach'] = { w1:0, w2:0, w3:0, w4:0, w5:0, prev:0 };
            currentMatrix['total_outreach'][weekKey] += 1;
            
            if (!currentMatrix['adult_cop']) currentMatrix['adult_cop'] = { w1:0, w2:0, w3:0, w4:0, w5:0, prev:0 };
            currentMatrix['adult_cop'][weekKey] += (Number(data.adultSoulsCop) || 0);
            
            if (!currentMatrix['other_souls']) currentMatrix['other_souls'] = { w1:0, w2:0, w3:0, w4:0, w5:0, prev:0 };
            currentMatrix['other_souls'][weekKey] += (Number(data.otherSoulsNonCop) || 0);
            
            if (!currentMatrix['children_won']) currentMatrix['children_won'] = { w1:0, w2:0, w3:0, w4:0, w5:0, prev:0 };
            currentMatrix['children_won'][weekKey] += (Number(data.childrenWon) || 0);
            
            if (!currentMatrix['gospel_sunday']) currentMatrix['gospel_sunday'] = { w1:0, w2:0, w3:0, w4:0, w5:0, prev:0 };
            currentMatrix['gospel_sunday'][weekKey] += (Number(data.gospelSundaySouls) || 0);
          });
        }

        setReportData(currentMatrix);
      }
    } catch (error) {
      showNotification('error', 'Failed to generate report matrix.');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- SAVE REPORT ---
  const handleSaveReport = async () => {
    setIsSubmitting(true);
    const reportId = `${selectedAssembly}_${selectedYear}_${selectedMonth}`;
    
    try {
      await setDoc(doc(db, 'hq_reports', reportId), {
        assembly: selectedAssembly,
        month: selectedMonth,
        year: selectedYear,
        matrix: reportData,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.fullName || 'System Admin'
      });
      showNotification('success', isDistrictMode ? 'Master District Report saved.' : `Official Report filed for ${selectedAssembly}.`);
    } catch (error) {
      showNotification('error', 'Failed to save report to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCellChange = (metricId, field, value) => {
    if (isDistrictMode) return; // Prevent editing in Master Mode
    const numValue = value === '' ? 0 : Number(value);
    
    setReportData(prev => ({
      ...prev,
      [metricId]: {
        ...(prev[metricId] || { w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, prev: 0 }),
        [field]: numValue
      }
    }));
  };

  const calculateCurrent = (metricId) => {
    if (!reportData[metricId]) return 0;
    const { w1, w2, w3, w4, w5 } = reportData[metricId];
    return (w1 || 0) + (w2 || 0) + (w3 || 0) + (w4 || 0) + (w5 || 0);
  };

  const calculateVariance = (metricId) => {
    if (!reportData[metricId]) return 0;
    const current = calculateCurrent(metricId);
    const prev = reportData[metricId].prev || 0;
    return current - prev;
  };

  const inputStyle = "w-full px-4 py-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:text-[#000814]";
  const cellInputStyle = "w-12 md:w-16 p-2 bg-[#000814] border border-[#003566] rounded-lg text-center font-mono text-xs text-white focus:border-[#FFC300] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        <div className="relative z-10 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {notification.message}
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & CONFIG (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><FileSpreadsheet size={24} /></div>
                <div>
                  <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">HQ Statistical Reports</h1>
                  <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Auto-calculate and file weekly/monthly returns.</p>
                </div>
              </div>
              
              <button 
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[10px] bg-[#000814] text-[#FFC300] border border-[#003566] hover:bg-[#003566] flex items-center gap-2 shadow-lg"
              >
                <Download size={14} /> Print / Export PDF
              </button>
            </div>

            {/* CONFIGURATION BAR */}
            <div className="bg-[#000814] p-4 rounded-2xl border border-[#003566] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1"><MapPin size={10} className="inline mr-1"/> Target Assembly</label>
                <select value={selectedAssembly} onChange={e => setSelectedAssembly(e.target.value)} className={inputStyle}>
                  <option value="ALL_ASSEMBLIES" className="font-black text-blue-600">ALL ASSEMBLIES (District Summary)</option>
                  {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1"><Calendar size={10} className="inline mr-1"/> Reporting Month</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={inputStyle}>
                  <option value="01">January</option><option value="02">February</option><option value="03">March</option>
                  <option value="04">April</option><option value="05">May</option><option value="06">June</option>
                  <option value="07">July</option><option value="08">August</option><option value="09">September</option>
                  <option value="10">October</option><option value="11">November</option><option value="12">December</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1">Reporting Year</label>
                <input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <button 
                  onClick={loadAndCalculateReport} 
                  disabled={isGenerating}
                  className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center justify-center gap-2 border ${isGenerating ? 'bg-[#000814] text-white/30 border-[#003566] cursor-not-allowed' : 'bg-[#FFC300] text-[#000814] border-[#FFC300] hover:bg-[#FFD60A]'}`}
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {isGenerating ? 'Scanning Data...' : 'Generate Matrix'}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* THE UNIFIED TABBED MATRIX VIEWER                          */}
          {/* ========================================================= */}
          {Object.keys(reportData).length > 0 ? (
            <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] overflow-hidden animate-fade-in">
              
              {isDistrictMode && (
                <div className="bg-blue-500/10 border-b border-blue-500/30 p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center justify-center gap-2">
                    <Layers size={14} /> Master District Rollup Mode Active (Read-Only)
                  </span>
                </div>
              )}

              {/* MATRIX TABS */}
              <div className="flex overflow-x-auto bg-[#001D3D] border-b border-[#003566] custom-scrollbar">
                {reportTemplate.map(section => (
                  <button 
                    key={section.section}
                    onClick={() => setActiveSection(section.section)}
                    className={`px-6 py-4 whitespace-nowrap font-black uppercase tracking-widest text-[10px] transition-colors border-b-2 ${activeSection === section.section ? 'border-[#FFC300] text-[#FFC300] bg-[#000814]' : 'border-transparent text-white/50 hover:bg-[#000814]/50'}`}
                  >
                    <Layers size={14} className="inline mr-2" />
                    {section.section}
                  </button>
                ))}
              </div>

              {/* ACTIVE MATRIX VIEW */}
              <div className="p-6">
                <div className="overflow-x-auto custom-scrollbar pb-4">
                  <table className="w-full text-left whitespace-nowrap text-xs min-w-[900px]">
                    <thead className="bg-[#001D3D] text-[#FFC300] font-black border-b border-[#003566] text-[9px] uppercase tracking-widest">
                      <tr>
                        <th className="p-4 rounded-tl-lg">S/N | Description Matrix</th>
                        <th className="p-4 text-center border-l border-[#003566]">Wk 1</th>
                        <th className="p-4 text-center">Wk 2</th>
                        <th className="p-4 text-center">Wk 3</th>
                        <th className="p-4 text-center">Wk 4</th>
                        <th className="p-4 text-center">Wk 5</th>
                        <th className="p-4 text-center bg-[#FFC300]/10 border-l border-[#003566]">Current (X)</th>
                        <th className="p-4 text-center border-l border-[#003566]">Previous (Y)</th>
                        <th className="p-4 text-center rounded-tr-lg">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {reportTemplate.find(s => s.section === activeSection)?.metrics.map((metric) => {
                        const current = calculateCurrent(metric.id);
                        const variance = calculateVariance(metric.id);
                        
                        return (
                          <tr key={metric.id} className="hover:bg-[#001D3D]/50 transition-colors">
                            <td className="p-4 font-black text-white text-xs whitespace-normal">{metric.label}</td>
                            
                            {/* WEEKS 1-5 */}
                            {['w1', 'w2', 'w3', 'w4', 'w5'].map((week, idx) => (
                              <td key={week} className={`p-4 text-center ${idx === 0 ? 'border-l border-[#003566]/50' : ''}`}>
                                {isDistrictMode ? (
                                  <span className="font-mono text-white/70">{reportData[metric.id]?.[week] || 0}</span>
                                ) : (
                                  <input 
                                    type="number" min="0"
                                    value={reportData[metric.id]?.[week] || ''}
                                    onChange={(e) => handleCellChange(metric.id, week, e.target.value)}
                                    className={cellInputStyle}
                                  />
                                )}
                              </td>
                            ))}

                            {/* CURRENT (X) - Auto Calculated */}
                            <td className="p-4 text-center bg-[#FFC300]/5 border-l border-[#003566]/50 font-mono text-sm font-black text-[#FFC300]">
                              {current}
                            </td>

                            {/* PREVIOUS (Y) - Legacy Baseline */}
                            <td className="p-4 text-center border-l border-[#003566]/50">
                                {isDistrictMode ? (
                                  <span className="font-mono text-white/70">{reportData[metric.id]?.prev || 0}</span>
                                ) : (
                                  <input 
                                    type="number" min="0"
                                    value={reportData[metric.id]?.prev || ''}
                                    onChange={(e) => handleCellChange(metric.id, 'prev', e.target.value)}
                                    className={`${cellInputStyle} border-blue-500/50 focus:border-blue-400`}
                                    title="Enter baseline data from physical books here"
                                  />
                                )}
                            </td>

                            {/* VARIANCE (X-Y) */}
                            <td className="p-4 text-center">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-black ${
                                variance > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                                variance < 0 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 
                                'bg-[#001D3D] text-white/50 border-[#003566]'
                              }`}>
                                {variance > 0 ? <TrendingUp size={12}/> : variance < 0 ? <TrendingDown size={12}/> : <Minus size={12}/>}
                                {variance > 0 ? '+' : ''}{variance}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 pt-6 border-t border-[#003566] flex justify-end">
                  <button 
                    onClick={handleSaveReport}
                    disabled={isSubmitting}
                    className={`px-10 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-2 border ${isSubmitting ? 'bg-[#000814] text-white/30 border-[#003566] cursor-not-allowed' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'}`}
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSubmitting ? 'Committing to Vault...' : 'Commit & Save Matrix'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#000814] border border-[#003566] p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl">
              <Calculator size={48} className="text-[#FFC300]/30 mb-4" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">Awaiting Parameters</h3>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Select your Target Assembly and Reporting Period, then click "Generate Matrix" to begin.</p>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}