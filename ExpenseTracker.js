"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekKey(date = new Date()) {
  const ws = getWeekStart(date);
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NZ", { day: "2-digit", month: "short" });
}

function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function getTodayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// ─── PIN Screen ────────────────────────────────────────────────────────────

function PinScreen({ mode, onSuccess, error, onPinChange, pin, loading }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#1a4731", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'DM Sans', sans-serif"
    }}>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "white", marginBottom: 8, fontWeight: 400 }}>
        {mode === "set" ? "Create a PIN" : "Welcome back"}
      </p>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 40, textAlign: "center" }}>
        {mode === "set" ? "Choose a 4-digit PIN to protect your expenses" : "Enter your PIN to continue"}
      </p>

      <div style={{ display: "flex", gap: 14, marginBottom: 32 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: "50%",
            background: pin.length > i ? "white" : "rgba(255,255,255,0.25)",
            transition: "background 0.15s"
          }} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12, marginBottom: 24 }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((key, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (key === "") return;
              if (key === "⌫") { onPinChange(pin.slice(0, -1)); return; }
              if (pin.length < 4) {
                const next = pin + key;
                onPinChange(next);
                if (next.length === 4) onSuccess(next);
              }
            }}
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: key === "" ? "transparent" : "rgba(255,255,255,0.12)",
              border: "none", color: "white", fontSize: key === "⌫" ? 20 : 24,
              fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
              cursor: key === "" ? "default" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseDown={(e) => { if (key !== "") e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
            onMouseUp={(e) => { if (key !== "") e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
          >
            {key}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: "#ff8a80", fontSize: 13, textAlign: "center" }}>{error}</p>
      )}
      {loading && (
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Checking…</p>
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────

export default function ExpenseTracker() {
  const [authState, setAuthState] = useState("loading"); // loading | set-pin | enter-pin | authed
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [allData, setAllData] = useState({});
  const [budget, setBudget] = useState(500);
  const [dataLoading, setDataLoading] = useState(false);

  const [tab, setTab] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: getTodayStr(), description: "", amount: "" });
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Check if PIN exists
  useEffect(() => {
    fetch("/api/pin")
      .then((r) => r.json())
      .then((d) => setAuthState(d.hasPin ? "enter-pin" : "set-pin"))
      .catch(() => setAuthState("set-pin"));
  }, []);

  // Load data once authed
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const r = await fetch("/api/expenses");
      const d = await r.json();
      setAllData(d.data || {});
      setBudget(d.budget || 500);
    } catch (_) {}
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (authState === "authed") loadData();
  }, [authState, loadData]);

  const handlePinSubmit = async (enteredPin) => {
    setPinLoading(true);
    setPinError("");
    try {
      if (authState === "set-pin") {
        await fetch("/api/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set", pin: enteredPin }),
        });
        setAuthState("authed");
      } else {
        const r = await fetch("/api/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", pin: enteredPin }),
        });
        const d = await r.json();
        if (d.valid) {
          setAuthState("authed");
        } else {
          setPinError("Incorrect PIN. Try again.");
          setPin("");
        }
      }
    } catch (_) {
      setPinError("Something went wrong. Try again.");
      setPin("");
    }
    setPinLoading(false);
  };

  const saveExpenses = async (data) => {
    setAllData(data);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "expenses", data }),
    });
  };

  const saveBudget = async (val) => {
    setBudget(val);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "budget", value: val }),
    });
  };

  // ── PIN screens
  if (authState === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#1a4731", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (authState === "set-pin" || authState === "enter-pin") {
    return (
      <PinScreen
        mode={authState === "set-pin" ? "set" : "enter"}
        pin={pin}
        onPinChange={setPin}
        onSuccess={handlePinSubmit}
        error={pinError}
        loading={pinLoading}
      />
    );
  }

  // ── Derived data
  const currentWeekKey = getWeekKey();
  const currentExpenses = allData[currentWeekKey] || [];
  const todayStr = getTodayStr();
  const todayExpenses = currentExpenses.filter((e) => e.date === todayStr);
  const totalSpent = currentExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const amountLeft = budget - totalSpent;
  const pctSpent = Math.min((totalSpent / budget) * 100, 100);
  const isOverBudget = totalSpent > budget;

  const expensesWithTotals = currentExpenses.map((e, i) => {
    const runningTotal = currentExpenses.slice(0, i + 1).reduce((s, ex) => s + parseFloat(ex.amount || 0), 0);
    return { ...e, runningTotal, left: budget - runningTotal };
  });

  const pastWeeks = Object.keys(allData)
    .filter((k) => k !== currentWeekKey)
    .sort((a, b) => b.localeCompare(a));

  const addExpense = async () => {
    if (!form.description.trim() || !form.amount || isNaN(form.amount)) return;
    const expenseWeekKey = getWeekKey(new Date(form.date + "T00:00:00"));
    const updated = { ...allData };
    if (!updated[expenseWeekKey]) updated[expenseWeekKey] = [];
    updated[expenseWeekKey] = [
      ...updated[expenseWeekKey],
      { id: Date.now(), date: form.date, description: form.description, amount: parseFloat(form.amount) },
    ].sort((a, b) => a.date.localeCompare(b.date));
    setShowModal(false);
    setForm({ date: getTodayStr(), description: "", amount: "" });
    await saveExpenses(updated);
  };

  // ── Render
  return (
    <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", background: "#f8faf8", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1a4731; border-radius: 4px; }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #6b8c7a; letter-spacing: 0.5px; transition: all 0.2s; }
        .tab-btn.active { color: #1a4731; border-bottom: 2px solid #1a4731; }
        .add-btn { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); width: calc(100% - 48px); max-width: 420px; background: #1a4731; color: white; border: none; border-radius: 50px; padding: 18px; font-family: 'DM Sans', sans-serif; font-size: 26px; font-weight: 300; cursor: pointer; box-shadow: 0 8px 32px rgba(26,71,49,0.35); transition: all 0.2s; z-index: 10; }
        .add-btn:active { background: #0f2d1e; transform: translateX(-50%) scale(0.98); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(10,30,20,0.5); z-index: 50; display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        .modal { background: white; border-radius: 24px 24px 0 0; width: 100%; max-width: 480px; padding: 28px 24px 48px; animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); min-height: 56vh; }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .input-group { margin-bottom: 18px; }
        .input-group label { display: block; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; color: #6b8c7a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
        .input-group input { width: 100%; border: 1.5px solid #e0ede7; border-radius: 10px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #1a2e24; outline: none; transition: border 0.2s; background: #f8faf8; }
        .input-group input:focus { border-color: #1a4731; background: white; }
        .log-row { display: grid; grid-template-columns: 68px 1fr 60px 68px 68px; gap: 4px; padding: 10px 12px; align-items: center; border-bottom: 1px solid #eef4f0; }
        .log-row:active { background: #f2f8f4; }
        .log-cell { font-family: 'DM Sans', sans-serif; font-size: 11.5px; color: #2d5440; }
        .log-cell.muted { color: #8aab97; font-size: 11px; }
        .log-cell.amount { font-weight: 600; color: #1a4731; }
        .log-cell.over { color: #c0392b; font-weight: 500; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1a4731", padding: "52px 24px 24px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>This Week</p>
            <h1 style={{ fontSize: 40, fontWeight: 400, lineHeight: 1.1, letterSpacing: -1 }}>{formatCurrency(totalSpent)}</h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, opacity: 0.6, marginTop: 4 }}>spent of {formatCurrency(budget)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>Remaining</p>
            <p style={{ fontSize: 28, fontWeight: 400, color: isOverBudget ? "#ff8a80" : "#a8e6c3" }}>
              {isOverBudget ? `-${formatCurrency(Math.abs(amountLeft))}` : formatCurrency(amountLeft)}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18, background: "rgba(255,255,255,0.15)", borderRadius: 8, height: 5, overflow: "hidden" }}>
          <div style={{ width: `${pctSpent}%`, height: "100%", background: isOverBudget ? "#ff8a80" : "#a8e6c3", borderRadius: 8, transition: "width 0.5s ease" }} />
        </div>

        <div style={{ marginTop: 12 }}>
          {editingBudget ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Weekly budget"
                type="number"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 10px", color: "white", fontFamily: "'DM Sans', sans-serif", fontSize: 13, width: 140, outline: "none" }}
              />
              <button onClick={async () => { const v = parseFloat(budgetInput); if (!isNaN(v) && v > 0) await saveBudget(v); setEditingBudget(false); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 14px", color: "white", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingBudget(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => { setEditingBudget(true); setBudgetInput(budget.toString()); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, padding: "5px 12px", color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
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
          {dataLoading ? (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#b0c9bc", padding: "32px 20px", textAlign: "center" }}>Loading…</p>
          ) : (
            <>
              <div style={{ padding: "16px 20px 8px" }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#8aab97", marginBottom: 10 }}>Today</p>
                {todayExpenses.length === 0 ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#b0c9bc", fontStyle: "italic", padding: "6px 0" }}>No expenses today yet.</p>
                ) : (
                  todayExpenses.map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f5f2" }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1a2e24" }}>{e.description}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#1a4731" }}>{formatCurrency(e.amount)}</span>
                    </div>
                  ))
                )}
                {todayExpenses.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8aab97" }}>
                      Today total: {formatCurrency(todayExpenses.reduce((s, e) => s + e.amount, 0))}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "68px 1fr 60px 68px 68px", gap: 4, padding: "8px 12px", background: "#f2f8f4", borderTop: "1px solid #eef4f0", borderBottom: "1px solid #eef4f0" }}>
                  {["Date", "Description", "Cost", "Total", "Left"].map((h) => (
                    <span key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: "#6b8c7a", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {expensesWithTotals.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#c5dbd0", fontStyle: "italic" }}>No expenses this week</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#b0c9bc", marginTop: 6 }}>Tap + to add your first one</p>
                  </div>
                ) : (
                  expensesWithTotals.map((e) => (
                    <div className="log-row" key={e.id}>
                      <span className="log-cell muted">{formatDate(e.date)}</span>
                      <span className="log-cell" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</span>
                      <span className="log-cell amount">{formatCurrency(e.amount)}</span>
                      <span className="log-cell amount">{formatCurrency(e.runningTotal)}</span>
                      <span className={`log-cell ${e.left < 0 ? "over" : "amount"}`}>
                        {e.left < 0 ? `-$${Math.abs(e.left).toFixed(2)}` : formatCurrency(e.left)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div style={{ paddingBottom: 110 }}>
          {pastWeeks.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#c5dbd0", fontStyle: "italic" }}>No past weeks yet</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#b0c9bc", marginTop: 6 }}>History appears here each Monday</p>
            </div>
          ) : (
            pastWeeks.map((wk) => {
              const expenses = allData[wk] || [];
              const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              const [y, m, d] = wk.split("-");
              const ws = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
              const we = new Date(ws); we.setDate(we.getDate() + 6);
              const label = `${ws.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })} – ${we.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}`;
              return (
                <div key={wk} style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", background: "#f2f8f4", borderTop: "1px solid #eef4f0", borderBottom: "1px solid #eef4f0" }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#3d6b54" }}>{label}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#1a4731" }}>{formatCurrency(total)}</span>
                  </div>
                  {expenses.map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f0f5f2" }}>
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
      <button className="add-btn" onClick={() => { setForm({ date: getTodayStr(), description: "", amount: "" }); setShowModal(true); }}>+</button>

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
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
              <button onClick={addExpense}
                style={{ background: "#1a4731", color: "white", border: "none", borderRadius: 12, padding: "13px 32px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,71,49,0.3)" }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
