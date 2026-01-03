import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, getDoc, deleteDoc, query 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Utensils, Camera, Calculator, Trash2, Plus, 
  Settings, History, BarChart3, BookOpen, 
  Loader2, CheckCircle2, AlertCircle, Search, 
  Clock, Flame, Apple, Sparkles, ChefHat, 
  DollarSign, ArrowLeft, ListChecks, Image as ImageIcon,
  ChevronRight, TrendingUp, Zap, Calendar, Heart, Share2
} from 'lucide-react';

// --- ⚙️ კონფიგურაცია (შენი მონაცემები) ---
const firebaseConfig = {
  apiKey: "AIzaSyCt-vdljggQbtgtORhQfdXPou0FSWUZNLM",
  authDomain: "caloriehub-629aa.firebaseapp.com",
  projectId: "caloriehub-629aa",
  storageBucket: "caloriehub-629aa.firebasestorage.app",
  messagingSenderId: "1030381293806",
  appId: "1:1030381293806:web:a61bce5ea5458385c2a3ff",
  measurementId: "G-Q2CNRK16ET"
};

const GEMINI_API_KEY = "AIzaSyAdSzDqKf73a9fzI94UpmeOTJTrnJHfWos";

// Firebase ინიციალიზაცია
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 🥗 გაფართოებული რეცეპტების ბაზა (PRO) ---
const RECIPE_DATABASE = [
  { 
    id: 1, name: "ოსპის წვნიანი (თურქული)", calories: 210, time: "30 წთ", category: "სადილი", budget: "დაბალი", cuisine: "თურქული",
    ingredients: ["200გრ წითელი ოსპი", "1 სტაფილო", "1 ხახვი", "1 ს/კ ტომატი", "მარილი", "ლიმონი"],
    preparation: ["გარეცხეთ ოსპი გამდინარე წყალში", "ხახვი და სტაფილო მოთუშეთ ქვაბში", "დაამატეთ ტომატი და ოსპი", "დაასხით წყალი და ხარშეთ 20 წთ", "დააბლენდერეთ ერთგვაროვანი მასის მიღებამდე"],
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500"
  },
  { 
    id: 2, name: "ავოკადოს ტოსტი კვერცხით", calories: 340, time: "10 წთ", category: "საუზმე", budget: "მაღალი", cuisine: "ევროპული",
    ingredients: ["1 ნაჭერი პური", "1/2 ავოკადო", "1 კვერცხი", "ჩილი ფანტელები"],
    preparation: ["გახაუხეთ პური ტაფაზე", "ავოკადო დაჭყლიტეთ ჩანგლით", "მოხარშეთ კვერცხი (პაშოტი ან ჩვეულებრივი)", "დაალაგეთ ფენებად და მოაყარეთ სუნელები"],
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500"
  },
  { 
    id: 3, name: "ხინკალი (დიეტური, 1ც)", calories: 75, time: "40 წთ", category: "სადილი", budget: "დაბალი", cuisine: "ქართული",
    ingredients: ["საქონლის მჭლე ხორცი", "ცომი", "ხახვი", "მწვანილი", "პილპილი"],
    preparation: ["მოამზადეთ ცომი ფქვილით და წყლით", "ხორცი გაატარეთ ხახვთან ერთად", "მოახვიეთ პატარა კვერები", "მოხარშეთ ადუღებულ მარილიან წყალში"],
    image: "https://images.unsplash.com/photo-1599307734173-97992c68600d?w=500"
  },
  { 
    id: 4, name: "ქათმის სალათი მაწვნით", calories: 220, time: "15 წთ", category: "ვახშამი", budget: "საშუალო", cuisine: "ჯანსაღი",
    ingredients: ["150გრ ქათმის ფილე", "100გრ მაწონი", "კიტრი", "კამა"],
    preparation: ["მოხარშეთ ქათმის ფილე", "დაჭერით კუბიკებად", "შეურიეთ მაწონი, დაჭრილი კიტრი და მწვანილი"],
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500"
  },
  { 
    id: 5, name: "ორაგული ბროკოლით", calories: 420, time: "25 წთ", category: "სადილი", budget: "მაღალი", cuisine: "ევროპული",
    ingredients: ["150გრ ორაგული", "150გრ ბროკოლი", "ლიმონი", "ზეითუნის ზეთი"],
    preparation: ["ორაგულს მოაყარეთ მარილი და ლიმონი", "შეწვით გრილზე ან ტაფაზე", "ბროკოლი მოთუშეთ ორთქლზე 5-7 წუთი"],
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500"
  },
  {
    id: 6, name: "გოგრის კრემ-სუპი", calories: 180, time: "35 წთ", category: "სადილი", budget: "დაბალი", cuisine: "ევროპული",
    ingredients: ["300გრ გოგრა", "1 კარტოფილი", "ხახვი", "ნაღები (სურვილისამებრ)"],
    preparation: ["მოხარშეთ დაჭრილი ბოსტნეული", "გადაღვარეთ წყლის ნაწილი", "დააბლენდერეთ და დაუმატეთ მარილი"],
    image: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=500"
  },
  {
    id: 7, name: "ბერძნული სალათი", calories: 210, time: "10 წთ", category: "წასახემსებელი", budget: "საშუალო", cuisine: "ბერძნული",
    ingredients: ["პომიდორი", "კიტრი", "ფეტა", "ზეთისხილი", "ზეითუნის ზეთი"],
    preparation: ["დაჭერით ბოსტნეული მსხვილად", "დაადეთ ფეტას ნაჭერი", "მოასხით ზეთი და მოაყარეთ ორეგანო"],
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500"
  }
];

// --- მთავარი აპლიკაცია ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tracker'); // tracker, recipes, stats
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBudget, setActiveBudget] = useState('ყველა');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 1. ავტორიზაცია და მონაცემების ჩატვირთვა
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { console.error("ავტორიზაციის შეცდომა:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
    getDoc(profileRef).then(s => s.exists() && setDailyGoal(s.data().dailyGoal || 2000));

    const historyCol = collection(db, 'users', user.uid, 'history');
    return onSnapshot(historyCol, (s) => {
      const items = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(items.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });
  }, [user]);

  // 2. ლოგიკური დამხმარეები
  const todayDate = new Date().toDateString();
  const todayHistory = useMemo(() => 
    history.filter(h => new Date(h.timestamp).toDateString() === todayDate),
  [history, todayDate]);

  const totalToday = todayHistory.reduce((s, i) => s + (Number(i.calories) || 0), 0);
  const progressPercent = Math.min((totalToday / dailyGoal) * 100, 100);

  const weeklyStats = useMemo(() => {
    return [6, 5, 4, 3, 2, 1, 0].map(dayOffset => {
      const d = new Date(); d.setDate(d.getDate() - dayOffset);
      const ds = d.toDateString();
      const cals = history.filter(h => new Date(h.timestamp).toDateString() === ds).reduce((s,i) => s+i.calories, 0);
      return { label: d.toLocaleDateString('ka-GE', {weekday:'short'}), calories: cals };
    });
  }, [history]);

  // 3. AI პროცესორი (ტექსტი და ფოტო)
  const processAI = async (text, base64 = null) => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text || "დაითვალე კალორიები ამ ფოტოზე არსებული საკვებისთვის (1 პორცია)." }, ...(base64 ? [{ inlineData: { mimeType: "image/jpeg", data: base64 } }] : [])] }],
          systemInstruction: { parts: [{ text: "Expert Dietitian. Identify food and estimate calories. Return ONLY JSON: { \"name\": \"საკვების დასახელება\", \"calories\": number }." }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await response.json();
      const res = JSON.parse(data.candidates[0].content.parts[0].text);
      await addDoc(collection(db, 'users', user.uid, 'history'), { ...res, timestamp: Date.now() });
      setInput('');
    } catch (e) { setError("კავშირი ვერ დამყარდა AI-სთან."); }
    finally { setLoading(false); }
  };

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'history', id));
  };

  // --- UI ხედები ---

  const TrackerView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Input Card */}
      <div className="bg-white rounded-[2.8rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500"><Sparkles className="w-4 h-4" /></div>
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">რა მიირთვით?</h3>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="მაგ: 1 ხინკალი, 200გრ ქათამი..."
          className="w-full p-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-500/5 transition-all min-h-[120px] text-sm text-slate-700 resize-none mb-6 outline-none font-medium placeholder:text-slate-300"
        />
        <div className="flex gap-4">
          <button onClick={() => processAI(input)} disabled={loading || !input.trim()} className="flex-[2.5] bg-slate-900 text-white font-black py-5 rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />} დათვლა
          </button>
          <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-emerald-50 text-emerald-600 rounded-[1.8rem] border border-emerald-100 flex items-center justify-center active:scale-95 hover:bg-emerald-100 transition-colors">
            <Camera className="w-6 h-6" />
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const r = new FileReader(); r.onloadend = () => processAI(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); }} />
          </button>
        </div>
        {error && <div className="mt-4 flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-wider"><AlertCircle className="w-4 h-4"/> {error}</div>}
      </div>

      {/* History List */}
      <div className="space-y-5">
        <div className="flex justify-between items-center px-4">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4"/> ისტორია</h3>
           <p className="text-[10px] font-bold text-slate-300">მხოლოდ დღეს</p>
        </div>
        {todayHistory.length === 0 ? (
          <div className="py-20 flex flex-col items-center opacity-30 border-2 border-dashed border-slate-100 rounded-[3rem]">
            <Utensils className="w-10 h-10 mb-4 text-slate-300" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ჩანაწერები ცარიელია</p>
          </div>
        ) : (
          todayHistory.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-[2.2rem] border border-slate-50 flex justify-between items-center shadow-sm animate-in zoom-in-95 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-500 font-black text-xs border border-slate-100">{item.name?.charAt(0)}</div>
                <div>
                  <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="font-black text-slate-700 tracking-tighter text-lg">{item.calories}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">კკალ</p>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-slate-200 hover:text-red-400 p-2 transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const RecipesView = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-2 z-10 space-y-4">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="მოძებნეთ რეცეპტი..." 
            className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.8rem] outline-none text-sm font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['ყველა', 'დაბალი', 'საშუალო', 'მაღალი'].map(b => (
            <button key={b} onClick={() => setActiveBudget(b)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeBudget === b ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{b} ბიუჯეტი</button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {RECIPE_DATABASE.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) && (activeBudget === 'ყველა' || r.budget === activeBudget)).map(r => (
          <div key={r.id} className="bg-white rounded-[2.8rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group transition-all active:scale-[0.98]">
            <div className="h-56 w-full relative overflow-hidden bg-slate-100">
              <img src={r.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{r.budget} ბიუჯეტი</span>
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-slate-800 text-xl leading-tight line-clamp-1">{r.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{r.cuisine}</p>
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600 leading-none">{r.calories}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">კკალ</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelectedRecipe(r)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-colors">დეტალები</button>
                <button onClick={() => { addDoc(collection(db, 'users', user.uid, 'history'), { name: r.name, calories: r.calories, timestamp: Date.now() }); setActiveTab('tracker'); }} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all">დამატება</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const StatsView = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
        <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-slate-800"><Calendar className="w-6 h-6 text-emerald-500" /> კვირის ანალიზი</h3>
        <div className="flex items-end justify-between h-56 gap-4">
          {weeklyStats.map((day, i) => {
            const h = Math.min((day.calories / dailyGoal) * 100, 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full bg-slate-50 rounded-full h-full relative overflow-hidden flex flex-col justify-end border border-slate-50">
                  <div className={`w-full rounded-full transition-all duration-1000 ${day.calories > dailyGoal ? 'bg-orange-400' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'}`} style={{ height: `${h}%` }} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-slate-800 transition-colors">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
         <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <TrendingUp className="w-10 h-10 text-emerald-500/20 absolute -right-2 -bottom-2" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">საშუალო</p>
            <p className="text-3xl font-black">{Math.round(weeklyStats.reduce((a,b)=>a+b.calories,0)/7)}</p>
            <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">კკალ/დღეში</p>
         </div>
         <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-white">
            <Zap className="w-10 h-10 text-white/20 absolute -right-2 -bottom-2" />
            <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-2">საუკეთესო</p>
            <p className="text-3xl font-black">{Math.max(...weeklyStats.map(d=>d.calories))}</p>
            <p className="text-[10px] text-emerald-200 font-bold uppercase mt-1">კკალ/დღეში</p>
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FBFDFF] text-slate-900 max-w-md mx-auto relative flex flex-col font-sans overflow-hidden shadow-2xl overscroll-none">
      
      {/* --- Header (Sticky) --- */}
      <header className="bg-white pt-10 pb-8 px-8 sticky top-0 z-40 border-b border-slate-50 rounded-b-[3.5rem] shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 animate-pulse-slow">
              <Apple className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">Health Hub Pro</p>
               <h1 className="text-3xl font-black tracking-tighter text-slate-800 leading-none">კალორიები</h1>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-transform hover:bg-slate-100 hover:text-slate-600"><Settings className="w-6 h-6" /></button>
        </div>

        {/* Dynamic Card */}
        <div className="bg-slate-900 rounded-[2.8rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">დღევანდელი ჯამი</p>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black tracking-tighter">{totalToday}</p>
                <p className="text-sm text-slate-600 font-bold uppercase">/ {dailyGoal}</p>
              </div>
            </div>
            <div className="text-right">
               <div className="flex items-center gap-2 text-emerald-400 mb-1 justify-end">
                  <p className="font-black text-2xl leading-none">{Math.round(progressPercent)}%</p>
               </div>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">პროგრესი</p>
            </div>
          </div>
          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${totalToday > dailyGoal ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[80px] -mr-20 -mt-20" />
        </div>
      </header>

      {/* --- Main Area --- */}
      <main className="flex-1 px-8 pt-8 pb-40 overflow-y-auto scroll-smooth scrollbar-hide overscroll-contain">
        {activeTab === 'tracker' && <TrackerView />}
        {activeTab === 'recipes' && <RecipesView />}
        {activeTab === 'stats' && <StatsView />}
      </main>

      {/* --- Navigation Bar --- */}
      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[92%] max-w-[360px] bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-[3rem] p-3 flex justify-between shadow-[0_25px_60px_rgba(0,0,0,0.15)] z-50 animate-in slide-in-from-bottom-10 duration-700">
        {[
          { id: 'tracker', icon: Utensils, label: 'კვება' },
          { id: 'recipes', icon: BookOpen, label: 'ჰაბი' },
          { id: 'stats', icon: BarChart3, label: 'გრაფიკი' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex-1 flex flex-col items-center py-5 rounded-[2.5rem] transition-all duration-500 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.05] -translate-y-1' : 'text-slate-300 hover:text-slate-500 active:scale-90'}`}
          >
            <tab.icon className={`w-5 h-5 mb-2 ${activeTab === tab.id ? 'animate-bounce-slow' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* --- Modals --- */}
      
      {/* 🥗 Recipe Detail Overlay */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-500 scrollbar-hide">
          <div className="relative h-96">
            <img src={selectedRecipe.image} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-10 left-8 p-5 bg-white/95 backdrop-blur-md rounded-[1.8rem] shadow-2xl active:scale-90 transition-transform"><ArrowLeft className="w-6 h-6 text-slate-800" /></button>
            <button className="absolute top-10 right-8 p-5 bg-white/95 backdrop-blur-md rounded-[1.8rem] shadow-2xl active:scale-90"><Heart className="w-6 h-6 text-slate-400" /></button>
          </div>
          <div className="p-10 -mt-16 bg-white rounded-t-[5rem] relative z-10 min-h-screen">
             <div className="text-center mb-12">
                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] border-b-2 border-emerald-50 pb-1">{selectedRecipe.cuisine} სამზარეულო</span>
                <h1 className="text-4xl font-black text-slate-800 leading-tight mt-6 mb-8">{selectedRecipe.name}</h1>
                <div className="flex gap-5 justify-center">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] flex-1 text-center border border-slate-50"><Flame className="w-5 h-5 mx-auto mb-3 text-orange-400" /><p className="font-black text-2xl text-slate-700 leading-none">{selectedRecipe.calories}</p><p className="text-[10px] text-slate-400 uppercase font-black mt-2 tracking-widest">კკალ</p></div>
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] flex-1 text-center border border-slate-50"><Clock className="w-5 h-5 mx-auto mb-3 text-blue-400" /><p className="font-black text-2xl text-slate-700 leading-none">{selectedRecipe.time}</p><p className="text-[10px] text-slate-400 uppercase font-black mt-2 tracking-widest">დრო</p></div>
                </div>
             </div>

             <div className="space-y-14 pb-48">
                <div>
                  <h3 className="flex items-center gap-4 text-sm font-black uppercase text-slate-800 mb-8 tracking-[0.3em]"><ListChecks className="w-5 h-5 text-emerald-500" /> ინგრედიენტები</h3>
                  <div className="grid gap-4">
                    {selectedRecipe.ingredients?.map((ing, i) => (
                      <div key={i} className="bg-slate-50/70 p-6 rounded-3xl flex items-center gap-5 text-sm font-bold text-slate-600 border border-slate-100/50"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" /> {ing}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-4 text-sm font-black uppercase text-slate-800 mb-8 tracking-[0.3em]"><ChefHat className="w-5 h-5 text-emerald-500" /> მომზადების წესი</h3>
                  <div className="space-y-6">
                    {selectedRecipe.preparation?.map((step, i) => (
                      <div key={i} className="flex gap-6 p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-[12px] font-black shrink-0 shadow-lg">{i + 1}</div>
                        <p className="text-[15px] text-slate-600 leading-relaxed font-medium pt-1.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
             
             <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-white via-white to-transparent z-50">
                <button 
                  onClick={() => { addDoc(collection(db, 'users', user.uid, 'history'), { name: selectedRecipe.name, calories: Number(selectedRecipe.calories), timestamp: Date.now() }); setSelectedRecipe(null); setActiveTab('tracker'); }}
                  className="w-full bg-slate-900 text-white font-black py-7 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all tracking-[0.1em] text-sm uppercase"
                >
                  დამატება დღიურში
                </button>
             </div>
          </div>
        </div>
      )}

      {/* ⚙️ Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl animate-fade-in" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white w-full rounded-t-[4rem] p-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-12" />
            <h2 className="text-3xl font-black mb-4 text-center tracking-tight text-slate-800">პარამეტრები</h2>
            <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-12">თქვენი დღიური მიზანი</p>
            
            <div className="relative mb-12 group">
               <input 
                type="number" 
                value={dailyGoal} 
                onChange={(e) => { const val = parseInt(e.target.value) || 0; setDailyGoal(val); if(user) setDoc(doc(db, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); }} 
                className="w-full p-10 bg-slate-50 border-none rounded-[2.5rem] text-6xl font-black outline-none transition-all text-center text-slate-800 focus:bg-emerald-50 focus:ring-4 focus:ring-emerald-500/5" 
               />
               <p className="absolute right-12 top-1/2 -translate-y-1/2 font-black text-slate-200 uppercase text-xs tracking-[0.2em] pointer-events-none">კკალ</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-12">
               <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">მონაცემები</p>
                  <p className="font-bold text-emerald-600">ღრუბელშია</p>
               </div>
               <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">ვერსია</p>
                  <p className="font-bold text-slate-800">PRO v1.2</p>
               </div>
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 hover:bg-black text-white py-7 rounded-[2.5rem] font-black shadow-2xl active:scale-95 transition-all tracking-[0.2em] uppercase text-xs">ცვლილებების შენახვა</button>
          </div>
        </div>
      )}

      {/* Tailwind Animations & Global Styles */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.02); }
        }
        .animate-pulse-slow { animation: pulse-slow 4s infinite ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
}