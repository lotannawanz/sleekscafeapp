import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, orderBy, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import { TrendingUp, DollarSign, PlusCircle, FileSpreadsheet, Coffee, LogOut, Calendar, Filter, Lock } from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const getEnvVar = (name, defaultValue) => {
  if (typeof window !== 'undefined' && typeof window[name] === 'string' && window[name].length > 0) {
    return window[name];
  }
  return defaultValue;
};

const appId = getEnvVar('__app_id', 'default-app-id');
const firebaseConfigString = getEnvVar('__firebase_config', '{}');

let firebaseConfig = {};
try {
  firebaseConfig = JSON.parse(firebaseConfigString);
} catch (e) {
  console.error("Failed to parse environment firebase config.");
}

// FALLBACK CONFIG (Inject your copied config here if env vars fail)
if (!firebaseConfig || !firebaseConfig.apiKey) {
  firebaseConfig = {
    apiKey: "AIzaSyDJwg-Yu8DN5OvyBHoUhF1dDu33l2X-zUw",
    authDomain: "sleeks-cafe-app.firebaseapp.com",
    projectId: "sleeks-cafe-app",
    storageBucket: "sleeks-cafe-app.firebasestorage.app",
    messagingSenderId: "1046614610940",
    appId: "1:1046614610940:web:1a1d0e3311072c80395879",
    measurementId: "G-TJ5WC317B2"
  };
}

// --- HELPER FUNCTIONS ---
const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfDay = (date = new Date()) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

// --- ADMIN CONFIGURATION ---
const ADMIN_EMAILS = [
  'lotanna@sleeks.com',
  'ines@sleeks.com'
];

const App = () => {
  // --- STATE ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Sales');

  // Data State
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- BRAND COLORS ---
  // Main Blue: #99ccff | Matcha Green: #ccffcb

  const PRODUCT_LIST = useMemo(() => ([
    { id: 'iced_matcha_s', name: "Sleek's Iced Matcha (S)", price: 9500, category: 'Matcha' },
    { id: 'iced_matcha_l', name: "Sleek's Iced Matcha (L)", price: 10500, category: 'Matcha' },
    { id: 'blueberry_matcha_s', name: "Blueberry Matcha (S)", price: 9500, category: 'Matcha' },
    { id: 'blueberry_matcha_l', name: "Blueberry Matcha (L)", price: 10500, category: 'Matcha' },
    { id: 'white_choc_matcha_s', name: "White Choc Matcha (S)", price: 10000, category: 'Matcha' },
    { id: 'white_choc_matcha_l', name: "White Choc Matcha (L)", price: 11500, category: 'Matcha' },
    { id: 'matcha_can', name: "Sleek's Matcha Latte Can", price: 9000, category: 'Matcha' },
    { id: 'lavender_lemonade_s', name: "Lavender Lemonade (S)", price: 8500, category: 'Refresher' },
    { id: 'lavender_lemonade_l', name: "Lavender Lemonade (L)", price: 9500, category: 'Refresher' },
    { id: 'pm_lemonade_s', name: "P&M Lemonade (S)", price: 8500, category: 'Refresher' },
    { id: 'pm_lemonade_l', name: "P&M Lemonade (L)", price: 9500, category: 'Refresher' },
    { id: 'sparkler_s', name: "The Sparkler (S)", price: 8500, category: 'Refresher' },
    { id: 'sparkler_l', name: "The Sparkler (L)", price: 9500, category: 'Refresher' },
    { id: 'spanish_latte_s', name: "Sleek's Spanish Latte (S)", price: 8500, category: 'Coffee' },
    { id: 'spanish_latte_l', name: "Sleek's Spanish Latte (L)", price: 9500, category: 'Coffee' },
    { id: 'highball', name: "Sleekaid Highball", price: 16000, category: 'SleeksLates' },
    { id: 'spiked_pm', name: "Sleek's Spiked P&M", price: 16500, category: 'SleeksLates' },
    { id: 'margarita', name: "Spicy Mango Margarita", price: 16500, category: 'SleeksLates' },
    { id: 'matcha_set', name: "Essential Matcha Set", price: 60000, category: 'Goods' },
    { id: 'maro_powder', name: "Maro 001 Powder", price: 45000, category: 'Goods' },
    { id: 'yame_powder', name: "Yame 002 Powder", price: 57000, category: 'Goods' },
    { id: 'xmas_bundle', name: "Sleek's Matcha Christmas Bundle", price: 150000, category: 'Goods' },
    { id: 'tees', name: "Tees", price: 40000, category: 'Goods' },
    { id: 'matcha_puff', name: "Matcha Puff", price: 2500, category: 'Food' },
  ]), []);

  // Determine Admin Status
  const isAdmin = useMemo(() => {
    return user && user.email && ADMIN_EMAILS.includes(user.email);
  }, [user]);

  // Force Navigation for Non-Admins
  useEffect(() => {
    if (user && !isAdmin && activeTab === 'Expenses') {
      setActiveTab('Sales');
    }
  }, [user, isAdmin, activeTab]);

  // 1. Initialize Firebase
  useEffect(() => {
    if (!firebaseConfig || !firebaseConfig.apiKey) return;
    try {
      const app = initializeApp(firebaseConfig);
      const newAuth = getAuth(app);
      const newDb = getFirestore(app);
      setDb(newDb);
      setAuth(newAuth);

      const unsubscribe = onAuthStateChanged(newAuth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Init Error:", e);
    }
  }, []);

  // 2. Data Listeners (ONLY TODAY'S DATA)
  useEffect(() => {
    if (!db || !user) return;

    // Listener: Sales (Today Only)
    const todayStart = getStartOfDay();
    const salesRef = collection(db, `artifacts/${appId}/public/data/sales_logs`);
    const qSales = query(
      salesRef,
      where('timestamp', '>=', todayStart),
      orderBy('timestamp', 'desc')
    );

    const unsubSales = onSnapshot(qSales, (snap) => {
      setSalesData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Sales Listener:", err));

    // Listener: Expenses (Today Only)
    let unsubExp = () => { };
    if (isAdmin) {
      const expRef = collection(db, `artifacts/${appId}/users/${user.uid}/expenses`);
      const qExp = query(
        expRef,
        where('timestamp', '>=', todayStart),
        orderBy('timestamp', 'desc')
      );

      unsubExp = onSnapshot(qExp, (snap) => {
        setExpensesData(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate().toLocaleDateString() })));
      }, (err) => console.error("Expense Listener:", err));
    }

    return () => { unsubSales(); unsubExp(); };
  }, [db, user, isAdmin]);

  // --- ACTIONS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoggingIn(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success handled by onAuthStateChanged
    } catch (error) {
      console.error(error);
      setAuthError("Invalid email or password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
  };

  // --- COMPONENTS ---
  const InputField = ({ label, type = 'text', value, onChange, placeholder }) => (
    <div className="flex flex-col w-full">
      <label className="text-sm font-bold text-gray-600 mb-1 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="p-3 border-2 border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-sleek-blue outline-none transition-all duration-200 bg-gray-50"
      />
    </div>
  );

  const SalesTracker = () => {
    const initialState = PRODUCT_LIST.reduce((acc, p) => ({ ...acc, [p.id]: '' }), {});
    const [salesQuantities, setSalesQuantities] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [salesMessage, setSalesMessage] = useState('');

    // Export State
    const [showExport, setShowExport] = useState(false);
    const [exportRange, setExportRange] = useState('today'); // today, yesterday, week, all, custom
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Payment Method Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingSale, setPendingSale] = useState(null);

    const calculateTotalRevenue = useMemo(() => {
      return Object.keys(salesQuantities).reduce((total, productId) => {
        const product = PRODUCT_LIST.find(p => p.id === productId);
        const quantity = parseInt(salesQuantities[productId] || 0);
        return total + (product.price * quantity);
      }, 0);
    }, [salesQuantities]);

    const handleSalesSubmit = async () => {
      if (calculateTotalRevenue === 0) { setSalesMessage('Enter at least one item.'); return; }
      if (!db) { setSalesMessage('System error.'); return; }

      // Prepare sale data but don't save yet
      const saleData = {
        date: new Date().toISOString().split('T')[0],
        timestamp: serverTimestamp(),
        items: Object.keys(salesQuantities)
          .filter(id => parseInt(salesQuantities[id] || 0) > 0)
          .map(id => ({
            id,
            name: PRODUCT_LIST.find(p => p.id === id).name,
            quantity: parseInt(salesQuantities[id] || 0),
            price: PRODUCT_LIST.find(p => p.id === id).price,
          })),
        totalRevenue: calculateTotalRevenue,
        loggedBy: user.uid,
      };

      // Store pending sale and show modal
      setPendingSale(saleData);
      setShowPaymentModal(true);
    };

    const completeSale = async (selectedPaymentMethod) => {
      if (!db || !pendingSale) return;

      setIsSubmitting(true);
      setSalesMessage('Saving...');

      try {
        await addDoc(collection(db, `artifacts/${appId}/public/data/sales_logs`), {
          ...pendingSale,
          paymentMethod: selectedPaymentMethod
        });

        setSalesMessage(`Saved ₦${calculateTotalRevenue.toLocaleString()}!`);
        setSalesQuantities(initialState);
        setShowPaymentModal(false);
        setPendingSale(null);
        setTimeout(() => setSalesMessage(''), 3000);
      } catch (e) {
        console.error("Sales error:", e);
        setSalesMessage("Error saving.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const runExport = async () => {
      if (!db) return;
      try {
        let start, end;
        const now = new Date();

        switch (exportRange) {
          case 'today':
            start = getStartOfDay();
            end = getEndOfDay();
            break;
          case 'yesterday':
            start = getStartOfDay(new Date(now.setDate(now.getDate() - 1)));
            end = getEndOfDay(new Date(now));
            break;
          case 'week':
            // Last 7 days
            start = getStartOfDay(new Date(now.setDate(now.getDate() - 7)));
            end = getEndOfDay(new Date());
            break;
          case 'custom':
            if (!customStart || !customEnd) { alert("Select dates"); return; }
            start = getStartOfDay(new Date(customStart));
            end = getEndOfDay(new Date(customEnd));
            break;
          default: // all time
            start = new Date('2024-01-01');
            end = new Date();
        }

        const q = query(
          collection(db, `artifacts/${appId}/public/data/sales_logs`),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end),
          orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        const allLogs = snapshot.docs.map(doc => ({ ...doc.data() }));

        // Aggregate Data
        const aggregated = {};
        allLogs.forEach(log => {
          const dateKey = log.date;
          if (!aggregated[dateKey]) {
            aggregated[dateKey] = {
              date: dateKey,
              day: new Date(dateKey).toLocaleDateString('en-US', { weekday: 'short' }),
              items: {},
              totalRevenue: 0,
              totalItems: 0,
              paymentMethods: { Cash: 0, POS: 0, Transfer: 0 }
            };
          }
          log.items.forEach(item => {
            aggregated[dateKey].items[item.id] = (aggregated[dateKey].items[item.id] || 0) + item.quantity;
            aggregated[dateKey].totalItems += item.quantity;
          });
          aggregated[dateKey].totalRevenue += log.totalRevenue;
          // Track payment methods
          if (log.paymentMethod) {
            aggregated[dateKey].paymentMethods[log.paymentMethod] =
              (aggregated[dateKey].paymentMethods[log.paymentMethod] || 0) + log.totalRevenue;
          }
        });

        const headers = ["Date", "Day", ...PRODUCT_LIST.map(p => p.name), "Total Items", "Cash (NGN)", "POS (NGN)", "Transfer (NGN)", "REVENUE (NGN)"];
        const rows = Object.values(aggregated).map(row => {
          return [
            row.date, row.day,
            ...PRODUCT_LIST.map(p => row.items[p.id] || 0),
            row.totalItems,
            row.paymentMethods.Cash || 0,
            row.paymentMethods.POS || 0,
            row.paymentMethods.Transfer || 0,
            row.totalRevenue
          ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Sleeks_Export_${exportRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } catch (e) {
        console.error(e);
        alert("Export failed: " + e.message);
      }
    };

    const SalesInputBlock = ({ products, title }) => (
      <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-blue-50 hover:border-sleek-blue transition-colors duration-300">
        <h3 className="text-lg font-black mb-4 text-gray-800 uppercase tracking-wide border-b-2 border-matcha-green pb-2 inline-block">
          {title}
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {products.map(p => (
            <div key={p.id} className="flex justify-between items-center p-2 hover:bg-blue-50 rounded-xl transition-colors">
              <span className="font-medium text-gray-700 text-sm truncate pr-2">{p.name}</span>
              <input
                type="number"
                min="0"
                value={salesQuantities[p.id]}
                onChange={(e) => setSalesQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                placeholder="0"
                className="w-14 p-2 text-center bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-sleek-blue font-bold text-gray-800"
              />
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="space-y-6 animate-fade-in pb-20">        {/* STICKY TOTAL HEADER */}
        <div className="sticky top-4 z-50 flex flex-col sm:flex-row justify-between items-center bg-sleek-blue p-6 rounded-3xl shadow-2xl text-white relative overflow-hidden backdrop-blur-md bg-opacity-95 border-2 border-white/20">
          <div className="z-10 w-full sm:w-auto mb-4 sm:mb-0">
            <p className="text-blue-100 font-medium text-xs uppercase tracking-wider">Current Entry Total</p>
            <p className="text-4xl font-black tracking-tight drop-shadow-sm">₦{calculateTotalRevenue.toLocaleString()}</p>
          </div>
          <button
            onClick={handleSalesSubmit}
            disabled={isSubmitting || calculateTotalRevenue === 0 || !db}
            className="z-10 bg-white text-sleek-blue hover:bg-matcha-green hover:text-gray-800 font-bold py-3 px-8 rounded-full shadow-lg transform active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto"
          >
            <PlusCircle size={20} className="mr-2" />
            {isSubmitting ? 'Saving...' : 'Log Sales'}
          </button>
        </div >

        {salesMessage && (
          <div className={`text-center p-3 rounded-2xl font-bold animate-pulse ${salesMessage.includes('Saved') ? 'bg-matcha-green text-green-900' : 'bg-red-100 text-red-800'}`}>
            {salesMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <SalesInputBlock products={PRODUCT_LIST.filter(p => ['Matcha', 'Refresher', 'Coffee'].includes(p.category))} title="Drinks Bar" />
          <SalesInputBlock products={PRODUCT_LIST.filter(p => ['Food', 'Goods'].includes(p.category))} title="Food & Merch" />
          <SalesInputBlock products={PRODUCT_LIST.filter(p => p.category === 'SleeksLates')} title="Sleek's Lates" />
        </div>

        {/* IMPROVED EXPORT SECTION - ADMIN ONLY */}
        {isAdmin && (
          <div className="bg-gray-800 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowExport(!showExport)}>
              <h3 className="font-bold flex items-center"><FileSpreadsheet className="mr-2" /> Manager Tools: Export Data</h3>
              <span>{showExport ? '▼' : '▶'}</span>
            </div>

            {showExport && (
              <div className="mt-4 space-y-4 border-t border-gray-600 pt-4">
                <p className="text-sm text-gray-400">Select Date Range for CSV:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['today', 'yesterday', 'week', 'all', 'custom'].map(r => (
                    <button
                      key={r}
                      onClick={() => setExportRange(r)}
                      className={`p-2 rounded-lg text-sm font-bold capitalize ${exportRange === r ? 'bg-matcha-green text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {exportRange === 'custom' && (
                  <div className="flex space-x-2">
                    <input type="date" className="p-2 rounded text-gray-900 w-full" onChange={e => setCustomStart(e.target.value)} />
                    <input type="date" className="p-2 rounded text-gray-900 w-full" onChange={e => setCustomEnd(e.target.value)} />
                  </div>
                )}

                <button
                  onClick={runExport}
                  className="w-full py-3 bg-white text-gray-900 rounded-xl font-black hover:bg-matcha-green transition-colors flex justify-center items-center"
                >
                  <FileSpreadsheet size={18} className="mr-2" /> Download Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* RECENT LOGS (TODAY ONLY) */}
        <div className="pt-6">
          <h3 className="text-xl font-black text-gray-800 mb-4 px-2 flex items-center">
            <Calendar size={20} className="mr-2 text-sleek-blue" /> Today's Transactions
          </h3>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {salesData.map((log, idx) => (
              <div key={log.id} className={`p-4 flex justify-between items-center ${idx !== salesData.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-blue-50 transition-colors`}>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                    {log.timestamp?.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${(log.paymentMethod || 'Cash') === 'Cash' ? 'bg-green-100 text-green-700' :
                      (log.paymentMethod || 'Cash') === 'POS' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                      {log.paymentMethod || 'Cash'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 font-medium truncate w-full">
                    {log.items.map(i => `${i.quantity}x ${i.name.replace("Sleek's ", "")}`).join(', ')}
                  </p>
                </div>
                <span className="text-sleek-blue font-black text-lg whitespace-nowrap ml-4">₦{log.totalRevenue.toLocaleString()}</span>
              </div>
            ))}
            {salesData.length === 0 && <p className="p-6 text-center text-gray-400">No sales logged today.</p>}
          </div>
        </div>

        {/* PAYMENT METHOD MODAL */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
              <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">
                Payment Method
              </h2>
              <p className="text-center text-gray-500 mb-6">
                How did the customer pay?
              </p>

              <div className="space-y-3 mb-6">
                {[
                  { method: 'Cash', icon: '💵', color: 'bg-green-500 hover:bg-green-600' },
                  { method: 'POS', icon: '💳', color: 'bg-blue-500 hover:bg-blue-600' },
                  { method: 'Transfer', icon: '🏦', color: 'bg-purple-500 hover:bg-purple-600' }
                ].map(({ method, icon, color }) => (
                  <button
                    key={method}
                    onClick={() => completeSale(method)}
                    disabled={isSubmitting}
                    className={`w-full py-4 px-6 ${color} text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg disabled:opacity-50`}
                  >
                    <span className="text-2xl">{icon}</span>
                    {method}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingSale(null);
                }}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div >
    );
  };

  const ExpensesTracker = () => {
    const [expense, setExpense] = useState({ date: new Date().toISOString().split('T')[0], item: '', category: '', amount: '' });
    const [msg, setMsg] = useState('');

    // Export State
    const [showExpenseExport, setShowExpenseExport] = useState(false);
    const [expenseExportRange, setExpenseExportRange] = useState('today');
    const [expenseCustomStart, setExpenseCustomStart] = useState('');
    const [expenseCustomEnd, setExpenseCustomEnd] = useState('');
    const submit = async () => {
      if (!expense.item || !expense.amount) return;
      try {
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/expenses`), {
          ...expense, amount: parseFloat(expense.amount), date: new Date(expense.date), timestamp: serverTimestamp()
        });
        setMsg('Saved!'); setExpense({ ...expense, item: '', amount: '' });
        setTimeout(() => setMsg(''), 2000);
      } catch (e) { setMsg('Error'); }
    };

    const runExpenseExport = async () => {
      if (!db) return;
      try {
        let start, end;
        const now = new Date();

        switch (expenseExportRange) {
          case 'today':
            start = getStartOfDay();
            end = getEndOfDay();
            break;
          case 'yesterday':
            start = getStartOfDay(new Date(now.setDate(now.getDate() - 1)));
            end = getEndOfDay(new Date(now));
            break;
          case 'week':
            start = getStartOfDay(new Date(now.setDate(now.getDate() - 7)));
            end = getEndOfDay(new Date());
            break;
          case 'custom':
            if (!expenseCustomStart || !expenseCustomEnd) { alert("Select dates"); return; }
            start = getStartOfDay(new Date(expenseCustomStart));
            end = getEndOfDay(new Date(expenseCustomEnd));
            break;
          default: // all time
            start = new Date('2024-01-01');
            end = new Date();
        }

        const q = query(
          collection(db, `artifacts/${appId}/users/${user.uid}/expenses`),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end),
          orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        const allExpenses = snapshot.docs.map(doc => ({ ...doc.data() }));

        const headers = ["Date", "Item", "Category", "Amount (NGN)"];
        const rows = allExpenses.map(exp => [
          exp.date?.toDate ? exp.date.toDate().toLocaleDateString() : exp.date,
          exp.item,
          exp.category || '',
          exp.amount
        ].join(","));

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Sleeks_Expenses_${expenseExportRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } catch (e) {
        console.error(e);
        alert("Export failed: " + e.message);
      }
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-blue-50">
          <h2 className="text-2xl font-black text-gray-800 mb-6">Log New Expense</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Date" type="date" value={expense.date} onChange={e => setExpense({ ...expense, date: e.target.value })} />
              <InputField label="Amount (₦)" type="number" value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })} placeholder="0.00" />
            </div>
            <InputField label="Item / Vendor" value={expense.item} onChange={e => setExpense({ ...expense, item: e.target.value })} />
            <InputField label="Category" value={expense.category} onChange={e => setExpense({ ...expense, category: e.target.value })} />
            <button onClick={submit} className="w-full bg-red-400 hover:bg-red-500 text-white font-bold py-4 rounded-2xl mt-4">Record Expense</button>
            {msg && <p className="text-center font-bold text-gray-500 mt-2">{msg}</p>}
          </div>
        </div>

        {/* EXPENSE EXPORT SECTION */}
        <div className="bg-gray-800 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowExpenseExport(!showExpenseExport)}>
            <h3 className="font-bold flex items-center"><FileSpreadsheet className="mr-2" /> Export Expenses</h3>
            <span>{showExpenseExport ? '▼' : '▶'}</span>
          </div>

          {showExpenseExport && (
            <div className="mt-4 space-y-4 border-t border-gray-600 pt-4">
              <p className="text-sm text-gray-400">Select Date Range for CSV:</p>
              <div className="grid grid-cols-2 gap-2">
                {['today', 'yesterday', 'week', 'all', 'custom'].map(r => (
                  <button
                    key={r}
                    onClick={() => setExpenseExportRange(r)}
                    className={`p-2 rounded-lg text-sm font-bold capitalize ${expenseExportRange === r ? 'bg-matcha-green text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {expenseExportRange === 'custom' && (
                <div className="flex space-x-2">
                  <input type="date" className="p-2 rounded text-gray-900 w-full" onChange={e => setExpenseCustomStart(e.target.value)} />
                  <input type="date" className="p-2 rounded text-gray-900 w-full" onChange={e => setExpenseCustomEnd(e.target.value)} />
                </div>
              )}

              <button
                onClick={runExpenseExport}
                className="w-full py-3 bg-white text-gray-900 rounded-xl font-black hover:bg-matcha-green transition-colors flex justify-center items-center"
              >
                <FileSpreadsheet size={18} className="mr-2" /> Download Report
              </button>
            </div>
          )}
        </div>

        {/* Expenses List (Today) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="font-bold text-gray-700">Today's Expenses</h3></div>
          {expensesData.map((exp, i) => (
            <div key={exp.id} className="p-4 flex justify-between items-center border-b border-gray-100">
              <div><p className="text-sm font-medium text-gray-800">{exp.item}</p></div>
              <p className="font-bold text-red-400">-₦{exp.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- AUTH SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-sleek-blue flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700;900&display=swap');
          body { font-family: 'Quicksand', sans-serif; }
          * { text-transform: lowercase !important; }
          .text-sleek-blue { color: #99ccff; }
          .bg-sleek-blue { background-color: #99ccff; }
          .border-sleek-blue { border-color: #99ccff; }
          .focus\\:ring-sleek-blue:focus { --tw-ring-color: #99ccff; }
          .text-matcha-green { color: #ccffcb; }
          .bg-matcha-green { background-color: #ccffcb; }
          .border-matcha-green { border-color: #ccffcb; }
          .font-bubbly { font-family: 'Quicksand', sans-serif; letter-spacing: -0.5px; }
        `}</style>
        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
              <img src="/logo.jpg" className="w-20 h-20 object-contain" onError={(e) => e.target.style.display = 'none'} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-gray-800 mb-2 font-bubbly">Sleek's Cafe</h1>
          <p className="text-center text-gray-400 mb-8 font-bold text-sm uppercase tracking-wider">Staff Login</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 ml-2 uppercase">Email</label>
              <input
                type="email"
                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-sleek-blue outline-none transition-colors font-bold text-gray-700"
                placeholder="staff@sleeks.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 ml-2 uppercase">Password</label>
              <input
                type="password"
                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-sleek-blue outline-none transition-colors font-bold text-gray-700"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>

            {authError && <p className="text-red-500 text-center font-bold text-sm">{authError}</p>}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-matcha-green text-gray-900 rounded-2xl font-black text-lg hover:bg-green-300 transition-transform active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isLoggingIn ? 'Verifying...' : 'Access System'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700;900&display=swap');
        body { font-family: 'Quicksand', sans-serif; }
        * { text-transform: lowercase !important; }
        .text-sleek-blue { color: #99ccff; }
        .bg-sleek-blue { background-color: #99ccff; }
        .border-sleek-blue { border-color: #99ccff; }
        .focus\\:ring-sleek-blue:focus { --tw-ring-color: #99ccff; }
        .text-matcha-green { color: #ccffcb; }
        .bg-matcha-green { background-color: #ccffcb; }
        .border-matcha-green { border-color: #ccffcb; }
        .font-bubbly { font-family: 'Quicksand', sans-serif; letter-spacing: -0.5px; }
      `}</style>

      {/* COMPACT HEADER */}
      <div className="bg-sleek-blue text-white pt-6 pb-8 px-6 rounded-b-[2.5rem] shadow-xl relative mb-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-xl shadow-inner w-12 h-12 flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight font-bubbly">sleek's</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg font-bold flex items-center backdrop-blur-sm transition-colors">
            <LogOut size={14} className="mr-1" /> Logout
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white p-2 rounded-full shadow-lg flex mb-8 mx-auto max-w-md">
          <button onClick={() => setActiveTab('Sales')} className={`flex-1 py-3 rounded-full font-bold text-sm flex items-center justify-center transition-all duration-300 ${activeTab === 'Sales' ? 'bg-matcha-green text-gray-800 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
            <TrendingUp size={18} className="mr-2" strokeWidth={2.5} /> Daily Sales
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('Expenses')} className={`flex-1 py-3 rounded-full font-bold text-sm flex items-center justify-center transition-all duration-300 ${activeTab === 'Expenses' ? 'bg-red-100 text-red-500 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
              <span className="mr-2 text-lg">₦</span> Expenses
            </button>
          )}
        </div>

        {activeTab === 'Sales' ? <SalesTracker /> : (isAdmin ? <ExpensesTracker /> : null)}
      </main>
    </div>
  );
};

export default App;