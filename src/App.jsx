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
  TrendingUp, Zap, Info, Calculator, Sparkles
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

// სისტემის API გასაღები - ცარიელი სტრიქონი გარემოს მიერ ავტომატური მოწოდებისთვის
const GEMINI_API_KEY = "";

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
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group transition-all active:scale-[0.98] hover:shadow-md">
    <div className="h-48 w-full relative overflow-hidden bg-slate-100">
      {recipe.image ? (
        <img src={recipe.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
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
        console.error("Auth Failed", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
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
      setLoading(false);
    }, (err) => {
      setError("მონაცემთა ბაზის შეცდომა.");
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

  // 3. მაქსიმალურად გაფართოებული AI პროცესორი
  const processAI = async (text, base64 = null) => {
    if (!user || (!text && !base64)) return;
    setLoading(true); 
    setError(null);
    setAiStatus('ვამზადებ კერძის ანალიზს...');

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: text || "Identify this food." }, ...(base64 ? [{ inlineData: { mimeType: "image/jpeg", data: base64 } }] : [])] }],
            systemInstruction: { 
              parts: [{ text: `შენ ხარ უმაღლესი დონის დიეტოლოგი და მათემატიკური ანალიტიკოსი. 
              
              კრიტიკული დავალება:
              მომხმარებელი მოგაწვდის პროდუქტების ჩამონათვალს (მაგ: "2 ნაჭერი მწვადი, 200გრ პური, მაიონეზი").
              1. დაშალე ეს სია ინდივიდუალურ პროდუქტებად.
              2. თითოეულ პროდუქტს მიანიჭე ზუსტი კალორიულობა მითითებული რაოდენობის მიხედვით.
              3. შეასრულე მათემატიკური შეკრება (Summation) უმაღლესი სიზუსტით.
              4. თუ მომხმარებელს აქვს დაშვებული ორთოგრაფიული შეცდომა (მაგ: "ფური" ნაცვლად "პური"), აუცილებლად მიხვდი რა იგულისხმა.
              5. შექმენი ერთიანი კერძის დასახელება ამ ინგრედიენტებისგან.
              
              დააბრუნე პასუხი მკაცრად JSON ფორმატში:
              {
                "name": "კერძის კრებსითი სახელი",
                "calories": ჯამური_მათემატიკური_რიცხვი,
                "ingredients": [
                   "პროდუქტი 1 (რაოდენობა) - X კკალ",
                   "პროდუქტი 2 (რაოდენობა) - Y კკალ"
                ],
                "preparation": [
                   "ნაბიჯი 1: პროდუქტების იდენტიფიცირება",
                   "ნაბიჯი 2: კალორიების ცალკე დათვლა",
                   "ნაბიჯი 3: ჯამური კალორიების მათემატიკური შეკრება"
                ],
                "time": "მომზადების/დამუშავების სავარაუდო დრო"
              }
              
              პასუხი დააბრუნე მხოლოდ ქართულად. იყავი მაქსიმალურად დეტალური.` }] 
            },
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.1 // სიზუსტისთვის
            }
          })
        });

        if (!response.ok) throw new Error("Network Error");
        const data = await response.json();
        
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Empty AI Response");

        let resText = data.candidates[0].content.parts[0].text;
        resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(resText);
      } catch (e) {
        if (retries > 0) {
          setAiStatus(`კავშირის აღდგენა... (${retries})`);
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        throw e;
      }
    };

    try {
      const res = await fetchWithRetry();
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...res, timestamp: Date.now() });
      setAiStatus('მონაცემები წარმატებით დაჯამდა!');
      setInput('');
      setTimeout(() => setAiStatus(''), 2000);
    } catch (e) { 
      console.error("Critical AI Error", e);
      setError("AI-მ ვერ შეძლო პროდუქტების დაჯამება. გთხოვთ სცადოთ ხელახლა."); 
    } finally { 
      setLoading(false); 
    }
  };

  if (loading && !user) return <div className="h-screen flex flex-col items-center justify-center bg-white gap-6 animate-pulse text-emerald-500"><Loader2 className="animate-spin w-12 h-12" /><p className="font-black text-sm uppercase tracking-widest">CalorieHub იტვირთება...</p></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 max-w-md mx-auto relative flex flex-col font-sans overflow-hidden shadow-2xl border-x border-slate-100">
      
      {/* Header Section */}
      <header className="bg-white pt-14 pb-8 px-8 sticky top-0 z-40 border-b border-slate-100 rounded-b-[3.5rem] shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-emerald-100 transform rotate-3">
              <Apple className="w-7 h-7" />
            </div>
            <div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">My Health Pro</p>
               <h1 className="text-2xl font-black tracking-tight text-slate-800">კალორიების ჰაბი</h1>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all border border-slate-100/50"><Settings className="w-6 h-6" /></button>
        </div>

        {/* Dynamic Progress Card */}
        <div className="bg-slate-900 rounded-[2.8rem] p-7 text-white shadow-2xl relative overflow-hidden group">
          <div className="flex justify-between items-end mb-5 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">დღევანდელი ჯამი</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-5xl font-black tracking-tighter text-emerald-400">{stats.todayTotal}</p>
                <p className="text-sm text-slate-500 font-bold">/ {dailyGoal} კკალ</p>
              </div>
            </div>
            <div className="text-right">
               <div className="flex items-center gap-1.5 text-emerald-400 mb-1 justify-end">
                  <TrendingUp className="w-4 h-4" />
                  <p className="font-black text-2xl leading-none">{Math.min(Math.round((stats.todayTotal / dailyGoal) * 100), 100)}%</p>
               </div>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">პროგრესი</p>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden relative z-10 border border-slate-700/30">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${stats.todayTotal > dailyGoal ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`} 
              style={{ width: `${Math.min((stats.todayTotal / dailyGoal) * 100, 100)}%` }} 
            />
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1 px-7 pt-9 pb-36 overflow-y-auto scrollbar-hide overscroll-contain">
        
        {activeTab === 'tracker' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* Input Section */}
            <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm relative">
              <div className="flex items-center gap-2.5 mb-6">
                 <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center"><Zap className="w-4 h-4 text-emerald-600" /></div>
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">დაამატეთ მენიუ</h3>
              </div>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="მაგ: 2 ნაჭერი მწვადი, 200გრ შოთის პური, 1 კოვზი მაიონეზი..." 
                className="w-full p-7 bg-slate-50 border-none rounded-[2rem] focus:ring-2 focus:ring-emerald-500/10 text-sm min-h-[160px] outline-none placeholder:text-slate-300 resize-none font-medium leading-relaxed shadow-inner" 
              />
              <div className="flex gap-4 mt-6 relative z-10">
                <button 
                  onClick={() => processAI(input)} 
                  disabled={loading || !input.trim()} 
                  className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-[1.8rem] flex flex-col items-center justify-center gap-1.5 shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Calculator className="w-5 h-5" />}
                  <span className="text-[10px] uppercase tracking-[0.2em]">დაანგარიშება</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  className="flex-1 bg-emerald-50 text-emerald-600 rounded-[1.8rem] border border-emerald-100 flex items-center justify-center active:scale-95 shadow-sm transition-all"
                >
                  <Camera className="w-7 h-7" />
                  <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const r = new FileReader(); r.onloadend = () => processAI(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); }} />
                </button>
              </div>
              
              {aiStatus && <p className="mt-5 text-[10px] text-emerald-600 font-black animate-pulse flex items-center gap-2.5 uppercase tracking-tighter bg-emerald-50/50 py-3 px-5 rounded-full w-fit mx-auto border border-emerald-100/50"><Sparkles className="w-3.5 h-3.5" /> {aiStatus}</p>}
              {error && <div className="mt-5 p-5 bg-red-50 rounded-3xl border border-red-100 flex items-start gap-3.5"><AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /><p className="text-[11px] text-red-600 font-bold leading-relaxed">{error}</p></div>}
            </div>

            {/* History Section */}
            <div className="space-y-5">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2.5"><History className="w-4 h-4"/> დღევანდელი ისტორია</h3>
                <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">{history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length} ჩანაწერი</span>
              </div>
              
              {history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
                 <div className="py-20 flex flex-col items-center opacity-30 italic text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-[3.5rem] bg-white/50">
                    <Utensils className="w-10 h-10 mb-4 opacity-20" />
                    <p>ჯერჯერობით ისტორია ცარიელია</p>
                 </div>
              ) : (
                history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).map(item => (
                  <div key={item.id} onClick={() => setSelectedRecipe(item)} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 flex justify-between items-center shadow-sm cursor-pointer active:bg-slate-50 transition-all group hover:border-emerald-100">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-base border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">{item.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-[15px] leading-tight line-clamp-1">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5" /> {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="font-black text-slate-800 tracking-tighter text-xl leading-none">{item.calories}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">კკალ</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', item.id)); }} className="text-slate-200 hover:text-red-500 p-2.5 transition-colors active:scale-90"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recipes Hub View */}
        {activeTab === 'recipes' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-white p-7 rounded-[2.8rem] shadow-sm border border-slate-100 space-y-6">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="მოძებნეთ რეცეპტი..." className="w-full pl-14 pr-7 py-5 bg-slate-50 border-none rounded-[1.8rem] outline-none text-sm font-medium focus:ring-2 focus:ring-emerald-500/10" />
              </div>
            </div>
            <div className="grid gap-10">
              {LOCAL_RECIPES.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((r, i) => (
                <RecipeCard key={i} recipe={r} onSelect={setSelectedRecipe} onAdd={(rec) => { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...rec, timestamp: Date.now() }); setActiveTab('tracker'); }} />
              ))}
            </div>
          </div>
        )}

        {/* Statistics View */}
        {activeTab === 'stats' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] mb-10 text-slate-500 relative z-10">ბოლო 7 დღის ტრენდი</h3>
              <div className="flex items-end justify-between h-48 gap-3 relative z-10">
                {stats.last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                    <div className="w-full bg-slate-800 rounded-full relative h-36 overflow-hidden border border-slate-700/50">
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ height: `${Math.min((d.total / dailyGoal) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-white transition-colors">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[70px] -mr-20 -mt-20" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
               <div className="bg-white p-8 rounded-[2.8rem] border border-slate-100 text-center shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Calculator className="w-6 h-6 text-blue-500" /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">საშუალო</p>
                  <p className="text-2xl font-black text-slate-800">{Math.round(stats.last7Days.reduce((acc, curr) => acc + curr.total, 0) / 7)}</p>
               </div>
               <div className="bg-white p-8 rounded-[2.8rem] border border-slate-100 text-center shadow-sm">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Flame className="w-6 h-6 text-orange-500" /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">რეკორდი</p>
                  <p className="text-2xl font-black text-slate-800">{Math.max(...stats.last7Days.map(d => d.total))}</p>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center">
               <TrendingUp className="w-12 h-12 text-emerald-500 mx-auto mb-5" />
               <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">ანალიტიკა</h4>
               <p className="text-sm text-slate-500 mt-3 leading-relaxed font-medium">თქვენი კვების რეჟიმი ავტომატურად ინახება და მუშავდება AI-ს მიერ კვირის ჭრილში.</p>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Menu */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-[3.2rem] p-2.5 flex justify-between shadow-2xl z-50">
        {[ 
          { id: 'tracker', icon: Utensils, label: 'დღიური' }, 
          { id: 'recipes', icon: BookOpen, label: 'მენიუ' },
          { id: 'stats', icon: BarChart3, label: 'პროგრესი' } 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-5 rounded-[2.5rem] transition-all duration-500 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-[1.03]' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}>
            <tab.icon className="w-6 h-6 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Full-Screen Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-700 ease-out">
          <div className="relative h-[400px]">
            {selectedRecipe.image ? <img src={selectedRecipe.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><ImageIcon className="w-24 h-24 opacity-10" /></div>}
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-10 left-8 p-5 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl active:scale-90 transition-all border border-slate-100"><ArrowLeft className="w-6 h-6 text-slate-800" /></button>
          </div>
          <div className="p-10 -mt-20 bg-white rounded-t-[5rem] relative z-10 min-h-screen">
             <div className="mb-14 text-center">
                <div className="flex justify-center mb-6"><span className="px-6 py-2.5 bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-[0.25em] rounded-full border border-emerald-100/50">{selectedRecipe.cuisine || "დეტალური ანალიზი"}</span></div>
                <h1 className="text-4xl font-black text-slate-800 leading-tight mb-10 mt-2">{selectedRecipe.name}</h1>
                <div className="flex gap-5">
                  <div className="bg-slate-50 p-7 rounded-[2.8rem] flex-1 border border-slate-100 shadow-inner group hover:bg-emerald-50 transition-colors duration-500"><Flame className="w-7 h-7 mx-auto mb-3 text-orange-500 group-hover:scale-110 transition-transform" /><p className="font-black text-3xl text-slate-800 tracking-tighter">{selectedRecipe.calories}</p><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-2">კკალ</p></div>
                  <div className="bg-slate-50 p-7 rounded-[2.8rem] flex-1 border border-slate-100 shadow-inner group hover:bg-blue-50 transition-colors duration-500"><Clock className="w-7 h-7 mx-auto mb-3 text-blue-500 group-hover:scale-110 transition-transform" /><p className="font-black text-3xl text-slate-800 tracking-tighter">{selectedRecipe.time || "5 წთ"}</p><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-2">დრო</p></div>
                </div>
             </div>
             
             <div className="space-y-14 pb-48">
                {selectedRecipe.ingredients && (
                  <div>
                    <h3 className="flex items-center gap-4 text-[12px] font-black uppercase text-slate-800 mb-8 tracking-[0.25em] border-b border-slate-50 pb-5"><ListChecks className="w-5 h-5 text-emerald-500" /> პროდუქტების დაშლა</h3>
                    <div className="grid gap-4">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] text-sm font-bold text-slate-700 border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                            <span className="flex-1 pr-5 leading-relaxed">{ing}</span>
                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecipe.preparation && (
                  <div>
                    <h3 className="flex items-center gap-4 text-[12px] font-black uppercase text-slate-800 mb-8 tracking-[0.25em] border-b border-slate-50 pb-5"><Calculator className="w-5 h-5 text-emerald-500" /> გამოთვლის ლოგიკა</h3>
                    <div className="space-y-6">
                      {selectedRecipe.preparation.map((step, i) => (
                        <div key={i} className="flex gap-6 p-7 bg-slate-50/70 border border-dashed border-slate-200 rounded-[2.5rem]">
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-[1.2rem] flex items-center justify-center text-[13px] font-black shrink-0 shadow-lg">{i + 1}</div>
                          <p className="text-[15px] text-slate-600 leading-relaxed font-medium pt-1 italic">{step}</p>
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
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-lg" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white w-full rounded-t-[5rem] p-14 animate-in slide-in-from-bottom duration-500 shadow-2xl">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-12" />
            <h2 className="text-2xl font-black mb-12 text-center tracking-tight text-slate-800 uppercase tracking-[0.1em]">დღიური მიზანი</h2>
            <div className="relative mb-14">
                <input type="number" value={dailyGoal} onChange={(e) => { const val = parseInt(e.target.value) || 2000; setDailyGoal(val); if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); }} className="w-full p-10 bg-slate-50 rounded-[3rem] text-6xl font-black text-center outline-none border-2 border-transparent focus:border-emerald-100 transition-all text-emerald-600 shadow-inner" />
                <p className="text-center mt-6 text-[11px] font-bold text-slate-300 uppercase tracking-[0.3em]">კალორია დღეში</p>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 text-white py-7 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95 transition-all">პარამეტრების შენახვა</button>
          </div>
        </div>
      )}
    </div>
  );
}