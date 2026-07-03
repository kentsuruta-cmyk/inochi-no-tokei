import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

const DEFAULT_STATE = {
  birthDate: '1980-08-31',
  lifeExpAge: 81.09,
  targetAge: 100,
  dreams: [],
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
  if (ms <= 0) return { years: 0, days: 0, h: 0, m: 0, s: 0, expired: true };
  const totalSec = Math.floor(ms / 1000);
  const years = Math.floor(totalSec / (365.25 * 24 * 3600));
  const remAfterYears = totalSec - Math.floor(years * 365.25 * 24 * 3600);
  const days = Math.floor(remAfterYears / 86400);
  const h = Math.floor((remAfterYears % 86400) / 3600);
  const m = Math.floor((remAfterYears % 3600) / 60);
  const s = remAfterYears % 60;
  return { years, days, h, m, s, expired: false };
}

export default function Home() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dreamFormOpen, setDreamFormOpen] = useState(false);
  const [dreamTitle, setDreamTitle] = useState('');
  const [dreamAge, setDreamAge] = useState('');
  const [status, setStatus] = useState('');
  const saveTimer = useRef(null);

  // 初回読み込み
  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((data) => {
        setState({ ...DEFAULT_STATE, ...data });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // 毎秒更新
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 変更を1秒デバウンスしてRedisへ保存
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

  const gridTotal = Math.ceil(state.lifeExpAge);
  const currentYear = Math.floor(ageYears);

  function updateField(field, value) {
    setState((s) => ({ ...s, [field]: value }));
  }

  function addDream() {
    const title = dreamTitle.trim();
    const age = parseFloat(dreamAge);
    if (!title || !age) return;
    setState((s) => ({
      ...s,
      dreams: [...s.dreams, { id: Date.now().toString(), title, targetAge: age, achieved: false }],
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

  const sortedDreams = [...state.dreams].sort((a, b) => a.targetAge - b.targetAge);

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
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.label}>平均寿命までの残り時間</div>
          <div style={styles.bigTimer}>
            {mainR.expired ? (
              '到達済み'
            ) : (
              <>
                {mainR.years}
                <span style={styles.unit}>年</span>
                {mainR.days}
                <span style={styles.unit}>日</span>
                {String(mainR.h).padStart(2, '0')}:{String(mainR.m).padStart(2, '0')}:
                {String(mainR.s).padStart(2, '0')}
              </>
            )}
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${mainPct.toFixed(2)}%` }} />
          </div>
          <div style={styles.meta}>
            平均寿命 {state.lifeExpAge}歳（{lifeExpDate.getFullYear()}年{lifeExpDate.getMonth() + 1}月
            {lifeExpDate.getDate()}日）まで {mainPct.toFixed(2)}% 経過
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>目標寿命までの残り時間</div>
          <div style={styles.bigTimer}>
            {tR.expired ? (
              '到達済み'
            ) : (
              <>
                {tR.years}
                <span style={styles.unit}>年</span>
                {tR.days}
                <span style={styles.unit}>日</span>
                {String(tR.h).padStart(2, '0')}:{String(tR.m).padStart(2, '0')}:{String(tR.s).padStart(2, '0')}
              </>
            )}
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${targetPct.toFixed(2)}%` }} />
          </div>
          <div style={styles.meta}>
            目標寿命 {state.targetAge}歳（{targetDate.getFullYear()}年{targetDate.getMonth() + 1}月
            {targetDate.getDate()}日）まで {targetPct.toFixed(2)}% 経過
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>人生のグリッド（1マス＝1年、平均寿命まで）</div>
          <div style={styles.grid}>
            {Array.from({ length: gridTotal }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.yr,
                  background: i < currentYear ? '#2B5FE0' : i === currentYear ? '#1A1A1E' : '#EBEAE5',
                }}
              />
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.labelRow}>
            <div style={styles.label}>夢・目標リスト</div>
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
                  style={{ ...styles.input, width: 120 }}
                />
                <button style={styles.saveDreamBtn} onClick={addDream}>
                  追加する
                </button>
              </div>
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
      </main>
    </div>
  );
}

const styles = {
  loading: { padding: 40, fontFamily: 'sans-serif', color: '#8A8A93' },
  body: { background: '#FAFAF8', color: '#1A1A1E', fontFamily: "'Noto Sans JP', sans-serif", paddingBottom: 60, minHeight: '100vh' },
  header: { padding: '28px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: "'Zen Kaku Gothic New', sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.02em' },
  sub: { fontSize: 12, color: '#8A8A93', marginTop: 2 },
  gearBtn: { background: 'none', border: '1px solid #EBEAE5', borderRadius: 10, width: 38, height: 38, fontSize: 16, color: '#8A8A93' },
  main: { maxWidth: 520, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: '#fff', border: '1px solid #EBEAE5', borderRadius: 16, padding: 20 },
  label: { fontSize: 12, color: '#8A8A93', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 10 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#8A8A93', fontWeight: 600, display: 'block', marginBottom: 8 },
  input: { border: '1px solid #EBEAE5', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', width: '100%', marginTop: 4, boxSizing: 'border-box' },
  hint: { fontSize: 11, color: '#8A8A93', marginBottom: 8 },
  bigTimer: { fontFamily: "'Zen Kaku Gothic New', sans-serif", fontVariantNumeric: 'tabular-nums', fontWeight: 900, fontSize: 28, lineHeight: 1.25 },
  unit: { fontSize: 14, fontWeight: 500, color: '#8A8A93', marginRight: 8 },
  progressBar: { background: '#E7EDFC', height: 8, borderRadius: 99, marginTop: 14, overflow: 'hidden' },
  progressFill: { background: '#2B5FE0', height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
  meta: { marginTop: 10, fontSize: 12, color: '#8A8A93' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 5 },
  yr: { aspectRatio: '1', borderRadius: 3 },
  addBtn: { background: '#E7EDFC', color: '#2B5FE0', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700 },
  dreamForm: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #EBEAE5' },
  saveDreamBtn: { background: '#2B5FE0', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, width: 110 },
  dream: { borderTop: '1px solid #EBEAE5', padding: '14px 0' },
  dreamTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  dreamTitle: { fontWeight: 600, fontSize: 15 },
  dreamSub: { fontSize: 12, color: '#8A8A93', marginTop: 3 },
  delBtn: { background: 'none', border: 'none', color: '#8A8A93', fontSize: 18, lineHeight: 1, cursor: 'pointer' },
  dreamProgressBar: { background: '#E7EDFC', height: 6, borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  dreamProgressFill: { height: '100%' },
  dreamCheck: { marginTop: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};
