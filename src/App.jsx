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
  TrendingUp, Zap, Info, Calculator, Sparkles, ChevronRight,
  Target, PieChart
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

// Gemini API Key - Vercel-ზე მუშაობისთვის პირდაპირ ჩაწერილია
const GEMINI_API_KEY = "AIzaSyAdSzDqKf73a9fzI94UpmeOTJTrnJHfWos";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'calorie-tracker-pro-v1';

// --- 🥗 ლოკალური რეცეპტების ბაზა ---
const LOCAL_RECIPES = [
  { id: 'r1', name: "ხინკალი (დიეტური)", calories: 75, time: "40 წთ", cuisine: "ქართული", budget: "დაბალი", ingredients: ["საქონლის ხორცი", "ფქვილი", "ხახვი"], preparation: ["მოზილეთ ცომი", "მოამზადეთ ფარში", "მოხარშეთ"], image: "https://images.unsplash.com/photo-1599307734173-97992c68600d?w=500" },
  { id: 'r2', name: "ქათმის სალათი მაწვნით", calories: 220, time: "15 წთ", cuisine: "ჯანსაღი", budget: "საშუალო", ingredients: ["ქათმის ფილე", "მაწონი", "მწვანილი"], preparation: ["მოხარშეთ ფილე", "დაჭერით", "შეურიეთ მაწონს"], image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" }
];

const RecipeCard = memo(({ recipe, onSelect, onAdd }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group transition-all active:scale-[0.98] hover:shadow-md">
    <div className="h-52 w-full relative overflow-hidden bg-slate-100">
      {recipe.image ? (
        <img src={recipe.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-12 h-12 opacity-20" /></div>
      )}
      <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{recipe.budget || "ბიუჯეტური"}</span>
        </div>
      </div>
    </div>
    <div className="p-6">
      <div className="flex justify-between items-start mb-5">
        <div className="flex-1 pr-3">
          <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-1">{recipe.name}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 tracking-wider">{recipe.cuisine || "მენიუ"}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-emerald-600 leading-none">{recipe.calories}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">კკალ</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSelect(recipe)} className="flex-1 bg-slate-50 text-slate-600 py-3.5 rounded-2xl font-bold text-[11px] transition-colors active:bg-slate-200">დეტალები</button>
        <button onClick={() => onAdd(recipe)} className="flex-1 bg-emerald-500 text-white py-3.5 rounded-2xl font-bold text-[11px] shadow-lg shadow-emerald-100 active:scale-95">დამატება</button>
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
  const [aiStatus, setAiStatus] = useState('');
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 1. ავტორიზაცია (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization failed", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. მონაცემების სინქრონიზაცია (Rule 1 & 2)
  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    getDoc(profileRef).then(s => s.exists() && setDailyGoal(s.data().dailyGoal || 2000));

    const historyCol = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
    const unsubHistory = onSnapshot(historyCol, (s) => {
      const items = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(items.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, (err) => {
      console.error("Firestore update failed", err);
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

  // 3. მაქსიმალურად გაფართოებული AI პროცესორი - FIXED MODEL AND KEY
  const processAI = async (text, base64 = null) => {
    if (!user || (!text && !base64)) return;
    setLoading(true); 
    setError(null);
    setAiStatus('მიმდინარეობს პროდუქტების სიღრმისეული ანალიზი...');

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        // ვიყენებთ საჯარო gemini-1.5-flash მოდელს
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: text || "Identify the products in the list." }, ...(base64 ? [{ inlineData: { mimeType: "image/jpeg", data: base64 } }] : [])] }],
            systemInstruction: { 
              parts: [{ text: `შენ ხარ უმაღლესი დონის ქართველი დიეტოლოგი. 
              ამოცანა: მომხმარებელი მოგაწვდის პროდუქტების სიას (მაგ: 2 ნაჭერი მწვადი, 200გრ პური, მაიონეზი).
              1. დაშალე სია კომპონენტებად.
              2. თითოეულს მიანიჭე ზუსტი კალორიულობა მითითებული რაოდენობის მიხედვით.
              3. მათემატიკურად დააჯამე ყველა კომპონენტის კალორია.
              
              დააბრუნე პასუხი მკაცრად JSON ფორმატში:
              {
                "name": "კერძის დასახელება",
                "calories": ჯამური_რიცხვი,
                "ingredients": ["პროდუქტი 1 (რაოდენობა) - X კკალ", "პროდუქტი 2 (რაოდენობა) - Y კკალ"],
                "preparation": ["ნაბიჯი 1", "ნაბიჯი 2"],
                "time": "წუთები"
              }
              გამოიყენე მხოლოდ ქართული ენა.` }] 
            },
            generationConfig: { 
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `კავშირის შეცდომა ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("AI-მ პასუხი ვერ დააგენერირა.");

        return JSON.parse(data.candidates[0].content.parts[0].text);
      } catch (e) {
        if (retries > 0) {
          setAiStatus(`ვცდი ხელახლა... (${retries})`);
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        throw e;
      }
    };

    try {
      const res = await fetchWithRetry();
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...res, timestamp: Date.now() });
      setAiStatus('წარმატებით დამუშავდა!');
      setInput('');
      setTimeout(() => setAiStatus(''), 3000);
    } catch (e) { 
      console.error("AI Error:", e);
      setError(`AI-მ ვერ დაამუშავა: ${e.message}`); 
    } finally { 
      setLoading(false); 
    }
  };

  if (loading && !user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-8 text-emerald-500">
      <div className="relative">
        <Loader2 className="animate-spin w-16 h-16 opacity-10" />
        <Utensils className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">CalorieHub იტვირთება...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 max-w-md mx-auto relative flex flex-col font-sans overflow-hidden shadow-2xl border-x border-slate-100">
      
      <header className="bg-white pt-16 pb-10 px-8 sticky top-0 z-40 border-b border-slate-100 rounded-b-[4rem] shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-100 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <Apple className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-2">Smart Dashboard</p>
               <h1 className="text-3xl font-black tracking-tighter text-slate-800">CalorieHub</h1>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-5 bg-slate-50 rounded-[1.4rem] text-slate-400 active:scale-90 transition-all border border-slate-100/50 hover:text-emerald-600 hover:bg-emerald-50"><Settings className="w-6 h-6" /></button>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
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
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">მიზანი</p>
            </div>
          </div>
          <div className="h-4 w-full bg-slate-800/80 rounded-full overflow-hidden relative z-10 border border-slate-700/50 p-1">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${stats.todayTotal > dailyGoal ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]'}`} 
              style={{ width: `${Math.min((stats.todayTotal / dailyGoal) * 100, 100)}%` }} 
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-8 pt-10 pb-40 overflow-y-auto scrollbar-hide overscroll-contain">
        
        {activeTab === 'tracker' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Zap className="w-5 h-5 text-emerald-600" /></div>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">დაამატეთ მენიუ</h3>
              </div>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="მაგ: 2 ნაჭერი მწვადი, 200გრ პური, 1 კოვზი მაიონეზი..." 
                className="w-full p-8 bg-slate-50 border-none rounded-[2.5rem] focus:ring-4 focus:ring-emerald-500/5 text-base min-h-[220px] outline-none placeholder:text-slate-300 resize-none font-medium leading-relaxed shadow-inner transition-all" 
              />
              <div className="flex gap-5 mt-8 relative z-10">
                <button 
                  onClick={() => processAI(input)} 
                  disabled={loading || !input.trim()} 
                  className="flex-[3] bg-slate-900 text-white font-black py-6 rounded-[2rem] flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all disabled:opacity-50 group/btn overflow-hidden"
                >
                  {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <Calculator className="w-6 h-6" />}
                  <span className="text-[11px] uppercase tracking-[0.25em]">დაანგარიშება</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  className="flex-1 bg-emerald-50 text-emerald-600 rounded-[2rem] border border-emerald-100 flex items-center justify-center active:scale-95 shadow-sm transition-all hover:bg-emerald-100"
                >
                  <Camera className="w-8 h-8" />
                  <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const r = new FileReader(); r.onloadend = () => processAI(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); }} />
                </button>
              </div>
              
              {aiStatus && (
                <div className="mt-6 py-4 px-6 bg-emerald-50/50 rounded-full border border-emerald-100/50 flex items-center justify-center gap-3 animate-pulse">
                   <Sparkles className="w-4 h-4 text-emerald-600" />
                   <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{aiStatus}</p>
                </div>
              )}
              
              {error && (
                <div className="mt-6 p-6 bg-red-50 rounded-[2.5rem] border border-red-100 flex items-start gap-4 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-bold leading-relaxed uppercase tracking-tighter">{error}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-3"><History className="w-4 h-4"/> დღევანდელი ისტორია</h3>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest">{history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length} კვება</span>
              </div>
              
              {history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
                 <div className="py-24 flex flex-col items-center opacity-30 italic text-sm text-slate-400 border-4 border-dashed border-slate-100 rounded-[4rem] bg-white/50">
                    <Utensils className="w-12 h-12 mb-5 opacity-20" />
                    <p className="uppercase tracking-[0.3em] text-[9px] font-black">მონაცემები არ არის</p>
                 </div>
              ) : (
                history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).map(item => (
                  <div key={item.id} onClick={() => setSelectedRecipe(item)} className="bg-white p-7 rounded-[3rem] border border-slate-50 flex justify-between items-center shadow-sm cursor-pointer active:scale-95 transition-all group hover:border-emerald-200">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-[1.4rem] flex items-center justify-center text-slate-400 font-black text-xl border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">{item.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg leading-tight line-clamp-1">{item.name}</p>
                        <p className="text-[12px] text-slate-400 mt-2 flex items-center gap-2 font-medium"><Clock className="w-3.5 h-3.5" /> {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
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
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="bg-white p-8 rounded-[3.2rem] shadow-sm border border-slate-100">
              <div className="relative group">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 group-focus-within:text-emerald-500 transition-colors" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="მოძებნეთ რეცეპტი..." className="w-full pl-16 pr-8 py-6 bg-slate-50 border-none rounded-[2rem] outline-none text-base font-medium focus:ring-4 focus:ring-emerald-500/5 transition-all" />
              </div>
            </div>
            <div className="grid gap-12">
              {LOCAL_RECIPES.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((r, i) => (
                <RecipeCard key={i} recipe={r} onSelect={setSelectedRecipe} onAdd={(rec) => { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...rec, timestamp: Date.now() }); setActiveTab('tracker'); }} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-[12px] font-black uppercase tracking-[0.35em] mb-12 text-slate-500 relative z-10">კვირის პროგრესი</h3>
              <div className="flex items-end justify-between h-56 gap-4 relative z-10">
                {stats.last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-5">
                    <div className="w-full bg-slate-800/80 rounded-full relative h-40 overflow-hidden border border-slate-700/40 p-1">
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-full transition-all duration-1000 ease-out" style={{ height: `${Math.min((d.total / dailyGoal) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
               <div className="bg-white p-10 rounded-[3.2rem] border border-slate-100 text-center shadow-sm group hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform"><PieChart className="w-7 h-7 text-blue-500" /></div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">საშუალო</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{Math.round(stats.last7Days.reduce((acc, curr) => acc + curr.total, 0) / 7)}</p>
               </div>
               <div className="bg-white p-10 rounded-[3.2rem] border border-slate-100 text-center shadow-sm group hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform"><Target className="w-7 h-7 text-orange-500" /></div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">პიკი</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{Math.max(...stats.last7Days.map(d => d.total))}</p>
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[94%] max-w-[420px] bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[3.5rem] p-3 flex justify-between shadow-2xl z-50">
        {[ 
          { id: 'tracker', icon: Utensils, label: 'დღიური' }, 
          { id: 'recipes', icon: BookOpen, label: 'მენიუ' },
          { id: 'stats', icon: BarChart3, label: 'სტატისტიკა' } 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-6 rounded-[2.8rem] transition-all duration-500 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.05]' : 'text-slate-300'}`}>
            <tab.icon className="w-7 h-7 mb-2.5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-700 ease-out">
          <div className="relative h-[480px]">
            {selectedRecipe.image ? <img src={selectedRecipe.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><ImageIcon className="w-28 h-28 opacity-10" /></div>}
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-12 left-10 p-6 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100"><ArrowLeft className="w-7 h-7 text-slate-800" /></button>
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent" />
          </div>
          <div className="p-12 -mt-32 bg-white rounded-t-[7rem] relative z-10 min-h-screen border-t border-slate-50 shadow-2xl">
             <div className="mb-16 text-center">
                <div className="flex justify-center mb-8"><span className="px-8 py-3 bg-emerald-50 text-emerald-600 text-[12px] font-black uppercase tracking-[0.35em] rounded-full border border-emerald-100/50 shadow-sm">{selectedRecipe.cuisine || "Deep AI Analysis"}</span></div>
                <h1 className="text-4xl font-black text-slate-800 leading-[1.1] mb-12 mt-2 tracking-tight">{selectedRecipe.name}</h1>
                <div className="flex gap-6">
                  <div className="bg-slate-50/80 p-8 rounded-[3.5rem] flex-1 border border-slate-100 shadow-inner"><Flame className="w-8 h-8 mx-auto mb-4 text-orange-500" /><p className="font-black text-4xl text-slate-800 tracking-tighter">{selectedRecipe.calories}</p><p className="text-[11px] text-slate-400 uppercase font-black tracking-widest mt-3">კკალ</p></div>
                  <div className="bg-slate-50/80 p-8 rounded-[3.5rem] flex-1 border border-slate-100 shadow-inner"><Clock className="w-8 h-8 mx-auto mb-4 text-blue-500" /><p className="font-black text-4xl text-slate-800 tracking-tighter">{selectedRecipe.time || "5 წთ"}</p><p className="text-[11px] text-slate-400 uppercase font-black tracking-widest mt-3">დრო</p></div>
                </div>
             </div>
             
             <div className="space-y-16 pb-64">
                {selectedRecipe.ingredients && (
                  <div>
                    <h3 className="flex items-center gap-5 text-[15px] font-black uppercase text-slate-800 mb-10 tracking-[0.3em] border-b-2 border-slate-50 pb-6"><ListChecks className="w-6 h-6 text-emerald-500" /> ინგრედიენტების ანალიზი</h3>
                    <div className="grid gap-6">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="bg-white p-8 rounded-[3rem] text-base font-bold text-slate-700 border border-slate-100 flex justify-between items-center shadow-sm group">
                            <span className="flex-1 pr-6 leading-relaxed">{ing}</span>
                            <div className="w-3.5 h-3.5 bg-emerald-400 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecipe.preparation && (
                  <div>
                    <h3 className="flex items-center gap-5 text-[15px] font-black uppercase text-slate-800 mb-10 tracking-[0.3em] border-b-2 border-slate-50 pb-6"><Calculator className="w-6 h-6 text-emerald-500" /> გამოთვლის ლოგიკა</h3>
                    <div className="space-y-8">
                      {selectedRecipe.preparation.map((step, i) => (
                        <div key={i} className="flex gap-8 p-10 bg-slate-50/60 border-2 border-dashed border-slate-200 rounded-[3.5rem]">
                          <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.8rem] flex items-center justify-center text-lg font-black shrink-0 shadow-2xl">{i + 1}</div>
                          <p className="text-lg text-slate-600 leading-[1.8] font-medium pt-2 italic">{step}</p>
                        </div>
                      ))}
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
            <div className="relative mb-20">
                <input 
                  type="number" 
                  value={dailyGoal} 
                  onChange={(e) => { 
                    const val = parseInt(e.target.value) || 2000; 
                    setDailyGoal(val); 
                    if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); 
                  }} 
                  className="w-full p-14 bg-slate-50 rounded-[4rem] text-8xl font-black text-center outline-none text-emerald-600 shadow-inner" 
                />
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black uppercase text-[14px] tracking-[0.5em] active:scale-95 transition-all">შენახვა</button>
          </div>
        </div>
      )}
    </div>
  );
}