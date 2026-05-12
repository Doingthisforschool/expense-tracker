"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "expense_tracker_data";
const BUDGET_KEY = "expense_tracker_budget";

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekKey(date = new Date()) {
  const ws = getWeekStart(date);
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function getTodayStr() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export default function ExpenseTracker() {
  const [allData, setAllData] = useState({});
  const [budget, setBudget] = useState(500);
  const [tab, setTab] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: getTodayStr(), description: "", amount: "" });
  const [budgetInput, setBudgetInput] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAllData(JSON.parse(saved));
    const savedBudget = localStorage.getItem(BUDGET_KEY);
    if (savedBudget) setBudget(parseFloat(savedBudget));
  }, []);

  const saveData = (data) => {
    setAllData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const saveBudget = (val) => {
    setBudget(val);
    localStorage.setItem(BUDGET_KEY, val.toString());
  };

  const currentWeekKey = getWeekKey();
  const currentExpenses = allData[currentWeekKey] || [];
  const todayStr = getTodayStr();
  const todayExpenses = currentExpenses.filter((e) => e.date === todayStr);
  const totalSpent = currentExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const amountLeft = budget - totalSpent;
  const pctSpent = Math.min((totalSpent / budget) * 100, 100);
  const isOverBudget = totalSpent > budget;

  const expensesWithTotals = currentExpenses.map((e, i) => {
    const runningTotal = currentExpenses
      .slice(0, i + 1)
      .reduce((sum, ex) => sum + parseFloat(ex.amount || 0), 0);
    return { ...e, runningTotal, left: budget - runningTotal };
  });

  const addExpense = () => {
    if (!form.description.trim() || !form.amount || isNaN(form.amount)) return;
    const expenseWeekKey = getWeekKey(new Date(form.date + "T00:00:00"));
    const updated = { ...allData };
    if (!updated[expenseWeekKey]) updated[expenseWeekKey] = [];
    updated[expenseWeekKey] = [
      ...updated[expenseWeekKey],
      {
        id: Date.now(),
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
      },
    ].sort((a, b) => a.date.localeCompare(b.date));
    saveData(updated);
    setShowModal(false);
    setForm({ date: getTodayStr(), description: "", amount: "" });
  };

  const pastWeeks = Object.keys(allData)
    .filter((k) => k !== currentWeekKey)
    .sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", background: "#f8faf8", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a4731; border-radius: 4px; }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #6b8c7a; letter-spacing: 0.5px; transition: all 0.2s; }
        .tab-btn.active { color: #1a4731; border-bottom: 2px solid #1a4731; }
        .add-btn { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); width: calc(100% - 48px); max-width: 420px; background: #1a4731; color: white; border: none; border-radius: 50px; padding: 18px; font-family: 'DM Sans', sans-serif; font-size: 26px; font-weight: 300; cursor: pointer; box-shadow: 0 8px 32px rgba(26,71,49,0.35); transition: all 0.2s; z-index: 10; }
        .add-btn:hover { background: #0f2d1e; transform: translateX(-50%) translateY(-2px); box-shadow: 0 12px 40px rgba(26,71,49,0.45); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(10,30,20,0.45); z-index: 50; display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal { background: white; border-radius: 24px 24px 0 0; width: 100%; max-width: 480px; padding: 28px 24px 40px; animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); min-height: 55vh; }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .input-group { margin-bottom: 18px; }
        .input-group label { display: block; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; color: #6b8c7a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
        .input-group input { width: 100%; border: 1.5px solid #e0ede7; border-radius: 10px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #1a2e24; outline: none; transition: border 0.2s; background: #f8faf8; }
        .input-group input:focus { border-color: #1a4731; background: white; }
        .log-row { display: grid; grid-template-columns: 80px 1fr 62px 70px 70px; gap: 4px; padding: 11px 12px; align-items: center; border-bottom: 1px solid #eef4f0; transition: background 0.15s; }
        .log-row:hover { background: #f2f8f4; }
        .log-cell { font-family: 'DM Sans', sans-serif; font-size: 12px; color: #2d5440; }
        .log-cell.muted { color: #8aab97; font-size: 11px; }
        .log-cell.amount { font-weight: 600; color: #1a4731; }
        .log-cell.left-col { font-weight: 500; }
        .log-cell.over { color: #c0392b; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1a4731", padding: "52px 24px 24px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6, marginBottom: 4 }}>This Week</p>
            <h1 style={{ fontSize: 38, fontWeight: 400, lineHeight: 1.1, letterSpacing: -0.5 }}>{formatCurrency(totalSpent)}</h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, opacity: 0.65, marginTop: 4 }}>spent of {formatCurrency(budget)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6, marginBottom: 4 }}>Remaining</p>
            <p style={{ fontSize: 26, fontWeight: 400, color: isOverBudget ? "#ff8a80" : "#a8e6c3" }}>
              {isOverBudget ? `-${formatCurrency(Math.abs(amountLeft))}` : formatCurrency(amountLeft)}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18, background: "rgba(255,255,255,0.15)", borderRadius: 8, height: 5, overflow: "hidden" }}>
          <div style={{ width: `${pctSpent}%`, height: "100%", background: isOverBudget ? "#ff8a80" : "#a8e6c3", borderRadius: 8, transition: "width 0.4s ease" }} />
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          {editingBudget ? (
            <>
              <input
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Enter budget"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 10px", color: "white", fontFamily: "'DM Sans', sans-serif", fontSize: 13, width: 130, outline: "none" }}
              />
              <button
                onClick={() => { const v = parseFloat(budgetInput); if (!isNaN(v) && v > 0) saveBudget(v); setEditingBudget(false); setBudgetInput(""); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 14px", color: "white", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>
                Save
              </button>
              <button
                onClick={() => { setEditingBudget(false); setBudgetInput(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditingBudget(true); setBudgetInput(budget.toString()); }}
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "5px 12px", color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
              ✎ Set weekly budget
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", display: "flex", borderBottom: "1px solid #eef4f0", position: "sticky", top: 0, zIndex: 20 }}>
        <button className={`tab-btn ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")}>This Week</button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>History</button>
      </div>

      {/* Home Tab */}
      {tab === "home" && (
        <div style={{ paddingBottom: 110 }}>
          <div style={{ padding: "16px 20px 8px" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#8aab97", marginBottom: 10 }}>Today</p>
            {todayExpenses.length === 0 ? (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#b0c9bc", fontStyle: "italic", padding: "8px 0" }}>No expenses today yet.</p>
            ) : (
              todayExpenses.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f5f2" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1a2e24" }}>{e.description}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#1a4731" }}>{formatCurrency(e.amount)}</span>
                </div>
              ))
            )}
            {todayExpenses.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8aab97" }}>
                  Today: {formatCurrency(todayExpenses.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 62px 70px 70px", gap: 4, padding: "8px 12px", background: "#f2f8f4", borderTop: "1px solid #eef4f0", borderBottom: "1px solid #eef4f0" }}>
              {["Date", "Description", "Cost", "Total", "Left"].map((h) => (
                <span key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: "#6b8c7a", letterSpacing: 1, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {expensesWithTotals.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: "#c5dbd0", fontStyle: "italic" }}>No expenses this week</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#b0c9bc", marginTop: 6 }}>Tap + to add your first one</p>
              </div>
            ) : (
              expensesWithTotals.map((e) => (
                <div className="log-row" key={e.id}>
                  <span className="log-cell muted">{formatDate(e.date)}</span>
                  <span className="log-cell" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</span>
                  <span className="log-cell amount">{formatCurrency(e.amount)}</span>
                  <span className="log-cell amount">{formatCurrency(e.runningTotal)}</span>
                  <span className={`log-cell left-col ${e.left < 0 ? "over" : ""}`}>
                    {e.left < 0 ? `-$${Math.abs(e.left).toFixed(2)}` : formatCurrency(e.left)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div style={{ paddingBottom: 110 }}>
          {pastWeeks.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: "#c5dbd0", fontStyle: "italic" }}>No past weeks yet</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#b0c9bc", marginTop: 6 }}>History appears here each Monday</p>
            </div>
          ) : (
            pastWeeks.map((wk) => {
              const expenses = allData[wk] || [];
              const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              const [y, m, d] = wk.split("-");
              const weekStart = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              const label = `${weekStart.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}`;
              return (
                <div key={wk} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px", background: "#f2f8f4", borderTop: "1px solid #eef4f0", borderBottom: "1px solid #eef4f0" }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#3d6b54" }}>{label}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#1a4731" }}>{formatCurrency(total)}</span>
                  </div>
                  {expenses.map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f0f5f2", alignItems: "center" }}>
                      <div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#1a2e24" }}>{e.description}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8aab97", marginTop: 2 }}>{formatDate(e.date)}</p>
                      </div>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#1a4731" }}>{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Button */}
      <button
        className="add-btn"
        onClick={() => { setForm({ date: getTodayStr(), description: "", amount: "" }); setShowModal(true); }}>
        +
      </button>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ width: 36, height: 4, background: "#e0ede7", borderRadius: 4, margin: "0 auto 24px" }} />
            <h2 style={{ fontSize: 24, color: "#1a2e24", marginBottom: 24, fontWeight: 400 }}>New Expense</h2>
            <div className="input-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Description</label>
              <input type="text" placeholder="e.g. Countdown groceries" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Amount (NZD)</label>
              <input type="number" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button
                onClick={addExpense}
                style={{ background: "#1a4731", color: "white", border: "none", borderRadius: 12, padding: "13px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3, boxShadow: "0 4px 16px rgba(26,71,49,0.3)" }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
