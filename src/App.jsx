import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, getDoc, deleteDoc, query 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Utensils, Camera, Trash2, Plus, 
  Settings, History, BarChart3, BookOpen, 
  Loader2, AlertCircle, Search, 
  Clock, Flame, Apple, ChefHat, 
  DollarSign, ArrowLeft, ListChecks, ImageIcon,
  TrendingUp, Zap, Calculator, Sparkles, ChevronRight
} from 'lucide-react';

// --- ✅ Firebase კონფიგურაცია ✅ ---
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
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'calorie-tracker-pro-v1';

// --- 📊 გაფართოებული ლოკალური პროდუქტების ბაზა (100გ-ზე) ---
const FOOD_DATABASE = {
  // პური და ფქვილეული
  "პური": 240, "შოთის პური": 255, "თეთრი პური": 265, "ჭვავის პური": 220, "მჭადი": 210, "სუხარი": 380, "ლავაში": 275, "ბლინი": 170,
  // ქართული კერძები
  "ხინკალი": 75, // 1 ცალი
  "ხაჭაპური": 310, "აჭარული ხაჭაპური": 350, "იმერული ხაჭაპური": 290, "მეგრული ხაჭაპური": 330, "ლობიანი": 270, "კუბდარი": 280,
  "საცივი": 190, "მწვადი": 280, "ღორის მწვადი": 310, "ქათმის მწვადი": 175, "ხარჩო": 110, "ჩაქაფული": 95, "კუპატი": 320,
  "ფხალი": 85, "აჯაფსანდალი": 70, "ლობიო": 120, "ოსტრი": 140, "შქმერული": 210, "ჩაშუშული": 130, "გებჟალია": 240,
  // ხორცი და თევზი
  "საქონლის ხორცი": 250, "ღორის ხორცი": 290, "ქათმის ფილე": 165, "ინდაური": 190, "ბატკანი": 280, "ორაგული": 210, "კალმახი": 140,
  "ძეხვი": 300, "სოსისი": 260, "ლორი": 150, "კოტლეტი": 240, "შემწვარი ქათამი": 220,
  // რძის ნაწარმი
  "ყველი": 300, "სულგუნი": 290, "იმერული ყველი": 260, "გუდა": 350, "ხაჭო": 150, "არაჟანი": 210, "მაწონი": 65, "იოგურტი": 90,
  "რძე": 60, "კარაქი": 720, "მდნარი ყველი": 250,
  // ბოსტნეული
  "კარტოფილი": 77, "მოხარშული კარტოფილი": 85, "შემწვარი კარტოფილი": 200, "პიურე": 110, "კიტრი": 15, "პომიდორი": 18, 
  "ბადრიჯანი": 25, "ბროკოლი": 35, "ყვავილოვანი კომბოსტო": 25, "კომბოსტო": 28, "სტაფილო": 41, "ხახვი": 40, "ნიორი": 150,
  "ბულგარული": 30, "მწვანილი": 20, "სალათის ფოთოლი": 15, "სოკო": 22,
  // ხილი
  "ვაშლი": 52, "ბანანი": 89, "მსხალი": 57, "ატამი": 40, "საზამთრო": 30, "ნესვი": 33, "ყურძენი": 67, "ალუბალი": 50,
  "მარწყვი": 32, "ფორთოხალი": 47, "ლიმონი": 30, "კივი": 60, "ანანასი": 50,
  // სასმელები და სოუსები
  "ღვინო": 85, "ლუდი": 45, "არაყი": 235, "კოკა-კოლა": 42, "წვენი": 50, "ყავა": 2, "ჩაი": 1, "შაქარი": 390,
  "მაიონეზი": 680, "კეტჩუპი": 110, "ტყემალი": 60, "მზესუმზირის ზეთი": 880, "ზეითუნის ზეთი": 880,
  // ტკბილეული და თხილი
  "შოკოლადი": 540, "ნაყინი": 220, "თაფლი": 300, "ნიგოზი": 650, "თხილი": 630, "ნუში": 580, "მზესუმზირა": 580,
  "ჩიფსი": 530, "პოპკორნი": 380, "პიცა": 270, "ჰამბურგერი": 250, "ფრი": 310
};

const LOCAL_RECIPES = [
  { id: 'r1', name: "ხინკალი (კლასიკური)", calories: 75, time: "40 წთ", cuisine: "ქართული", budget: "დაბალი", ingredients: ["ხორცი", "ცომი"], preparation: ["მოხარშვა"], image: "https://images.unsplash.com/photo-1599307734173-97992c68600d?w=500" }
];

const TrackerInput = memo(({ onProcess, loading, aiStatus, error }) => {
  const [text, setText] = useState('');
  const fileRef = useRef(null);

  return (
    <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">რა მიირთვით?</h3>
      </div>
      <textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="მაგ: 200გრ მწვადი, 100გრ პური, 1 კოვზი მაიონეზი..." 
        className="w-full p-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-500/5 text-base min-h-[180px] outline-none placeholder:text-slate-300 resize-none font-medium leading-relaxed shadow-inner" 
      />
      <div className="flex gap-4 mt-6">
        <button 
          onClick={() => { onProcess(text); setText(''); }} 
          disabled={loading || !text.trim()} 
          className="flex-[3] bg-slate-900 text-white font-black py-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 shadow-xl active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Calculator className="w-5 h-5" />}
          <span className="text-[10px] uppercase tracking-widest">დათვლა</span>
        </button>
        <button 
          onClick={() => fileRef.current.click()} 
          className="flex-1 bg-emerald-50 text-emerald-600 rounded-[1.5rem] border border-emerald-100 flex items-center justify-center active:scale-95 shadow-sm"
        >
          <Camera className="w-8 h-8" />
          <input type="file" hidden ref={fileRef} accept="image/*" onChange={(e) => { if (e.target.files[0]) { const r = new FileReader(); r.onloadend = () => onProcess(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); } }} />
        </button>
      </div>
      {aiStatus && <p className="mt-4 text-[10px] text-emerald-600 font-black animate-pulse text-center uppercase tracking-widest">{aiStatus}</p>}
      {error && <p className="mt-4 text-[10px] text-red-500 font-bold text-center uppercase tracking-tighter">{error}</p>}
    </div>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tracker'); 
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
      } catch (err) { console.error("Auth Error", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    getDoc(profileRef).then(s => s.exists() && setDailyGoal(s.data().dailyGoal || 2000));
    const historyCol = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
    const unsubHistory = onSnapshot(historyCol, (s) => {
      const items = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(items.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });
    return () => unsubHistory();
  }, [user]);

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayTotal = history.filter(h => new Date(h.timestamp).toDateString() === todayStr).reduce((s, i) => s + i.calories, 0);
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const total = history.filter(h => new Date(h.timestamp).toDateString() === d.toDateString()).reduce((s, m) => s + m.calories, 0);
      return { day: d.toLocaleDateString('ka-GE', {weekday: 'short'}), total };
    });
    return { todayTotal, last7Days };
  }, [history]);

  // 🧮 ლოკალური დათვლის ფუნქცია (Smart Fallback)
  const calculateLocally = (text) => {
    const parts = text.split(/,|\n|\+/);
    let totalCalories = 0;
    const ingredients = [];
    const steps = ["ლოკალური მონაცემთა ბაზის გამოყენება"];

    parts.forEach(part => {
      const cleanPart = part.toLowerCase().trim();
      if (!cleanPart) return;

      // რიცხვის ამოღება
      const numberMatch = cleanPart.match(/\d+/);
      const amount = numberMatch ? parseInt(numberMatch[0]) : 100;
      
      // პროდუქტის ძებნა (Fuzzy Match)
      let foundKey = null;
      let maxScore = 0;
      
      Object.keys(FOOD_DATABASE).forEach(key => {
        const keyLower = key.toLowerCase();
        // თუ ტექსტი შეიცავს გასაღებს ან პირიქით
        if (cleanPart.includes(keyLower) || keyLower.includes(cleanPart.replace(/\d+|გრ|გრამი|ცალი|ნაჭერი|კოვზი/g, '').trim())) {
          foundKey = key;
        }
      });

      if (foundKey) {
        const calPer100 = FOOD_DATABASE[foundKey];
        // თუ ხინკალია, ვითვლით ცალობით, თუ სხვაა - გრამობით (დაშვება: 100გ-ზეა ბაზა)
        const cal = foundKey === "ხინკალი" ? amount * calPer100 : Math.round((amount / 100) * calPer100);
        totalCalories += cal;
        ingredients.push(`${foundKey} (${amount}${foundKey === "ხინკალი" ? "ც" : "გრ"}) - ${cal} კკალ`);
      } else {
        ingredients.push(`${cleanPart} - ვერ მოიძებნა (0 კკალ)`);
      }
    });

    return {
      name: "ლოკალურად დათვლილი მენიუ",
      calories: totalCalories,
      ingredients,
      preparation: steps,
      time: "1 წთ"
    };
  };

  const processAI = useCallback(async (text, base64 = null) => {
    if (!user) return;
    setAiLoading(true); setError(null);
    setAiStatus('ვუკავშირდები AI-ს...');

    try {
      // 1. ვცდილობთ AI-სთან დაკავშირებას
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Dietitian. Return ONLY JSON: {"name": "Meal Name", "calories": number, "ingredients": ["X - Y kcal"], "preparation": ["Info"], "time": "5m"}. Language: Georgian. Input: ${text}` }] }]
        })
      });

      if (!response.ok) throw new Error("AI Offline");
      
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanedJson);
      
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...result, timestamp: Date.now() });
      setAiStatus('მზად არის!');
    } catch (e) {
      // 2. თუ AI გაითიშა, გადავდივართ ლოკალურ დათვლაზე
      console.warn("AI failed, switching to local DB");
      if (text) {
        const localResult = calculateLocally(text);
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...localResult, timestamp: Date.now() });
        setAiStatus('დათვლილია ლოკალური ბაზით');
      } else {
        setError("AI-მ ვერ ამოიცნო ფოტო. გთხოვთ ჩაწეროთ ტექსტი.");
      }
    } finally { 
      setAiLoading(false); 
      setTimeout(() => setAiStatus(''), 3000);
    }
  }, [user]);

  if (loading && !user) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-emerald-500 w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 max-w-md mx-auto relative flex flex-col font-sans overflow-hidden shadow-2xl border-x border-slate-100">
      
      <header className="bg-white pt-16 pb-10 px-8 sticky top-0 z-40 border-b border-slate-100 rounded-b-[4rem] shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-100">
              <Apple className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">My Health Hub</p>
               <h1 className="text-3xl font-black tracking-tighter text-slate-800">CalorieHub</h1>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-5 bg-slate-50 rounded-[1.4rem] text-slate-400 active:scale-90 transition-all border border-slate-100/50 hover:text-emerald-600"><Settings className="w-6 h-6" /></button>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-3">დღევანდელი ჯამი</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black tracking-tighter text-emerald-400">{stats.todayTotal}</p>
                <p className="text-sm text-slate-500 font-black">/ {dailyGoal}</p>
              </div>
            </div>
            <div className="text-right">
               <div className="flex items-center gap-2 text-emerald-400 mb-1.5 justify-end">
                  <TrendingUp className="w-5 h-5" />
                  <p className="font-black text-2xl leading-none">{Math.min(Math.round((stats.todayTotal / dailyGoal) * 100), 100)}%</p>
               </div>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">პროგრესი</p>
            </div>
          </div>
          <div className="h-4 w-full bg-slate-800/80 rounded-full overflow-hidden relative z-10 border border-slate-700/50 p-1">
            <div className={`h-full transition-all duration-1000 ease-out rounded-full ${stats.todayTotal > dailyGoal ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]'}`} style={{ width: `${Math.min((stats.todayTotal / dailyGoal) * 100, 100)}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-8 pt-10 pb-40 overflow-y-auto scrollbar-hide overscroll-contain">
        {activeTab === 'tracker' && (
          <div className="space-y-12">
            <TrackerInput onProcess={processAI} loading={aiLoading} aiStatus={aiStatus} error={error} />
            
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-3 px-4"><History className="w-4 h-4"/> დღევანდელი ისტორია</h3>
              {history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
                 <div className="py-20 flex flex-col items-center opacity-30 italic text-sm text-slate-400 border-4 border-dashed border-slate-100 rounded-[3.5rem] bg-white/50">
                    <Utensils className="w-12 h-12 mb-5 opacity-20" />
                    <p className="uppercase tracking-[0.3em] text-[9px] font-black">მონაცემები არ არის</p>
                 </div>
              ) : (
                history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).map(item => (
                  <div key={item.id} onClick={() => setSelectedRecipe(item)} className="bg-white p-7 rounded-[3rem] border border-slate-50 flex justify-between items-center shadow-sm cursor-pointer active:scale-95 transition-all group hover:border-emerald-200">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl border border-slate-100 group-hover:bg-emerald-50 transition-all">{item.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg leading-tight line-clamp-1">{item.name}</p>
                        <p className="text-[12px] text-slate-400 mt-2 flex items-center gap-2 font-medium tracking-tight"><Clock className="w-3.5 h-3.5" /> {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-black text-slate-800 tracking-tighter text-2xl leading-none">{item.calories}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">კკალ</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', item.id)); }} className="text-slate-200 hover:text-red-500 p-3 transition-colors active:scale-90"><Trash2 className="w-6 h-6" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-12 animate-in fade-in">
            <div className="bg-white p-8 rounded-[3.2rem] shadow-sm border border-slate-100">
              <div className="relative group">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 group-focus-within:text-emerald-500 transition-colors" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="მოძებნეთ რეცეპტი..." className="w-full pl-16 pr-8 py-6 bg-slate-50 border-none rounded-[2rem] outline-none text-base font-medium focus:ring-4 focus:ring-emerald-500/5 transition-all" />
              </div>
            </div>
            <div className="grid gap-12">
              {LOCAL_RECIPES.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((r, i) => (
                <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group transition-all active:scale-[0.98]">
                  <div className="h-52 w-full relative overflow-hidden bg-slate-100">
                    {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-12 h-12 opacity-20" /></div>}
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-1">{r.name}</h3>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-emerald-600 font-black">{r.calories} კკალ</span>
                      <button onClick={() => { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...r, timestamp: Date.now() }); setActiveTab('tracker'); }} className="bg-emerald-500 text-white p-3 rounded-xl active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-12 animate-in fade-in">
            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-[12px] font-black uppercase tracking-[0.35em] mb-12 text-slate-500 relative z-10">ბოლო 7 დღე</h3>
              <div className="flex items-end justify-between h-56 gap-4 relative z-10">
                {stats.last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-5 group">
                    <div className="w-full bg-slate-800/80 rounded-full relative h-40 overflow-hidden border border-slate-700/40 p-1">
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-full transition-all duration-1000 ease-out" style={{ height: `${Math.min((d.total / dailyGoal) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-white transition-colors">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-10 rounded-[3.2rem] border border-slate-100 text-center shadow-sm">
                <p className="text-sm text-slate-500 leading-relaxed font-medium italic">აქ აისახება თქვენი კვების პროგრესი დროის ჭრილში.</p>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[94%] max-w-[420px] bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[3.5rem] p-3 flex justify-between shadow-2xl z-50">
        {[ { id: 'tracker', icon: Utensils, label: 'დღიური' }, { id: 'recipes', icon: BookOpen, label: 'მენიუ' }, { id: 'stats', icon: BarChart3, label: 'პროგრესი' } ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-6 rounded-[2.8rem] transition-all duration-500 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.05]' : 'text-slate-300 hover:text-slate-600'}`}>
            <tab.icon className="w-7 h-7 mb-2.5" /><span className="text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="relative h-[480px]">
            <img src={selectedRecipe.image || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"} className="w-full h-full object-cover" alt="" />
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-12 left-10 p-6 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100"><ArrowLeft className="w-7 h-7 text-slate-800" /></button>
          </div>
          <div className="p-12 -mt-32 bg-white rounded-t-[7rem] relative z-10 min-h-screen border-t border-slate-50">
             <div className="mb-16 text-center">
                <span className="px-8 py-3 bg-emerald-50 text-emerald-600 text-[12px] font-black uppercase tracking-[0.35em] rounded-full border border-emerald-100/50 shadow-sm">დეტალები</span>
                <h1 className="text-4xl font-black text-slate-800 leading-[1.1] mb-12 mt-6 tracking-tight">{selectedRecipe.name}</h1>
                <div className="flex gap-6">
                  <div className="bg-slate-50/80 p-8 rounded-[3.5rem] flex-1 border border-slate-100 shadow-inner"><Flame className="w-8 h-8 mx-auto mb-4 text-orange-500" /><p className="font-black text-4xl text-slate-800 tracking-tighter">{selectedRecipe.calories}</p><p className="text-[11px] text-slate-400 uppercase font-black tracking-widest mt-3">კკალ</p></div>
                  <div className="bg-slate-50/80 p-8 rounded-[3.5rem] flex-1 border border-slate-100 shadow-inner"><Clock className="w-8 h-8 mx-auto mb-4 text-blue-500" /><p className="font-black text-4xl text-slate-800 tracking-tighter">{selectedRecipe.time || "5 წთ"}</p><p className="text-[11px] text-slate-400 uppercase font-black tracking-widest mt-3">დრო</p></div>
                </div>
             </div>
             <div className="space-y-16 pb-64">
                {selectedRecipe.ingredients && (
                  <div>
                    <h3 className="flex items-center gap-5 text-[15px] font-black uppercase text-slate-800 mb-10 tracking-[0.3em] border-b-2 border-slate-50 pb-6"><ListChecks className="w-6 h-6 text-emerald-500" /> პროდუქტების სია</h3>
                    <div className="grid gap-6">
                      {selectedRecipe.ingredients.map((ing, i) => <div key={i} className="bg-white p-8 rounded-[3rem] text-base font-bold text-slate-700 border border-slate-100 flex justify-between items-center shadow-sm"><span className="flex-1 pr-6 leading-relaxed">{ing}</span><div className="w-3.5 h-3.5 bg-emerald-400 rounded-full" /></div>)}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white w-full rounded-t-[6rem] p-16 animate-in slide-in-from-bottom duration-700 shadow-2xl">
            <h2 className="text-3xl font-black mb-14 text-center text-slate-800 uppercase tracking-[0.2em]">მიზანი</h2>
            <input type="number" value={dailyGoal} onChange={(e) => { const val = parseInt(e.target.value) || 2000; setDailyGoal(val); if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); }} className="w-full p-14 bg-slate-50 rounded-[4rem] text-8xl font-black text-center outline-none text-emerald-600 shadow-inner" />
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 text-white py-10 mt-12 rounded-[3rem] font-black uppercase text-[14px] tracking-[0.5em] active:scale-95 transition-all shadow-xl">შენახვა</button>
          </div>
        </div>
      )}
    </div>
  );
}
