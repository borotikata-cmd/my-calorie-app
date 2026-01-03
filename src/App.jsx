import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, getDoc, deleteDoc, query 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Utensils, Camera, Calculator, Trash2, Plus, 
  Settings, History, BarChart3, BookOpen, 
  Loader2, CheckCircle2, AlertCircle, Search, 
  Clock, Flame, Apple, Sparkles, ChefHat, 
  DollarSign, ArrowLeft, ListChecks, Image as ImageIcon,
  ChevronRight, TrendingUp, Zap
} from 'lucide-react';

// --- ✅ შენი პირადი Firebase კონფიგურაცია ✅ ---
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
const appId = "calorie-tracker-pro-v1";

// --- 🥗 ლოკალური რეცეპტების ბაზა (100-მდე რეცეპტი) ---
const LOCAL_RECIPES = [
  { id: 'r1', name: "ხინკალი (დიეტური, 1 ცალი)", calories: 75, time: "40 წთ", cuisine: "ქართული", budget: "დაბალი", ingredients: ["საქონლის ხორცი", "ფქვილი", "ხახვი"], preparation: ["მოზილეთ ცომი", "მოამზადეთ ფარში", "მოხარშეთ"], image: "https://images.unsplash.com/photo-1599307734173-97992c68600d?w=500" },
  { id: 'r2', name: "ქათმის სალათი მაწვნით", calories: 220, time: "15 წთ", cuisine: "ჯანსაღი", budget: "საშუალო", ingredients: ["ქათმის ფილე", "მაწონი", "მწვანილი"], preparation: ["მოხარშეთ ფილე", "დაჭერით", "შეურიეთ მაწონს"], image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" },
  { id: 'r3', name: "ოსპის წვნიანი", calories: 190, time: "30 წთ", cuisine: "თურქული", budget: "დაბალი", ingredients: ["ოსპი", "სტაფილო", "ხახვი"], preparation: ["მოხარშეთ ინგრედიენტები", "დააბლენდერეთ"], image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500" },
  { id: 'r4', name: "ავოკადოს ტოსტი", calories: 310, time: "10 წთ", cuisine: "ევროპული", budget: "მაღალი", ingredients: ["პური", "ავოკადო", "კვერცხი"], preparation: ["გახაუხეთ პური", "დაჭყლიტეთ ავოკადო", "დაადეთ კვერცხი"], image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500" },
  { id: 'r5', name: "შქმერული (ლაით)", calories: 380, time: "45 წთ", cuisine: "ქართული", budget: "მაღალი", ingredients: ["ქათამი", "ნიორი", "რძე 1.5%"], preparation: ["შეწვით ქათამი", "მოამზადეთ რძის და ნივრის სოუსი"], image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500" },
  { id: 'r6', name: "ისპანახის ფხალი", calories: 140, time: "20 წთ", cuisine: "ქართული", budget: "დაბალი", ingredients: ["ისპანახი", "ნიგოზი", "სუნელები"], preparation: ["მოთუშეთ ისპანახი", "შეაზავეთ ნიგვზით"], image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" },
  { id: 'r7', name: "ორაგული სტეიკი", calories: 410, time: "20 წთ", cuisine: "ევროპული", budget: "მაღალი", ingredients: ["ორაგული", "ლიმონი", "ბროკოლი"], preparation: ["შეწვით გრილზე", "მიირთვით ლიმონით"], image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500" },
  { id: 'r8', name: "ხაჭაპური იმერული (1 ნაჭერი)", calories: 290, time: "30 წთ", cuisine: "ქართული", budget: "საშუალო", ingredients: ["ფქვილი", "ყველი", "კვერცხი"], preparation: ["მოამზადეთ ცომი", "ჩადეთ ყველი", "გამოაცხვეთ"], image: "https://images.unsplash.com/photo-1608039755581-925164a2164b?w=500" }
];

// დამატებითი 90+ რეცეპტის ავტომატური გენერაცია ბაზისთვის
for (let i = 1; i <= 92; i++) {
  LOCAL_RECIPES.push({
    id: `auto-${i}`,
    name: `კერძი #${i + 8}`,
    calories: Math.floor(Math.random() * (600 - 100) + 100),
    time: "20 წთ",
    cuisine: i % 2 === 0 ? "საერთაშორისო" : "ქართული",
    budget: i % 3 === 0 ? "მაღალი" : "დაბალი",
    ingredients: ["ინგრედიენტი 1", "ინგრედიენტი 2"],
    preparation: ["ნაბიჯი 1", "ნაბიჯი 2"],
    image: `https://images.unsplash.com/photo-${1546069901 + i}?w=400`
  });
}

// --- კომპონენტები ---

const RecipeCard = memo(({ recipe, onSelect, onAdd }) => (
  <div className="bg-white rounded-[2.2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group transition-all active:scale-[0.98] hover:shadow-md">
    <div className="h-44 w-full relative overflow-hidden bg-slate-100">
      {recipe.image ? (
        <img src={recipe.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-10 h-10 opacity-20" /></div>
      )}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{recipe.budget}</span>
        </div>
      </div>
    </div>
    <div className="p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-3">
          <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{recipe.name}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{recipe.cuisine}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-emerald-600 leading-none">{recipe.calories}</p>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">კკალ</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSelect(recipe)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold text-[10px] transition-colors active:bg-slate-200">დეტალები</button>
        <button onClick={() => onAdd(recipe.name, recipe.calories)} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold text-[10px] shadow-lg shadow-emerald-100 active:scale-95">დამატება</button>
      </div>
    </div>
  </div>
));

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tracker'); 
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBudget, setActiveBudget] = useState('ყველა');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 1. ავტორიზაცია
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error(err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. მონაცემების მოსმენა
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

  const todayHistory = useMemo(() => 
    history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()),
  [history]);

  const totalToday = todayHistory.reduce((s, i) => s + i.calories, 0);
  const progressPercent = Math.min((totalToday / dailyGoal) * 100, 100);

  // 3. AI პროცესორი
  const processAI = async (text, base64 = null, type = 'count') => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text || "Identify this food" }, ...(base64 ? [{ inlineData: { mimeType: "image/jpeg", data: base64 } }] : [])] }],
          systemInstruction: { parts: [{ text: "Experts Dietitian. Identify food and estimate calories. Return JSON: { \"name\": \"საკვების სახელი\", \"calories\": number }." }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await response.json();
      const res = JSON.parse(data.candidates[0].content.parts[0].text);
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...res, timestamp: Date.now() });
      setInput('');
    } catch (e) { setError("AI კავშირი ვერ დამყარდა."); }
    finally { setLoading(false); }
  };

  const filteredRecipes = useMemo(() => {
    return LOCAL_RECIPES.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBudget = activeBudget === 'ყველა' || r.budget === activeBudget;
      return matchesSearch && matchesBudget;
    }).slice(0, 30);
  }, [searchQuery, activeBudget]);

  if (loading && !user) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#FBFDFF] text-slate-900 max-w-md mx-auto relative flex flex-col font-sans overflow-hidden safe-top safe-bottom shadow-2xl">
      
      {/* --- App Header (Sticky) --- */}
      <header className="bg-white pt-10 pb-6 px-8 sticky top-0 z-40 border-b border-slate-50 rounded-b-[2.8rem] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Apple className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">My Health Pro</p>
               <h1 className="text-2xl font-black tracking-tight text-slate-800">კალორიების ჰაბი</h1>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-transform"><Settings className="w-5 h-5" /></button>
        </div>

        {/* Progress Display */}
        <div className="bg-slate-900 rounded-[2.2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">დღევანდელი ჯამი</p>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-black tracking-tighter">{totalToday}</p>
                <p className="text-sm text-slate-500">/ {dailyGoal} კკალ</p>
              </div>
            </div>
            <div className="text-right">
               <div className="flex items-center gap-1.5 text-emerald-400 mb-1 justify-end">
                  <TrendingUp className="w-4 h-4" />
                  <p className="font-black text-xl leading-none">{Math.round(progressPercent)}%</p>
               </div>
               <p className="text-[9px] text-slate-500 font-bold uppercase">შესრულება</p>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${totalToday > dailyGoal ? 'bg-orange-500' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 px-6 pt-8 pb-32 overflow-y-auto scroll-smooth scrollbar-hide overscroll-contain">
        
        {/* VIEW 1: TRACKER */}
        {activeTab === 'tracker' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[2.5rem] p-7 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                 <Zap className="w-4 h-4 text-emerald-500" />
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">რა მიირთვით?</h3>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="მაგ: 1 ხინკალი ან 200გრ ქათამი..."
                className="w-full p-5 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-emerald-500/10 transition-all min-h-[110px] text-sm text-slate-700 resize-none mb-5 outline-none placeholder:text-slate-300"
              />
              <div className="flex gap-3">
                <button onClick={() => processAI(input)} disabled={loading || !input.trim()} className="flex-[2] bg-slate-900 text-white font-bold py-4.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />} დათვლა
                </button>
                <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 transition-all flex items-center justify-center active:scale-95">
                  <Camera className="w-6 h-6" />
                  <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const r = new FileReader(); r.onloadend = () => processAI(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); }} />
                </button>
              </div>
              {error && <p className="mt-4 text-[10px] text-red-500 font-bold flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><History className="w-4 h-4"/> დღევანდელი ჩანაწერები</h3>
              {todayHistory.length === 0 ? (
                 <div className="py-12 flex flex-col items-center opacity-30 italic text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-[2.5rem]">ისტორია ცარიელია</div>
              ) : (
                todayHistory.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-50 flex justify-between items-center shadow-sm animate-in zoom-in-95">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">{item.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className="font-black text-slate-700 tracking-tighter">{item.calories}</p><p className="text-[8px] text-slate-400 font-bold uppercase leading-none mt-0.5">კკალ</p></div>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', item.id))} className="text-slate-200 hover:text-red-400 p-2 transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: HUB */}
        {activeTab === 'recipes' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-5 sticky top-2 z-10 backdrop-blur-md">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="მოძებნეთ რეცეპტი..." className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-emerald-500/10 outline-none text-sm font-medium" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {['ყველა', 'დაბალი', 'საშუალო', 'მაღალი'].map(b => (
                  <button key={b} onClick={() => setActiveBudget(b)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeBudget === b ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{b} ბიუჯეტი</button>
                ))}
              </div>
            </div>
            <div className="grid gap-8">
              {filteredRecipes.map((r, i) => (
                <RecipeCard key={i} recipe={r} onSelect={setSelectedRecipe} onAdd={(name, calories) => { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { name, calories: Number(calories), timestamp: Date.now() }); setActiveTab('tracker'); }} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- Fixed Bottom Navigation --- */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-[340px] bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[2.8rem] p-2.5 flex justify-between shadow-[0_25px_50px_rgba(0,0,0,0.1)] z-50">
        {[ { id: 'tracker', icon: Utensils, label: 'ტრეკერი' }, { id: 'recipes', icon: BookOpen, label: 'ჰაბი' } ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-4 rounded-[2.2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg scale-[1.03]' : 'text-slate-300 hover:text-slate-500'}`}>
            <tab.icon className="w-5 h-5 mb-1.5" /><span className="text-[10px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Recipe Detail Overlay */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="relative h-80">
            {selectedRecipe.image ? <img src={selectedRecipe.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-200"><ImageIcon className="w-16 h-16 opacity-10" /></div>}
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-8 left-6 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl active:scale-90"><ArrowLeft className="w-5 h-5 text-slate-800" /></button>
          </div>
          <div className="p-9 -mt-12 bg-white rounded-t-[4rem] relative z-10 min-h-screen">
             <div className="mb-10 text-center">
                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">{selectedRecipe.cuisine} • {selectedRecipe.budget} ბიუჯეტი</span>
                <h1 className="text-3xl font-black text-slate-800 leading-tight mb-8 mt-2">{selectedRecipe.name}</h1>
                <div className="flex gap-5">
                  <div className="bg-slate-50 p-5 rounded-[2.2rem] flex-1 text-center border border-slate-50"><Flame className="w-4 h-4 mx-auto mb-2 text-orange-400" /><p className="font-black text-2xl text-slate-700 leading-none">{selectedRecipe.calories}</p><p className="text-[9px] text-slate-400 uppercase font-black mt-2 tracking-widest">კკალ</p></div>
                  <div className="bg-slate-50 p-5 rounded-[2.2rem] flex-1 text-center border border-slate-50"><Clock className="w-4 h-4 mx-auto mb-2 text-blue-400" /><p className="font-black text-2xl text-slate-700 leading-none">{selectedRecipe.time || "15"}</p><p className="text-[9px] text-slate-400 uppercase font-black mt-2 tracking-widest">წუთი</p></div>
                </div>
             </div>
             <div className="space-y-12 pb-40">
                <div><h3 className="flex items-center gap-3 text-xs font-black uppercase text-slate-800 mb-6 tracking-[0.3em]"><ListChecks className="w-4 h-4 text-emerald-500" /> ინგრედიენტები</h3>
                  <div className="grid gap-3">{selectedRecipe.ingredients?.map((ing, i) => <div key={i} className="bg-slate-50/50 p-4.5 rounded-2xl flex items-center gap-4 text-sm font-bold text-slate-600 border border-slate-50/50"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> {ing}</div>)}</div>
                </div>
                <div><h3 className="flex items-center gap-3 text-xs font-black uppercase text-slate-800 mb-6 tracking-[0.3em]"><ChefHat className="w-4 h-4 text-emerald-500" /> მომზადების წესი</h3>
                  <div className="space-y-5">{selectedRecipe.preparation?.map((step, i) => <div key={i} className="flex gap-5 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm"><div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[11px] font-black shrink-0">{i + 1}</div><p className="text-sm text-slate-600 leading-relaxed font-medium pt-1">{step}</p></div>)}</div>
                </div>
             </div>
             <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white/90 to-transparent"><button onClick={() => { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { name: selectedRecipe.name, calories: Number(selectedRecipe.calories), timestamp: Date.now() }); setSelectedRecipe(null); setActiveTab('tracker'); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all tracking-widest text-xs uppercase">დამატება დღიურში</button></div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white w-full rounded-t-[3.5rem] p-10 shadow-2xl animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
            <h2 className="text-2xl font-black mb-10 tracking-tight text-slate-800 text-center">პარამეტრები</h2>
            <div className="relative mb-10 group"><input type="number" value={dailyGoal} onChange={(e) => { const val = parseInt(e.target.value) || 2000; setDailyGoal(val); if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); }} className="w-full p-7 bg-slate-50 rounded-[2.2rem] text-4xl font-black outline-none transition-all text-center text-slate-800" /><p className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase text-xs tracking-widest pointer-events-none">კკალ</p></div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[2.5rem] font-black shadow-2xl active:scale-95 transition-all tracking-widest uppercase text-xs">შენახვა</button>
          </div>
        </div>
      )}
    </div>
  );
}