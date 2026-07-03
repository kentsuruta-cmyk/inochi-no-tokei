import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

const CATEGORY_LABELS = {
  money: '経済・モノ・お金',
  family_private: 'プライベート・家庭',
  work: '社会・仕事',
  knowledge: '教養・知識',
  health: '健康',
  mind: '心・精神',
};

const PYRAMID_TIERS = [
  { tier: '結果レベル', keys: ['money'] },
  { tier: '実現レベル', keys: ['family_private', 'work'] },
  { tier: '基礎レベル', keys: ['knowledge', 'health', 'mind'] },
];

const TIMELINE_CATEGORIES = [
  { key: 'health', label: '健康', defaultRows: 2 },
  { key: 'knowledge', label: '教養・知識', defaultRows: 2 },
  { key: 'mind', label: '心・精神', defaultRows: 2 },
  { key: 'work', label: '社会・仕事', defaultRows: 3 },
  { key: 'family_private', label: 'プライベート・家庭', defaultRows: 1 },
  { key: 'money', label: '経済・モノ・お金', defaultRows: 2 },
  { key: 'forecast', label: '未来予測', defaultRows: 1 },
];

function blankRow() {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    label: '',
    ultimate: '',
    future: '',
    now: '',
    diff: '',
    years: Array(10).fill(''),
  };
}

function defaultTimeline() {
  const t = {};
  TIMELINE_CATEGORIES.forEach((c) => {
    t[c.key] = Array.from({ length: c.defaultRows }).map(() => blankRow());
  });
  return t;
}

const DEFAULT_STATE = {
  birthDate: '1980-08-31',
  lifeExpAge: 81.09,
  targetAge: 100,
  dreams: [],
  family: {
    wife: '1978-12-08',
    daughter1: '2010-04-29',
    daughter2: '2015-08-18',
  },
  timeline: defaultTimeline(),
  pyramidGoals: {
    money: '',
    family_private: '',
    work: '',
    knowledge: '',
    health: '',
    mind: '',
  },
  todosByGoal: {},
};

function addYears(date, years) {
  const d = new Date(date.getTime());
  const wholeYears = Math.floor(years);
  const fraction = years - wholeYears;
  d.setFullYear(d.getFullYear() + wholeYears);
  d.setTime(d.getTime() + fraction * 365.25 * 24 * 3600 * 1000);
  return d;
}

function fmtRemain(ms) {
  if (ms <= 0) return { years: 0, days: 0, h: 0, m: 0, s: 0, totalDays: 0, expired: true };
  const totalSec = Math.floor(ms / 1000);
  const years = Math.floor(totalSec / (365.25 * 24 * 3600));
  const remAfterYears = totalSec - Math.floor(years * 365.25 * 24 * 3600);
  const days = Math.floor(remAfterYears / 86400);
  const h = Math.floor((remAfterYears % 86400) / 3600);
  const m = Math.floor((remAfterYears % 3600) / 60);
  const s = remAfterYears % 60;
  const totalDays = Math.floor(ms / 86400000);
  return { years, days, h, m, s, totalDays, expired: false };
}

function famAge(birthDateStr, year) {
  if (!birthDateStr) return null;
  const by = new Date(birthDateStr + 'T00:00:00').getFullYear();
  return year - by;
}

function milestone(age) {
  if (age === 6) return '小学校入学';
  if (age === 12) return '中学校入学';
  if (age === 15) return '高校入学';
  if (age === 18) return '大学入学';
  if (age === 22) return '大学卒業';
  return null;
}

export default function Home() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dreamFormOpen, setDreamFormOpen] = useState(false);
  const [dreamTitle, setDreamTitle] = useState('');
  const [dreamAge, setDreamAge] = useState('');
  const [dreamCategory, setDreamCategory] = useState('health');
  const [status, setStatus] = useState('');

  const [openSection, setOpenSection] = useState('lifeClock');
  const [showLifeExp, setShowLifeExp] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [todoDrafts, setTodoDrafts] = useState({}); // { [rowId]: '入力中のテキスト' }

  const saveTimer = useRef(null);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((data) => {
        setState({
          ...DEFAULT_STATE,
          ...data,
          family: { ...DEFAULT_STATE.family, ...(data.family || {}) },
          timeline: { ...DEFAULT_STATE.timeline, ...(data.timeline || {}) },
          pyramidGoals: { ...DEFAULT_STATE.pyramidGoals, ...(data.pyramidGoals || {}) },
          todosByGoal: { ...DEFAULT_STATE.todosByGoal, ...(data.todosByGoal || {}) },
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setStatus('保存中…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
        .then(() => setStatus('保存済み'))
        .catch(() => setStatus('保存に失敗しました'));
    }, 800);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loaded]);

  if (!loaded) {
    return <div style={styles.loading}>読み込み中…</div>;
  }

  const birth = new Date(state.birthDate + 'T00:00:00');
  const ageMs = now - birth;
  const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);

  const lifeExpDate = addYears(birth, state.lifeExpAge);
  const mainRemainMs = lifeExpDate - now;
  const mainR = fmtRemain(mainRemainMs);
  const mainTotal = lifeExpDate - birth;
  const mainPct = Math.min(100, (ageMs / mainTotal) * 100);

  const targetDate = addYears(birth, state.targetAge);
  const targetRemainMs = targetDate - now;
  const tR = fmtRemain(targetRemainMs);
  const targetTotal = targetDate - birth;
  const targetPct = Math.min(100, (ageMs / targetTotal) * 100);

  function updateField(field, value) {
    setState((s) => ({ ...s, [field]: value }));
  }

  function updateFamily(key, value) {
    setState((s) => ({ ...s, family: { ...s.family, [key]: value } }));
  }

  function addDream() {
    const title = dreamTitle.trim();
    const age = parseFloat(dreamAge);
    if (!title || !age) return;
    setState((s) => ({
      ...s,
      dreams: [
        ...s.dreams,
        { id: Date.now().toString(), title, targetAge: age, achieved: false, category: dreamCategory },
      ],
    }));
    setDreamTitle('');
    setDreamAge('');
    setDreamFormOpen(false);
  }

  function deleteDream(id) {
    setState((s) => ({ ...s, dreams: s.dreams.filter((d) => d.id !== id) }));
  }

  function toggleDream(id) {
    setState((s) => ({
      ...s,
      dreams: s.dreams.map((d) => (d.id === id ? { ...d, achieved: !d.achieved } : d)),
    }));
  }

  function toggleSection(name) {
    setOpenSection((s) => (s === name ? null : name));
  }

  function updatePyramidGoal(catKey, value) {
    setState((s) => ({ ...s, pyramidGoals: { ...s.pyramidGoals, [catKey]: value } }));
  }

  function addGoalTodo(rowId) {
    const text = (todoDrafts[rowId] || '').trim();
    if (!text) return;
    setState((s) => ({
      ...s,
      todosByGoal: {
        ...s.todosByGoal,
        [rowId]: [...(s.todosByGoal[rowId] || []), { id: Date.now().toString(), text, done: false }],
      },
    }));
    setTodoDrafts((d) => ({ ...d, [rowId]: '' }));
  }

  function toggleGoalTodo(rowId, todoId) {
    setState((s) => ({
      ...s,
      todosByGoal: {
        ...s.todosByGoal,
        [rowId]: (s.todosByGoal[rowId] || []).map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
      },
    }));
  }

  function deleteGoalTodo(rowId, todoId) {
    setState((s) => ({
      ...s,
      todosByGoal: {
        ...s.todosByGoal,
        [rowId]: (s.todosByGoal[rowId] || []).filter((t) => t.id !== todoId),
      },
    }));
  }

  // ---- 未来年表：編集用ヘルパー ----
  function updateTimelineField(catKey, rowId, field, value) {
    setState((s) => ({
      ...s,
      timeline: {
        ...s.timeline,
        [catKey]: s.timeline[catKey].map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
      },
    }));
  }

  function updateTimelineYear(catKey, rowId, idx, value) {
    setState((s) => ({
      ...s,
      timeline: {
        ...s.timeline,
        [catKey]: s.timeline[catKey].map((r) => {
          if (r.id !== rowId) return r;
          const years = [...r.years];
          years[idx] = value;
          return { ...r, years };
        }),
      },
    }));
  }

  function addTimelineRow(catKey) {
    setState((s) => ({
      ...s,
      timeline: { ...s.timeline, [catKey]: [...s.timeline[catKey], blankRow()] },
    }));
  }

  function removeTimelineRow(catKey, rowId) {
    setState((s) => ({
      ...s,
      timeline: { ...s.timeline, [catKey]: s.timeline[catKey].filter((r) => r.id !== rowId) },
    }));
  }

  const sortedDreams = [...state.dreams].sort((a, b) => a.targetAge - b.targetAge);

  // 未来年表：列（自分の年齢10年分）
  const startAge = Math.floor(ageYears);
  const kenBirthYear = birth.getFullYear();
  const columns = Array.from({ length: 10 }).map((_, i) => {
    const age = startAge + i;
    const year = kenBirthYear + age;
    return { age, year };
  });

  const familyRows = [
    { label: '妻', key: 'wife' },
    { label: '長女', key: 'daughter1' },
    { label: '次女', key: 'daughter2' },
  ];

  // 未来年表の「今年」列（columns[0]）に書かれた目標を自動的に拾う
  const thisYearGoals = [];
  TIMELINE_CATEGORIES.forEach((cat) => {
    (state.timeline[cat.key] || []).forEach((row) => {
      const goalText = (row.years[0] || '').trim();
      if (goalText) {
        thisYearGoals.push({
          rowId: row.id,
          categoryLabel: cat.label,
          rowLabel: row.label,
          goalText,
        });
      }
    });
  });

  return (
    <div style={styles.body}>
      <Head>
        <title>命の時計</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>命の時計</h1>
          <div style={styles.sub}>
            {Math.floor(ageYears)}歳（生後 {Math.floor(ageMs / 86400000).toLocaleString()}日） ・ {status}
          </div>
        </div>
        <button style={styles.gearBtn} onClick={() => setSettingsOpen((v) => !v)}>
          ⚙
        </button>
      </header>

      <main style={styles.main}>
        {settingsOpen && (
          <div style={styles.card}>
            <div style={styles.label}>設定</div>
            <label style={styles.fieldLabel}>
              生年月日
              <input
                type="date"
                value={state.birthDate}
                onChange={(e) => updateField('birthDate', e.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.fieldLabel}>
              平均寿命（歳・小数可）
              <input
                type="number"
                step="0.01"
                value={state.lifeExpAge}
                onChange={(e) => updateField('lifeExpAge', parseFloat(e.target.value) || 0)}
                style={styles.input}
              />
            </label>
            <div style={styles.hint}>
              目安：日本人男性 約81.09歳／女性 約87.14歳（自分の平均余命を調べて入れるとより正確）
            </div>
            <label style={styles.fieldLabel}>
              目標寿命（歳）
              <input
                type="number"
                step="1"
                value={state.targetAge}
                onChange={(e) => updateField('targetAge', parseFloat(e.target.value) || 0)}
                style={styles.input}
              />
            </label>
            <div style={{ height: 6 }} />
            <label style={styles.fieldLabel}>
              妻の生年月日
              <input
                type="date"
                value={state.family.wife}
                onChange={(e) => updateFamily('wife', e.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.fieldLabel}>
              長女の生年月日
              <input
                type="date"
                value={state.family.daughter1}
                onChange={(e) => updateFamily('daughter1', e.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.fieldLabel}>
              次女の生年月日
              <input
                type="date"
                value={state.family.daughter2}
                onChange={(e) => updateFamily('daughter2', e.target.value)}
                style={styles.input}
              />
            </label>
          </div>
        )}

        {/* 夢手帳カード */}
        <div style={styles.notebookCard}>
          <div style={styles.notebookTitleRow}>
            <div style={styles.notebookTitle}>夢手帳</div>
          </div>
          <div style={styles.notebookSub}>手帳は人生をマネジメントし、夢をかなえるツールだ。</div>

          {/* 人生時計 */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeaderRow} onClick={() => toggleSection('lifeClock')}>
              <div style={styles.sectionHeaderLeft}>
                <span style={styles.sectionIcon}>⏳</span>
                <span style={styles.sectionTitle}>人生時計</span>
                <span style={styles.sectionCaret}>{openSection === 'lifeClock' ? '▲' : '▼'}</span>
              </div>
              <div style={styles.sectionHeaderHint}>命の砂時計は、夢だけに注げ。</div>
            </div>

            {openSection === 'lifeClock' && (
              <div style={styles.sectionBody}>
                {showLifeExp && (
                  <div style={styles.clockRow}>
                    <div style={styles.clockRowTop}>
                      <div style={styles.clockRowLabel}>
                        平均余命（平均寿命{state.lifeExpAge}歳）〜 {lifeExpDate.getFullYear()}/
                        {lifeExpDate.getMonth() + 1}/{lifeExpDate.getDate()} （{Math.round(state.lifeExpAge)}歳）
                      </div>
                      <button style={styles.rowX} onClick={() => setShowLifeExp(false)}>
                        ×
                      </button>
                    </div>
                    <div style={styles.clockRowLine}>
                      {mainR.expired
                        ? '到達済み'
                        : `あと ${mainR.totalDays.toLocaleString()}日 (${mainPct.toFixed(2)}%) — ${mainR.years}年${
                            mainR.days
                          }日 ${String(mainR.h).padStart(2, '0')}:${String(mainR.m).padStart(2, '0')}:${String(
                            mainR.s
                          ).padStart(2, '0')}`}
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${mainPct.toFixed(2)}%` }} />
                    </div>
                  </div>
                )}

                {showTarget && (
                  <div style={styles.clockRow}>
                    <div style={styles.clockRowTop}>
                      <div style={styles.clockRowLabel}>
                        目標寿命 〜 {targetDate.getFullYear()}/{targetDate.getMonth() + 1}/{targetDate.getDate()}
                        （{state.targetAge}歳）
                      </div>
                      <button style={styles.rowX} onClick={() => setShowTarget(false)}>
                        ×
                      </button>
                    </div>
                    <div style={styles.clockRowLine}>
                      {tR.expired
                        ? '到達済み'
                        : `あと ${tR.totalDays.toLocaleString()}日 (${targetPct.toFixed(2)}%) — ${tR.years}年${
                            tR.days
                          }日 ${String(tR.h).padStart(2, '0')}:${String(tR.m).padStart(2, '0')}:${String(
                            tR.s
                          ).padStart(2, '0')}`}
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${targetPct.toFixed(2)}%` }} />
                    </div>
                  </div>
                )}

                <div style={styles.familyRow}>
                  <span>▶ 家族</span>
                  <button style={styles.addSmallBtn} disabled>
                    ＋ 追加
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* やりたいことリスト */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeaderRow} onClick={() => toggleSection('wantTodo')}>
              <div style={styles.sectionHeaderLeft}>
                <span style={styles.sectionIcon}>🌱</span>
                <span style={styles.sectionTitle}>やりたいことリスト</span>
                <span style={styles.sectionCaret}>{openSection === 'wantTodo' ? '▲' : '▼'}</span>
              </div>
            </div>

            {openSection === 'wantTodo' && (
              <div style={styles.sectionBody}>
                <div style={styles.labelRow}>
                  <div style={styles.smallLabel}>年齢・カテゴリーに紐づけた夢・目標</div>
                  <button style={styles.addBtn} onClick={() => setDreamFormOpen((v) => !v)}>
                    ＋ 追加
                  </button>
                </div>

                {dreamFormOpen && (
                  <div style={styles.dreamForm}>
                    <input
                      type="text"
                      placeholder="例：独立して会社を作る"
                      value={dreamTitle}
                      onChange={(e) => setDreamTitle(e.target.value)}
                      style={styles.input}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        placeholder="達成したい年齢"
                        value={dreamAge}
                        onChange={(e) => setDreamAge(e.target.value)}
                        style={{ ...styles.input, width: 110 }}
                      />
                      <select
                        value={dreamCategory}
                        onChange={(e) => setDreamCategory(e.target.value)}
                        style={{ ...styles.input, flex: 1 }}
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button style={styles.saveDreamBtn} onClick={addDream}>
                      追加する
                    </button>
                  </div>
                )}

                {sortedDreams.length === 0 && (
                  <div style={{ fontSize: 13, color: '#8A8A93', padding: '8px 0' }}>
                    まだ夢が登録されていません。「＋追加」から最初の目標を書いてみましょう。
                  </div>
                )}

                {sortedDreams.map((dream) => {
                  const dTargetDate = addYears(birth, dream.targetAge);
                  const dRemainMs = dTargetDate - now;
                  const dR = fmtRemain(dRemainMs);
                  const dTotal = dTargetDate - birth;
                  const dPct = Math.min(100, Math.max(0, (ageMs / dTotal) * 100));
                  return (
                    <div key={dream.id} style={styles.dream}>
                      <div style={styles.dreamTop}>
                        <div>
                          <div style={styles.dreamCategoryTag}>
                            {CATEGORY_LABELS[dream.category] || 'カテゴリー未設定'}
                          </div>
                          <div
                            style={{
                              ...styles.dreamTitle,
                              textDecoration: dream.achieved ? 'line-through' : 'none',
                              color: dream.achieved ? '#8A8A93' : '#1A1A1E',
                            }}
                          >
                            {dream.title}
                          </div>
                          <div style={styles.dreamSub}>
                            {dream.targetAge}歳（{dTargetDate.getFullYear()}年）まで —{' '}
                            {dR.expired ? '期限到達' : `あと${dR.years}年${dR.days}日`}
                          </div>
                        </div>
                        <button style={styles.delBtn} onClick={() => deleteDream(dream.id)}>
                          ×
                        </button>
                      </div>
                      <div style={styles.dreamProgressBar}>
                        <div
                          style={{
                            ...styles.dreamProgressFill,
                            width: `${dPct.toFixed(1)}%`,
                            background: dream.achieved ? '#2F9E44' : '#2B5FE0',
                          }}
                        />
                      </div>
                      <div
                        style={{ ...styles.dreamCheck, color: dream.achieved ? '#2F9E44' : '#2B5FE0' }}
                        onClick={() => toggleDream(dream.id)}
                      >
                        {dream.achieved ? '✓ 達成済み' : '達成としてマーク'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 夢・人生ピラミッド */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeaderRow} onClick={() => toggleSection('pyramid')}>
              <div style={styles.sectionHeaderLeft}>
                <span style={styles.sectionIcon}>🔺</span>
                <span style={styles.sectionTitle}>夢・人生ピラミッド</span>
                <span style={styles.sectionCaret}>{openSection === 'pyramid' ? '▲' : '▼'}</span>
              </div>
            </div>
            {openSection === 'pyramid' && (
              <div style={styles.sectionBody}>
                <div style={styles.comingSoon}>
                  やりたいことリストのカテゴリーに応じて自動で振り分けられます。リストを追加・編集すると、ここも自動で更新されます。
                </div>
                <div style={styles.pyramidWrap}>
                  {PYRAMID_TIERS.map((tierRow) => (
                    <div
                      key={tierRow.tier}
                      style={{ ...styles.pyramidTierRow, gridTemplateColumns: `repeat(${tierRow.keys.length}, 1fr)` }}
                    >
                      {tierRow.keys.map((catKey) => {
                        const items = state.dreams.filter((d) => d.category === catKey);
                        return (
                          <div key={catKey} style={styles.pyramidBox}>
                            <div style={styles.pyramidBoxTitle}>{CATEGORY_LABELS[catKey]}</div>
                            <div style={styles.pyramidGoalLabel}>究極の目標</div>
                            <textarea
                              style={styles.pyramidGoalInput}
                              placeholder="（空欄でOK）例：老後に何の心配もなく暮らせる経済力を蓄えたい"
                              value={state.pyramidGoals[catKey] || ''}
                              onChange={(e) => updatePyramidGoal(catKey, e.target.value)}
                              rows={2}
                            />
                            {items.length === 0 ? (
                              <div style={styles.pyramidEmpty}>（まだ夢がありません）</div>
                            ) : (
                              <ul style={styles.pyramidList}>
                                {items.map((d) => (
                                  <li key={d.id} style={styles.pyramidListItem}>
                                    {d.title}（{d.targetAge}歳）
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 未来年表 */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeaderRow} onClick={() => toggleSection('timeline')}>
              <div style={styles.sectionHeaderLeft}>
                <span style={styles.sectionIcon}>🗓️</span>
                <span style={styles.sectionTitle}>未来年表</span>
                <span style={styles.sectionCaret}>{openSection === 'timeline' ? '▲' : '▼'}</span>
              </div>
            </div>
            {openSection === 'timeline' && (
              <div style={styles.sectionBody}>
                <div style={styles.comingSoon}>
                  家族の年齢は生年月日から自動計算されます（設定⚙で変更可）。他の項目は自由に書き足してください。
                </div>
                <div style={styles.timelineScroll}>
                  <table style={styles.timelineTable}>
                    <thead>
                      <tr>
                        <th style={styles.thLabel}></th>
                        <th style={styles.th}>究極の目標</th>
                        <th style={styles.th}>将来</th>
                        <th style={styles.th}>今</th>
                        <th style={styles.th}>差</th>
                        {columns.map((c) => (
                          <th key={c.age} style={styles.thYear}>
                            {c.age}歳
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* 家族・環境 */}
                      <tr>
                        <td style={styles.tdGroup} colSpan={5 + columns.length}>
                          家族・環境
                        </td>
                      </tr>
                      {familyRows.map((f) => (
                        <tr key={f.key}>
                          <td style={styles.tdLabel}>{f.label}</td>
                          <td style={styles.td}></td>
                          <td style={styles.td}></td>
                          <td style={styles.td}></td>
                          <td style={styles.td}></td>
                          {columns.map((c) => {
                            const age = famAge(state.family[f.key], c.year);
                            const ms = age !== null ? milestone(age) : null;
                            return (
                              <td key={c.age} style={styles.tdYearReadOnly}>
                                <div>{age !== null ? `${age}歳` : ''}</div>
                                {ms && <div style={styles.milestoneText}>{ms}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* 各カテゴリー */}
                      {TIMELINE_CATEGORIES.map((cat) => (
                        <TimelineCategoryRows
                          key={cat.key}
                          cat={cat}
                          rows={state.timeline[cat.key] || []}
                          columns={columns}
                          onFieldChange={updateTimelineField}
                          onYearChange={updateTimelineYear}
                          onAddRow={addTimelineRow}
                          onRemoveRow={removeTimelineRow}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 今年の目標から作るToDo */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeaderRow} onClick={() => toggleSection('todo')}>
              <div style={styles.sectionHeaderLeft}>
                <span style={styles.sectionIcon}>✅</span>
                <span style={styles.sectionTitle}>今年の目標 ToDo</span>
                <span style={styles.sectionCaret}>{openSection === 'todo' ? '▲' : '▼'}</span>
              </div>
            </div>
            {openSection === 'todo' && (
              <div style={styles.sectionBody}>
                <div style={styles.comingSoon}>
                  未来年表の「{columns[0]?.age}歳（今年）」列に書いた目標が自動でここに並びます。目標ごとに、そのためのToDoを書き足せます。
                </div>

                {thisYearGoals.length === 0 && (
                  <div style={{ fontSize: 13, color: '#8A8A93', padding: '8px 0' }}>
                    まだ今年の目標がありません。未来年表の「{columns[0]?.age}歳」の列に目標を書き込むと、ここに表示されます。
                  </div>
                )}

                {thisYearGoals.map((goal) => {
                  const items = state.todosByGoal[goal.rowId] || [];
                  return (
                    <div key={goal.rowId} style={styles.goalTodoBlock}>
                      <div style={styles.goalTodoHeader}>
                        <span style={styles.dreamCategoryTag}>{goal.categoryLabel}</span>
                        {goal.rowLabel && <span style={styles.goalTodoLabel}>{goal.rowLabel}</span>}
                      </div>
                      <div style={styles.goalTodoText}>{goal.goalText}</div>

                      <div style={styles.todoInputRow}>
                        <input
                          type="text"
                          placeholder="このためのToDoを入力"
                          value={todoDrafts[goal.rowId] || ''}
                          onChange={(e) => setTodoDrafts((d) => ({ ...d, [goal.rowId]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addGoalTodo(goal.rowId);
                          }}
                          style={{ ...styles.input, flex: 1 }}
                        />
                        <button style={styles.saveDreamBtn} onClick={() => addGoalTodo(goal.rowId)}>
                          追加
                        </button>
                      </div>

                      {items.map((t) => (
                        <div key={t.id} style={styles.todoRow}>
                          <div style={styles.todoCheckArea} onClick={() => toggleGoalTodo(goal.rowId, t.id)}>
                            <span style={{ ...styles.todoCheckbox, ...(t.done ? styles.todoCheckboxDone : {}) }}>
                              {t.done ? '✓' : ''}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                textDecoration: t.done ? 'line-through' : 'none',
                                color: t.done ? '#8A8A93' : '#1A1A1E',
                              }}
                            >
                              {t.text}
                            </span>
                          </div>
                          <button style={styles.delBtn} onClick={() => deleteGoalTodo(goal.rowId, t.id)}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>人生のグリッド（1マス＝1年、平均寿命まで）</div>
          <div style={styles.grid}>
            {Array.from({ length: Math.ceil(state.lifeExpAge) }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.yr,
                  background:
                    i < Math.floor(ageYears) ? '#2B5FE0' : i === Math.floor(ageYears) ? '#1A1A1E' : '#EBEAE5',
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function TimelineCategoryRows({ cat, rows, columns, onFieldChange, onYearChange, onAddRow, onRemoveRow }) {
  return (
    <>
      <tr>
        <td style={styles.tdGroup} colSpan={5 + columns.length}>
          <div style={styles.tdGroupRow}>
            <span>{cat.label}</span>
            <button style={styles.addRowBtn} onClick={() => onAddRow(cat.key)}>
              ＋ 行
            </button>
          </div>
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.id}>
          <td style={styles.tdLabel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                style={styles.cellInput}
                value={row.label}
                onChange={(e) => onFieldChange(cat.key, row.id, 'label', e.target.value)}
              />
              <button style={styles.rowXsmall} onClick={() => onRemoveRow(cat.key, row.id)}>
                ×
              </button>
            </div>
          </td>
          <td style={styles.td}>
            <input
              style={styles.cellInput}
              value={row.ultimate}
              onChange={(e) => onFieldChange(cat.key, row.id, 'ultimate', e.target.value)}
            />
          </td>
          <td style={styles.td}>
            <input
              style={styles.cellInput}
              value={row.future}
              onChange={(e) => onFieldChange(cat.key, row.id, 'future', e.target.value)}
            />
          </td>
          <td style={styles.td}>
            <input
              style={styles.cellInput}
              value={row.now}
              onChange={(e) => onFieldChange(cat.key, row.id, 'now', e.target.value)}
            />
          </td>
          <td style={styles.td}>
            <input
              style={styles.cellInput}
              value={row.diff}
              onChange={(e) => onFieldChange(cat.key, row.id, 'diff', e.target.value)}
            />
          </td>
          {columns.map((c, idx) => (
            <td key={c.age} style={styles.tdYear}>
              <input
                style={styles.yearInput}
                value={row.years[idx] || ''}
                onChange={(e) => onYearChange(cat.key, row.id, idx, e.target.value)}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const styles = {
  loading: { padding: 40, fontFamily: 'sans-serif', color: '#8A8A93' },
  body: { background: '#FAFAF8', color: '#1A1A1E', fontFamily: "'Noto Sans JP', sans-serif", paddingBottom: 60, minHeight: '100vh' },
  header: { padding: '28px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: "'Zen Kaku Gothic New', sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.02em' },
  sub: { fontSize: 12, color: '#8A8A93', marginTop: 2 },
  gearBtn: { background: 'none', border: '1px solid #EBEAE5', borderRadius: 10, width: 38, height: 38, fontSize: 16, color: '#8A8A93' },
  main: { maxWidth: 720, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: '#fff', border: '1px solid #EBEAE5', borderRadius: 16, padding: 20 },
  label: { fontSize: 12, color: '#8A8A93', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#8A8A93', fontWeight: 600, display: 'block', marginBottom: 8 },
  input: { border: '1px solid #EBEAE5', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', width: '100%', marginTop: 4, boxSizing: 'border-box' },
  hint: { fontSize: 11, color: '#8A8A93', marginBottom: 8 },

  notebookCard: { background: '#fff', border: '1px solid #EBEAE5', borderRadius: 16, padding: 20 },
  notebookTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  notebookTitle: { fontFamily: "'Zen Kaku Gothic New', sans-serif", fontWeight: 900, fontSize: 18 },
  notebookSub: { fontSize: 12, color: '#8A8A93', marginTop: 4, marginBottom: 16 },

  sectionBlock: { borderTop: '1px solid #EBEAE5', paddingTop: 12, marginTop: 12 },
  sectionHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  sectionHeaderLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  sectionIcon: { fontSize: 15 },
  sectionTitle: { fontWeight: 700, fontSize: 15 },
  sectionCaret: { fontSize: 11, color: '#8A8A93' },
  sectionHeaderHint: { fontSize: 11, color: '#8A8A93' },
  sectionBody: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 },

  clockRow: {},
  clockRowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  clockRowLabel: { fontSize: 13, fontWeight: 600, lineHeight: 1.5 },
  clockRowLine: { fontFamily: "'Zen Kaku Gothic New', sans-serif", fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#2B5FE0', fontWeight: 700, marginTop: 4 },
  rowX: { background: 'none', border: 'none', color: '#8A8A93', fontSize: 16, lineHeight: 1, cursor: 'pointer' },
  progressBar: { background: '#E7EDFC', height: 6, borderRadius: 99, marginTop: 8, overflow: 'hidden' },
  progressFill: { background: '#2B5FE0', height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
  familyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#8A8A93', paddingTop: 4 },
  addSmallBtn: { background: '#F3F3F1', color: '#8A8A93', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700 },

  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  smallLabel: { fontSize: 12, color: '#8A8A93', fontWeight: 600 },
  addBtn: { background: '#E7EDFC', color: '#2B5FE0', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700 },
  dreamForm: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6, paddingBottom: 14, borderBottom: '1px solid #EBEAE5' },
  saveDreamBtn: { background: '#2B5FE0', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700 },
  dream: { borderTop: '1px solid #EBEAE5', padding: '14px 0' },
  dreamTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  dreamCategoryTag: { display: 'inline-block', background: '#F3F3F1', color: '#8A8A93', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px', marginBottom: 4 },
  dreamTitle: { fontWeight: 600, fontSize: 15 },
  dreamSub: { fontSize: 12, color: '#8A8A93', marginTop: 3 },
  delBtn: { background: 'none', border: 'none', color: '#8A8A93', fontSize: 18, lineHeight: 1, cursor: 'pointer' },
  dreamProgressBar: { background: '#E7EDFC', height: 6, borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  dreamProgressFill: { height: '100%' },
  dreamCheck: { marginTop: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' },

  comingSoon: { fontSize: 12, color: '#8A8A93', lineHeight: 1.6 },

  pyramidWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  pyramidTierRow: { display: 'grid', gap: 6 },
  pyramidBox: { background: '#FAFAF8', border: '1px solid #EBEAE5', borderRadius: 10, padding: 10, minHeight: 60 },
  pyramidBoxTitle: { fontSize: 11, fontWeight: 700, color: '#2B5FE0', marginBottom: 4 },
  pyramidEmpty: { fontSize: 11, color: '#8A8A93' },
  pyramidList: { margin: 0, paddingLeft: 16 },
  pyramidListItem: { fontSize: 12, marginBottom: 2 },
  pyramidGoalLabel: { fontSize: 9, color: '#8A8A93', fontWeight: 700, marginTop: 4 },
  pyramidGoalInput: { width: '100%', border: '1px solid #EBEAE5', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 6, resize: 'vertical' },

  todoTabs: { display: 'flex', gap: 6 },
  todoTab: { background: '#F3F3F1', color: '#8A8A93', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  todoTabActive: { background: '#2B5FE0', color: '#fff' },
  todoInputRow: { display: 'flex', gap: 8 },
  todoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EBEAE5', padding: '8px 0' },
  todoCheckArea: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  todoCheckbox: { width: 16, height: 16, borderRadius: 4, border: '1px solid #EBEAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' },
  todoCheckboxDone: { background: '#2F9E44', border: '1px solid #2F9E44' },
  goalTodoBlock: { background: '#FAFAF8', border: '1px solid #EBEAE5', borderRadius: 10, padding: 12, marginBottom: 10 },
  goalTodoHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  goalTodoLabel: { fontSize: 12, fontWeight: 700 },
  goalTodoText: { fontSize: 13, marginBottom: 10 },

  timelineScroll: { overflowX: 'auto', border: '1px solid #EBEAE5', borderRadius: 10 },
  timelineTable: { borderCollapse: 'collapse', width: '100%', fontSize: 11 },
  th: { background: '#F3F3F1', padding: '6px 8px', fontSize: 10, fontWeight: 700, borderBottom: '1px solid #EBEAE5', whiteSpace: 'nowrap' },
  thLabel: { background: '#F3F3F1', padding: '6px 8px', minWidth: 110, borderBottom: '1px solid #EBEAE5' },
  thYear: { background: '#F3F3F1', padding: '6px 6px', fontSize: 10, fontWeight: 700, borderBottom: '1px solid #EBEAE5', minWidth: 56 },
  tdGroup: { background: '#1A1A1E', color: '#fff', fontWeight: 700, fontSize: 11, padding: '6px 8px' },
  tdGroupRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  addRowBtn: { background: '#2B5FE0', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' },
  tdLabel: { padding: '4px 8px', borderBottom: '1px solid #EBEAE5', minWidth: 110 },
  td: { padding: '4px 6px', borderBottom: '1px solid #EBEAE5', minWidth: 70 },
  tdYear: { padding: '2px', borderBottom: '1px solid #EBEAE5', minWidth: 56 },
  tdYearReadOnly: { padding: '4px 6px', borderBottom: '1px solid #EBEAE5', minWidth: 56, textAlign: 'center', fontSize: 11 },
  milestoneText: { fontSize: 9, color: '#2B5FE0', fontWeight: 700, marginTop: 2 },
  cellInput: { border: '1px solid #EBEAE5', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  yearInput: { border: '1px solid #EBEAE5', borderRadius: 6, padding: '4px 4px', fontSize: 10, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', textAlign: 'center' },
  rowXsmall: { background: 'none', border: 'none', color: '#8A8A93', fontSize: 13, lineHeight: 1, cursor: 'pointer' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(18, 1fr)', gap: 3 },
  yr: { aspectRatio: '1', borderRadius: 2, minWidth: 0 },
};
