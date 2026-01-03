import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
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
  DollarSign, ArrowLeft, ListChecks, Image as ImageIcon,
  TrendingUp, Zap
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'calorie-tracker-pro-v1';

// --- 🥗 ლოკალური რეცეპტების ბაზა ---
const LOCAL_RECIPES = [
  { id: 'r1', name: "ხინკალი (დიეტური, 1 ცალი)", calories: 75, time: "40 წთ", cuisine: "ქართული", budget: "დაბალი", ingredients: ["საქონლის ხორცი", "ფქვილი", "ხახვი"], preparation: ["მოზილეთ ცომი", "მოამზადეთ ფარში", "მოხარშეთ"], image: "https://images.unsplash.com/photo-1599307734173-97992c68600d?w=500" },
  { id: 'r2', name: "ქათმის სალათი მაწვნით", calories: 220, time: "15 წთ", cuisine: "ჯანსაღი", budget: "საშუალო", ingredients: ["ქათმის ფილე", "მაწონი", "მწვანილი"], preparation: ["მოხარშეთ ფილე", "დაჭერით", "შეურიეთ მაწონს"], image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" }
];

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
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{recipe.budget || "ბიუჯეტური"}</span>
        </div>
      </div>
    </div>
    <div className="p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-3">
          <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{recipe.name}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{recipe.cuisine || "მენიუ"}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-emerald-600 leading-none">{recipe.calories}</p>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">კკალ</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSelect(recipe)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold text-[10px] transition-colors active:bg-slate-200">დეტალები</button>
        <button onClick={() => onAdd(recipe)} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold text-[10px] shadow-lg shadow-emerald-100 active:scale-95">დამატება</button>
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
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
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
      setLoading(false);
    }, () => setError("კავშირის პრობლემა"));
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

  const processAI = async (text, base64 = null) => {
    if (!user || (!text && !base64)) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text || "Identify the food." }, ...(base64 ? [{ inlineData: { mimeType: "image/jpeg", data: base64 } }] : [])] }],
          systemInstruction: { parts: [{ text: "Experts Dietitian. You will be given a list of food items or a single dish. Calculate the TOTAL calories for all items combined. Identify the dish name. Return JSON ONLY: { \"name\": \"კერძის სახელი\", \"calories\": ჯამური_რიცხვი, \"ingredients\": [\"დეტალური სია რაოდენობებით\"], \"preparation\": [\"მომზადების ნაბიჯები თუ საჭიროა\"], \"time\": \"წუთები\" }. Use Georgian language." }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await response.json();
      const res = JSON.parse(data.candidates[0].content.parts[0].text);
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...res, timestamp: Date.now() });
      setInput('');
    } catch (e) { setError("AI-მ ვერ დაამუშავა ინფორმაცია. სცადეთ სხვაგვარად ჩაწერა."); }
    finally { setLoading(false); }
  };

  if (loading && !user) return <div className="h-screen flex items-center justify-center bg-slate-50 text-emerald-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#FBFDFF] text-slate-900 max-w-md mx-auto relative flex flex-col font-sans overflow-hidden shadow-2xl">
      
      {/* Header */}
      <header className="bg-white pt-12 pb-6 px-8 sticky top-0 z-40 border-b border-slate-50 rounded-b-[2.8rem] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100"><Apple className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">My Health Pro</p><h1 className="text-2xl font-black tracking-tight text-slate-800">კალორიების ჰაბი</h1></div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-transform"><Settings className="w-5 h-5" /></button>
        </div>

        <div className="bg-slate-900 rounded-[2.2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">დღეს მიღებული</p>
              <div className="flex items-baseline gap-1"><p className="text-4xl font-black tracking-tighter">{stats.todayTotal}</p><p className="text-sm text-slate-500">/ {dailyGoal}</p></div>
            </div>
            <div className="text-right">
               <div className="flex items-center gap-1.5 text-emerald-400 mb-1 justify-end"><TrendingUp className="w-4 h-4" /><p className="font-black text-xl leading-none">{Math.min(Math.round((stats.todayTotal / dailyGoal) * 100), 100)}%</p></div>
               <p className="text-[9px] text-slate-500 font-bold uppercase">შესრულება</p>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div className={`h-full transition-all duration-1000 rounded-full ${stats.todayTotal > dailyGoal ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((stats.todayTotal / dailyGoal) * 100, 100)}%` }} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pt-8 pb-32 overflow-y-auto scrollbar-hide">
        
        {activeTab === 'tracker' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[2.5rem] p-7 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-5"><Zap className="w-4 h-4 text-emerald-500" /><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">რა მიირთვით?</h3></div>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="მაგ: 2 ნაჭერი მწვადი, 200გრ პური, 1 კოვზი მაიონეზი..." 
                className="w-full p-5 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-emerald-500/10 text-sm min-h-[110px] outline-none placeholder:text-slate-300 resize-none font-medium leading-relaxed" 
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => processAI(input)} disabled={loading || !input.trim()} className="flex-[2] bg-slate-900 text-white font-bold py-4.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />} დათვლა
                </button>
                <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center justify-center active:scale-95">
                  <Camera className="w-6 h-6" /><input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const r = new FileReader(); r.onloadend = () => processAI(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); }} />
                </button>
              </div>
              {error && <p className="mt-4 text-[10px] text-red-500 font-bold flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><History className="w-4 h-4"/> დღევანდელი ჩანაწერები</h3>
              {history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
                 <div className="py-12 flex flex-col items-center opacity-30 italic text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-[2.5rem]">ისტორია ცარიელია</div>
              ) : (
                history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).map(item => (
                  <div key={item.id} onClick={() => setSelectedRecipe(item)} className="bg-white p-5 rounded-[2rem] border border-slate-50 flex justify-between items-center shadow-sm cursor-pointer active:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">{item.name?.charAt(0)}</div>
                      <div><p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p><p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className="font-black text-slate-700 tracking-tighter">{item.calories}</p><p className="text-[8px] text-slate-400 font-bold uppercase leading-none mt-0.5">კკალ</p></div>
                      <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', item.id)); }} className="text-slate-200 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="მოძებნეთ რეცეპტი..." className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-[1.5rem] outline-none text-sm font-medium" />
              </div>
            </div>
            <div className="grid gap-8">
              {LOCAL_RECIPES.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((r, i) => (
                <RecipeCard key={i} recipe={r} onSelect={setSelectedRecipe} onAdd={(rec) => { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...rec, timestamp: Date.now() }); setActiveTab('tracker'); }} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-slate-500 relative z-10">ბოლო 7 დღის ტრენდი</h3>
              <div className="flex items-end justify-between h-40 gap-2 relative z-10">
                {stats.last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-full bg-slate-800 rounded-full relative h-32 overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-full transition-all duration-1000" style={{ height: `${Math.min((d.total / dailyGoal) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
               <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
               <h4 className="text-xl font-black text-slate-800">ანალიტიკა</h4>
               <p className="text-sm text-slate-500 mt-2">შენი კვების რეჟიმი ავტომატურად ინახება და ჯამდება კვირის მიხედვით.</p>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[360px] bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[2.8rem] p-2 flex justify-between shadow-2xl z-50">
        {[ 
          { id: 'tracker', icon: Utensils, label: 'დღიური' }, 
          { id: 'recipes', icon: BookOpen, label: 'მენიუ' },
          { id: 'stats', icon: BarChart3, label: 'პროგრესი' } 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-4 rounded-[2.2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg scale-[1.03]' : 'text-slate-300'}`}>
            <tab.icon className="w-5 h-5 mb-1.5" /><span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Recipe Detail Overlay */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="relative h-72">
            {selectedRecipe.image ? <img src={selectedRecipe.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-200"><ImageIcon className="w-16 h-16 opacity-10" /></div>}
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-8 left-6 p-4 bg-white/95 rounded-2xl shadow-xl active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-slate-800" /></button>
          </div>
          <div className="p-9 -mt-12 bg-white rounded-t-[4rem] relative z-10 min-h-screen">
             <div className="mb-10 text-center">
                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">{selectedRecipe.cuisine || "ჯანსაღი კვება"}</span>
                <h1 className="text-2xl font-black text-slate-800 leading-tight mb-8 mt-2">{selectedRecipe.name}</h1>
                <div className="flex gap-4">
                  <div className="bg-slate-50 p-4 rounded-[1.8rem] flex-1 border border-slate-50"><Flame className="w-4 h-4 mx-auto mb-1 text-orange-400" /><p className="font-black text-xl text-slate-700">{selectedRecipe.calories}</p><p className="text-[8px] text-slate-400 uppercase font-black">კკალ</p></div>
                  <div className="bg-slate-50 p-4 rounded-[1.8rem] flex-1 border border-slate-50"><Clock className="w-4 h-4 mx-auto mb-1 text-blue-400" /><p className="font-black text-xl text-slate-700">{selectedRecipe.time || "15 წთ"}</p><p className="text-[8px] text-slate-400 uppercase font-black">დრო</p></div>
                </div>
             </div>
             
             <div className="space-y-10 pb-40">
                {selectedRecipe.ingredients && (
                  <div>
                    <h3 className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-800 mb-5 tracking-[0.2em]"><ListChecks className="w-4 h-4 text-emerald-500" /> ინგრედიენტები</h3>
                    <div className="grid gap-2">
                      {selectedRecipe.ingredients.map((ing, i) => <div key={i} className="bg-slate-50 p-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-50">{ing}</div>)}
                    </div>
                  </div>
                )}
                
                {selectedRecipe.preparation && (
                  <div>
                    <h3 className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-800 mb-5 tracking-[0.2em]"><ChefHat className="w-4 h-4 text-emerald-500" /> მომზადების წესი</h3>
                    <div className="space-y-4">
                      {selectedRecipe.preparation.map((step, i) => (
                        <div key={i} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white w-full rounded-t-[3.5rem] p-10 animate-in slide-in-from-bottom shadow-2xl">
            <h2 className="text-xl font-black mb-8 text-center tracking-tight">დღიური მიზანი</h2>
            <input type="number" value={dailyGoal} onChange={(e) => { const val = parseInt(e.target.value) || 2000; setDailyGoal(val); if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); }} className="w-full p-6 bg-slate-50 rounded-[1.8rem] text-3xl font-black text-center outline-none mb-8" />
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 text-white py-5 rounded-[1.8rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-transform">შენახვა</button>
          </div>
        </div>
      )}
    </div>
  );
}