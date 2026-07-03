import { useEffect, useState } from 'react';
import Head from 'next/head';

const CATEGORY_LABELS = {
  money: '経済・モノ・お金',
  family_private: 'プライベート・家庭',
  work: '仕事・知識',
  knowledge: '教養・精神',
  health: '健康',
  mind: '人間関係',
};

const PYRAMID_ORDER = ['money', 'family_private', 'work', 'knowledge', 'health', 'mind'];

const TIMELINE_CATEGORIES = [
  { key: 'health', label: '健康' },
  { key: 'knowledge', label: '教養・精神' },
  { key: 'mind', label: '人間関係' },
  { key: 'work', label: '仕事・知識' },
  { key: 'family_private', label: 'プライベート・家庭' },
  { key: 'money', label: '経済・モノ・お金' },
  { key: 'forecast', label: '未来予測' },
];

const DEFAULT_STATE = {
  birthDate: '1980-08-31',
  lifeExpAge: 81.09,
  targetAge: 100,
  dreams: [],
  pyramidGoals: {},
  timeline: {},
};

function addYears(date, years) {
  const d = new Date(date.getTime());
  const wholeYears = Math.floor(years);
  const fraction = years - wholeYears;
  d.setFullYear(d.getFullYear() + wholeYears);
  d.setTime(d.getTime() + fraction * 365.25 * 24 * 3600 * 1000);
  return d;
}

export default function Print() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [now] = useState(new Date());

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((data) => {
        setState({ ...DEFAULT_STATE, ...data });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return <div style={{ padding: 40 }}>読み込み中…</div>;

  const birth = new Date(state.birthDate + 'T00:00:00');
  const ageMs = now - birth;
  const ageYears = Math.floor(ageMs / (365.25 * 24 * 3600 * 1000));

  const lifeExpDate = addYears(birth, state.lifeExpAge);
  const mainTotalDays = Math.floor((lifeExpDate - birth) / 86400000);
  const mainRemainDays = Math.floor((lifeExpDate - now) / 86400000);
  const mainPct = Math.min(100, (100 * (mainTotalDays - mainRemainDays)) / mainTotalDays);

  const targetDate = addYears(birth, state.targetAge);
  const targetTotalDays = Math.floor((targetDate - birth) / 86400000);
  const targetRemainDays = Math.floor((targetDate - now) / 86400000);
  const targetPct = Math.min(100, (100 * (targetTotalDays - targetRemainDays)) / targetTotalDays);

  // 未来年表の「今年」列（1列目）に書かれた目標を集める（項目名も一緒に）
  const thisYearGoals = [];
  TIMELINE_CATEGORIES.forEach((cat) => {
    (state.timeline[cat.key] || []).forEach((row) => {
      const itemName = (row.ultimate || '').trim();
      const text = (row.years && row.years[0] ? row.years[0] : '').trim();
      if (itemName || text) {
        thisYearGoals.push({ category: cat.label, itemName, text });
      }
    });
  });

  const activeDreams = [...state.dreams]
    .filter((d) => !d.achieved)
    .sort((a, b) => a.targetAge - b.targetAge)
    .slice(0, 12);

  return (
    <div style={styles.page}>
      <Head>
        <title>夢手帳 印刷用</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@700;900&family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @page { size: A4; margin: 12mm; }
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
      </Head>

      <button className="no-print" style={styles.printBtn} onClick={() => window.print()}>
        🖨 印刷する
      </button>

      <div style={styles.sheet}>
        <div style={styles.headerRow}>
          <div style={styles.title}>夢手帳</div>
          <div style={styles.headerMeta}>
            {ageYears}歳（{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 時点）
          </div>
        </div>

        <div style={styles.clockRow}>
          <div style={styles.clockBox}>
            <div style={styles.clockLabel}>平均寿命（{state.lifeExpAge}歳）まで</div>
            <div style={styles.clockValue}>
              あと {mainRemainDays.toLocaleString()}日（{mainPct.toFixed(1)}% 経過）
            </div>
          </div>
          <div style={styles.clockBox}>
            <div style={styles.clockLabel}>目標寿命（{state.targetAge}歳）まで</div>
            <div style={styles.clockValue}>
              あと {targetRemainDays.toLocaleString()}日（{targetPct.toFixed(1)}% 経過）
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>今年の目標</div>
          {thisYearGoals.length === 0 ? (
            <div style={styles.empty}>未来年表の「今年」の列に目標を書くとここに表示されます</div>
          ) : (
            <div style={styles.goalGrid}>
              {thisYearGoals.map((g, i) => (
                <div key={i} style={styles.goalItem}>
                  <span style={styles.goalTag}>{g.category}</span>
                  {g.itemName && <strong>{g.itemName}</strong>}
                  {g.itemName && g.text ? '：' : ''}
                  {g.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.twoCol}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>やりたいことリスト</div>
            {activeDreams.length === 0 ? (
              <div style={styles.empty}>まだ登録がありません</div>
            ) : (
              <ul style={styles.dreamList}>
                {activeDreams.map((d) => (
                  <li key={d.id} style={styles.dreamItem}>
                    ◯ {d.title}（{d.targetAge}歳）
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>夢・人生ピラミッド 究極の目標</div>
            <ul style={styles.pyramidList}>
              {PYRAMID_ORDER.map((key) => {
                const text = (state.pyramidGoals && state.pyramidGoals[key]) || '';
                return (
                  <li key={key} style={styles.pyramidItem}>
                    <span style={styles.pyramidCatLabel}>{CATEGORY_LABELS[key]}</span>
                    <span>{text || '（未記入）'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: '#EDEDE8', minHeight: '100vh', padding: '24px 0', fontFamily: "'Noto Sans JP', sans-serif" },
  printBtn: {
    display: 'block',
    margin: '0 auto 16px',
    background: '#2B5FE0',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  sheet: {
    width: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
    background: '#fff',
    padding: '14mm',
    boxSizing: 'border-box',
    color: '#1A1A1E',
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #1A1A1E', paddingBottom: 8, marginBottom: 14 },
  title: { fontFamily: "'Zen Kaku Gothic New', sans-serif", fontWeight: 900, fontSize: 26 },
  headerMeta: { fontSize: 12, color: '#555' },
  clockRow: { display: 'flex', gap: 12, marginBottom: 18 },
  clockBox: { flex: 1, border: '1px solid #ccc', borderRadius: 8, padding: '10px 12px' },
  clockLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  clockValue: { fontSize: 15, fontWeight: 700 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 14, fontWeight: 700, borderLeft: '4px solid #2B5FE0', paddingLeft: 8, marginBottom: 8 },
  empty: { fontSize: 12, color: '#888' },
  goalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' },
  goalItem: { fontSize: 12, lineHeight: 1.6 },
  goalTag: { display: 'inline-block', background: '#EEE', borderRadius: 4, fontSize: 10, padding: '1px 6px', marginRight: 6 },
  twoCol: { display: 'flex', gap: 20 },
  dreamList: { margin: 0, padding: 0, listStyle: 'none' },
  dreamItem: { fontSize: 12, lineHeight: 1.9 },
  pyramidList: { margin: 0, padding: 0, listStyle: 'none' },
  pyramidItem: { fontSize: 12, lineHeight: 1.9, display: 'flex', gap: 8 },
  pyramidCatLabel: { fontWeight: 700, minWidth: 88, display: 'inline-block' },
};
