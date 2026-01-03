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
  TrendingUp, Zap, Info, Calculator
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

// Gemini API გასაღები - პირდაპირ მითითებული სტაბილურობისთვის
const GEMINI_API_KEY = "AIzaSyAdSzDqKf73a9fzI94UpmeOTJTrnJHfWos";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'calorie-tracker-pro-v1';

// --- 🥗 ლოკალური რეცეპტების ბაზა (სტაბილური ვერსია) ---
const LOCAL_RECIPES = [
  { id: 'r1', name: "ხინკალი (დიეტური, 1 ცალი)", calories: 75, time: "40 წთ", cuisine: "ქართული", budget: "დაბალი", ingredients: ["საქონლის ხორცი", "ფქვილი", "ხახვი"], preparation: ["მოზილეთ ცომი", "მოამზადეთ ფარში", "მოხარშეთ"], image: "https://images.unsplash.com/photo-1599307734173-97992c68600d?w=500" },
  { id: 'r2', name: "ქათმის სალათი მაწვნით", calories: 220, time: "15 წთ", cuisine: "ჯანსაღი", budget: "საშუალო", ingredients: ["ქათმის ფილე", "მაწონი", "მწვანილი"], preparation: ["მოხარშეთ ფილე", "დაჭერით", "შეურიეთ მაწონს"], image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" },
  { id: 'r3', name: "ორაგული ბოსტნეულით", calories: 350, time: "25 წთ", cuisine: "ევროპული", budget: "მაღალი", ingredients: ["ორაგული", "ლიმონი", "ბროკოლი", "ზეითუნის ზეთი"], preparation: ["გაასუფთავეთ ორაგული", "მოხარშეთ ბროკოლი", "შეწვით გრილზე"], image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500" }
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
  const [aiStatus, setAiStatus] = useState(''); // AI-ს სტატუსის ჩვენებისთვის
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 1. ავტორიზაციის მართვა
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            console.warn("Auth token mismatch, switching to anonymous.");
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth process error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. მონაცემების სინქრონიზაცია
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
      setError("მონაცემთა ბაზასთან კავშირი გაწყდა.");
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

  // 3. გაფართოებული AI პროცესორი - მათემატიკური ალგორითმით
  const processAI = async (text, base64 = null) => {
    if (!user || (!text && !base64)) return;
    setLoading(true); setError(null);
    setAiStatus('ვაანალიზებ პროდუქტებს...');

    const fetchWithRetry = async (retries = 3, delay = 1500) => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: text || "ამოიცანი ეს საკვები" }, ...(base64 ? [{ inlineData: { mimeType: "image/jpeg", data: base64 } }] : [])] }],
            systemInstruction: { 
              parts: [{ text: `შენ ხარ პროფესიონალი დიეტოლოგი და მათემატიკოსი. 
              შენი ამოცანაა მომხმარებლის მიერ მოწოდებული პროდუქტების სიის (მაგ: 2 ნაჭერი მწვადი, 200გრ პური, 1 კოვზი მაიონეზი) ზუსტი დამუშავება.
              
              ალგორითმი:
              1. დაშალე ტექსტი ცალკეულ კომპონენტებად.
              2. თითოეულისთვის დაადგინე კალორია მითითებული რაოდენობის (გრამი, კოვზი, ნაჭერი) მიხედვით.
              3. მათემატიკური სიზუსტით შეკრიბე ყველა ციფრი.
              4. "ingredients" მასივში ჩაწერე: "პროდუქტი (რაოდენობა) - კალორია" (მაგ: "ღორის მწვადი (2 ნაჭერი) - 450 კკალ").
              5. თუ მომხმარებელმა შეცდომით ჩაწერა (typo), მაინც მიხვდი რა იგულისხმა.
              
              პასუხი უნდა იყოს მხოლოდ JSON ფორმატში: 
              { 
                "name": "კერძის კრებსითი სახელი", 
                "calories": ჯამური_მათემატიკური_რიცხვი, 
                "ingredients": ["დაწვრილებითი სია კალორიებით"], 
                "preparation": ["მოკლე აღწერა როგორ მივიღეთ ეს ციფრები"], 
                "time": "მომზადების დრო" 
              }.
              გამოიყენე მხოლოდ ქართული ენა.` }] 
            },
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.1 // სიზუსტისთვის ვამცირებთ კრეატიულობას
            }
          })
        });

        if (!response.ok) throw new Error("API კავშირის პრობლემა");
        
        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("AI-მ პასუხი ვერ დააგენერირა");

        let resText = data.candidates[0].content.parts[0].text;
        resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(resText);
      } catch (e) {
        if (retries > 0) {
          setAiStatus(`ვცდი ხელახლა... დარჩა ${retries} მცდელობა`);
          await new Promise(res => setTimeout(res, delay));
          return fetchWithRetry(retries - 1, delay * 1.5);
        }
        throw e;
      }
    };

    try {
      const res = await fetchWithRetry();
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { ...res, timestamp: Date.now() });
      setAiStatus('წარმატებით დაემატა!');
      setInput('');
      setTimeout(() => setAiStatus(''), 2000);
    } catch (e) { 
      console.error("AI Error Details:", e);
      setError("AI-მ ვერ შეძლო ზუსტი დათვლა. სცადეთ პროდუქტების უფრო ნათლად ჩამოწერა."); 
    } finally { 
      setLoading(false); 
    }
  };

  if (loading && !user) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-emerald-500 gap-4"><Loader2 className="animate-spin w-10 h-10" /><p className="font-bold text-sm">იტვირთება...</p></div>;

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
               <p className="text-[9px] text-slate-500 font-bold uppercase">პროგრესი</p>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div className={`h-full transition-all duration-1000 rounded-full ${stats.todayTotal > dailyGoal ? 'bg-orange-500' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} style={{ width: `${Math.min((stats.todayTotal / dailyGoal) * 100, 100)}%` }} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pt-8 pb-32 overflow-y-auto scrollbar-hide">
        
        {/* TRACKER VIEW */}
        {activeTab === 'tracker' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[2.5rem] p-7 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 mb-5"><Zap className="w-4 h-4 text-emerald-500" /><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">დაამატეთ კვება</h3></div>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="მაგ: 2 ნაჭერი მწვადი, 200გრ პური, მაიონეზი..." 
                className="w-full p-6 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-emerald-500/10 text-sm min-h-[130px] outline-none placeholder:text-slate-300 resize-none font-medium leading-relaxed" 
              />
              <div className="flex gap-3 mt-4 relative z-10">
                <button onClick={() => processAI(input)} disabled={loading || !input.trim()} className="flex-[2] bg-slate-900 text-white font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Calculator className="w-5 h-5" />}
                  <span className="text-[10px] uppercase tracking-widest">დათვლა</span>
                </button>
                <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center justify-center active:scale-95">
                  <Camera className="w-7 h-7" /><input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const r = new FileReader(); r.onloadend = () => processAI(null, r.result.split(',')[1]); r.readAsDataURL(e.target.files[0]); }} />
                </button>
              </div>
              
              {aiStatus && <p className="mt-4 text-[10px] text-emerald-600 font-black animate-pulse flex items-center gap-2 uppercase tracking-tighter"><Sparkles className="w-3 h-3" /> {aiStatus}</p>}
              {error && <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3"><AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><p className="text-[10px] text-red-600 font-bold leading-relaxed">{error}</p></div>}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><History className="w-4 h-4"/> დღევანდელი ჩანაწერები</h3>
              {history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
                 <div className="py-16 flex flex-col items-center opacity-30 italic text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">ჯერჯერობით ცარიელია</div>
              ) : (
                history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString()).map(item => (
                  <div key={item.id} onClick={() => setSelectedRecipe(item)} className="bg-white p-5 rounded-[2rem] border border-slate-50 flex justify-between items-center shadow-sm cursor-pointer active:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-sm border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">{item.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className="font-black text-slate-800 tracking-tighter text-lg">{item.calories}</p><p className="text-[8px] text-slate-400 font-bold uppercase leading-none">კკალ</p></div>
                      <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', item.id)); }} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HUB VIEW */}
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

        {/* STATS VIEW */}
        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-slate-500 relative z-10">ბოლო 7 დღის ტრენდი</h3>
              <div className="flex items-end justify-between h-40 gap-2 relative z-10">
                {stats.last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-full bg-slate-800 rounded-full relative h-32 overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-full transition-all duration-700" style={{ height: `${Math.min((d.total / dailyGoal) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
               <TrendingUp className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
               <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">ანალიტიკა</h4>
               <p className="text-sm text-slate-500 mt-2 leading-relaxed">შენი კვების რეჟიმი ავტომატურად ინახება და ჯამდება კვირის მიხედვით.</p>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[94%] max-w-[380px] bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[2.8rem] p-2 flex justify-between shadow-2xl z-50">
        {[ 
          { id: 'tracker', icon: Utensils, label: 'დღიური' }, 
          { id: 'recipes', icon: BookOpen, label: 'მენიუ' },
          { id: 'stats', icon: BarChart3, label: 'პროგრესი' } 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-4 rounded-[2.2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg scale-[1.03]' : 'text-slate-300 hover:text-slate-500'}`}>
            <tab.icon className="w-5 h-5 mb-1.5" /><span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Recipe Detail Overlay */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="relative h-80">
            {selectedRecipe.image ? <img src={selectedRecipe.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><ImageIcon className="w-20 h-20 opacity-10" /></div>}
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-8 left-6 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-slate-800" /></button>
          </div>
          <div className="p-9 -mt-16 bg-white rounded-t-[4.5rem] relative z-10 min-h-screen">
             <div className="mb-12 text-center">
                <div className="flex justify-center mb-4"><span className="px-5 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">{selectedRecipe.cuisine || "დეტალური ანალიზი"}</span></div>
                <h1 className="text-3xl font-black text-slate-800 leading-tight mb-8 mt-2">{selectedRecipe.name}</h1>
                <div className="flex gap-4">
                  <div className="bg-slate-50 p-5 rounded-[2.2rem] flex-1 border border-slate-50 shadow-inner"><Flame className="w-5 h-5 mx-auto mb-2 text-orange-500" /><p className="font-black text-2xl text-slate-800">{selectedRecipe.calories}</p><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">კკალ</p></div>
                  <div className="bg-slate-50 p-5 rounded-[2.2rem] flex-1 border border-slate-50 shadow-inner"><Clock className="w-5 h-5 mx-auto mb-2 text-blue-500" /><p className="font-black text-2xl text-slate-800">{selectedRecipe.time || "5 წთ"}</p><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">დრო</p></div>
                </div>
             </div>
             
             <div className="space-y-12 pb-44">
                {selectedRecipe.ingredients && (
                  <div>
                    <h3 className="flex items-center gap-3 text-[11px] font-black uppercase text-slate-800 mb-6 tracking-[0.2em] border-b border-slate-50 pb-4"><ListChecks className="w-4 h-4 text-emerald-500" /> პროდუქტების დაშლა</h3>
                    <div className="grid gap-3">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="bg-white p-5 rounded-[1.8rem] text-sm font-bold text-slate-700 border border-slate-100 flex justify-between items-center shadow-sm">
                            <span className="flex-1 pr-4">{ing}</span>
                            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecipe.preparation && (
                  <div>
                    <h3 className="flex items-center gap-3 text-[11px] font-black uppercase text-slate-800 mb-6 tracking-[0.2em] border-b border-slate-50 pb-4"><Calculator className="w-4 h-4 text-emerald-500" /> გამოთვლის ლოგიკა</h3>
                    <div className="space-y-5">
                      {selectedRecipe.preparation.map((step, i) => (
                        <div key={i} className="flex gap-5 p-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-[2.2rem]">
                          <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[11px] font-black shrink-0">{i + 1}</div>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium pt-1 italic">{step}</p>
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
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white w-full rounded-t-[4rem] p-12 animate-in slide-in-from-bottom shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
            <h2 className="text-2xl font-black mb-10 text-center tracking-tight text-slate-800 uppercase">დღიური მიზანი</h2>
            <div className="relative mb-10">
                <input type="number" value={dailyGoal} onChange={(e) => { const val = parseInt(e.target.value) || 2000; setDailyGoal(val); if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { dailyGoal: val }); }} className="w-full p-8 bg-slate-50 rounded-[2.5rem] text-5xl font-black text-center outline-none border-2 border-transparent focus:border-emerald-100 transition-all text-emerald-600" />
                <p className="text-center mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">კალორია დღეში</p>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">შენახვა</button>
          </div>
        </div>
      )}
    </div>
  );
}