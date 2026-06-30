/* =========================================================================
   ローマ字タイピング — コア（ローマ字判定エンジン ＋ 育成エンジン）
   ・漢字/さんすうクイズの育成思想（図鑑・称号・メダル・コンボ・セーブ）を踏襲。
   ・localStorage キー 'typingQuiz.v1'（このアプリ専用・他アプリと分離）。

   ◆ ローマ字判定（Romaji）
     - かな（ひらがな/カタカナ）を「トークン」に分け、各トークンに複数の
       正しいつづり（し=shi/si など）を許可。「っ」「ん」「ー」も処理。
     - 1文字ごとに「今までの入力が正しいつづりの途中か」を判定する。
   ◆ 育成（TypingCore）
     - かな図鑑（打てたかなを集める）・にがてキー記録・称号・メダル等。
   ========================================================================= */
(function (global) {

  /* ============================ ローマ字テーブル ============================ */
  // 1文字かな → 許可するつづり（先頭が「おすすめ表記」＝ヒントに使う）
  const R = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'さ': ['sa'], 'し': ['shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'た': ['ta'], 'ち': ['chi'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'だ': ['da'], 'ぢ': ['ji', 'di'], 'づ': ['zu', 'du'], 'で': ['de'], 'ど': ['do'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu'], 'へ': ['he'], 'ほ': ['ho'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'ゐ': ['wi'], 'ゑ': ['we'], 'を': ['wo', 'o'],
    'ゔ': ['vu'],
    // 小さいかな（単体）
    'ぁ': ['la', 'xa'], 'ぃ': ['li', 'xi'], 'ぅ': ['lu', 'xu'], 'ぇ': ['le', 'xe'], 'ぉ': ['lo', 'xo'],
    'ゃ': ['lya', 'xya'], 'ゅ': ['lyu', 'xyu'], 'ょ': ['lyo', 'xyo'], 'ゎ': ['lwa', 'xwa'],
    // 拗音（よう音）
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'], 'しぇ': ['she', 'sye'],
    'じゃ': ['ja', 'jya', 'zya'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じょ': ['jo', 'jyo', 'zyo'], 'じぇ': ['je', 'jye'],
    'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'], 'ちぇ': ['che', 'tye'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'], 'ふゅ': ['fyu'],
    'てぃ': ['thi'], 'でぃ': ['dhi'], 'とぅ': ['twu'], 'どぅ': ['dwu'],
    'うぃ': ['wi'], 'うぇ': ['we'], 'うぉ': ['who'],
    'ゔぁ': ['va'], 'ゔぃ': ['vi'], 'ゔぇ': ['ve'], 'ゔぉ': ['vo'],
    // 記号
    'ー': ['-'], '、': [','], '。': ['.'], '，': [','], '．': ['.'],
    '・': ['/'], '！': ['!'], '？': ['?'], '　': [' '], ' ': [' '],
  };

  // カタカナ→ひらがな（判定用に正規化。ー はそのまま）
  function toHira(s) {
    let out = '';
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c >= 0x30A1 && c <= 0x30F6) out += String.fromCodePoint(c - 0x60);
      else out += ch;
    }
    return out;
  }

  const VOWELS = 'aiueo';

  // かな文字列 → トークン配列（拗音などは2文字を1トークンに）
  function tokenize(raw) {
    const s = toHira(raw);
    const toks = [];
    for (let i = 0; i < s.length;) {
      const two = s.substr(i, 2);
      if (R[two]) { toks.push(two); i += 2; }
      else { toks.push(s[i]); i += 1; }
    }
    return toks;
  }

  // そのトークンの基本つづり候補（「っ」「ん」以外）
  function baseOptions(tok) {
    if (tok == null) return [];
    return R[tok] || [tok]; // 表に無い文字（英字・記号）はその文字自身
  }

  // 位置 ti のトークンが受けつける入力候補
  function optionsFor(toks, ti) {
    const tok = toks[ti];
    if (tok === 'っ') {
      const opts = [];
      const next = toks[ti + 1];
      if (next) {
        for (const o of optionsForNext(toks, ti + 1)) {
          const c = o[0];
          if (c && !VOWELS.includes(c) && c >= 'a' && c <= 'z') {
            if (!opts.includes(c)) opts.push(c);
            if (c === 'c' && !opts.includes('t')) opts.push('t'); // っち=tchi も許可
          }
        }
      }
      opts.push('ltu', 'xtu', 'ltsu');
      return opts;
    }
    if (tok === 'ん') {
      const opts = ['nn', 'xn'];
      const next = toks[ti + 1];
      let single = false;
      if (!next) single = true;
      else {
        const firsts = optionsForNext(toks, ti + 1).map(function (o) { return o[0]; });
        if (firsts.every(function (c) { return c && !'aiueony'.includes(c); })) single = true;
      }
      if (single) opts.push('n');
      return opts;
    }
    return baseOptions(tok);
  }

  // 「っ」「ん」が次トークンの先頭子音を知るための補助（次が記号等でも安全に）
  function optionsForNext(toks, ti) {
    const tok = toks[ti];
    if (tok === 'っ') return ['t']; // 連続「っ」は実用上ほぼ無い。安全側。
    if (tok === 'ん') return ['n'];
    return baseOptions(tok);
  }

  /* 入力評価：typed が「正しいつづりの途中（prefix）か」を判定。
     返り値 { valid, complete, doneTokens, partialOpt, partialK }
       valid      … 今の入力は正しいつづりの途中（or 完成）
       complete   … すべて打ち終えた
       doneTokens … 何トークンめまで打ち終えたか（かなのハイライト用）
       partialOpt … 今打っている途中のつづり（ヒント表示用）
       partialK   … そのうち何文字打ったか                                 */
  function evaluate(toks, typed) {
    function rec(ti, pos) {
      if (pos === typed.length) {
        return { valid: true, complete: ti === toks.length, doneTokens: ti, partialOpt: '', partialK: 0 };
      }
      if (ti >= toks.length) return null;
      const opts = optionsFor(toks, ti);
      for (const opt of opts) {
        let k = 0;
        while (k < opt.length && pos + k < typed.length && opt[k] === typed[pos + k]) k++;
        if (pos + k === typed.length) {
          if (k === opt.length) {
            return { valid: true, complete: ti + 1 === toks.length, doneTokens: ti + 1, partialOpt: '', partialK: 0 };
          }
          return { valid: true, complete: false, doneTokens: ti, partialOpt: opt, partialK: k };
        } else if (k === opt.length) {
          const r = rec(ti + 1, pos + opt.length);
          if (r) return r;
        }
      }
      return null;
    }
    return rec(0, 0) || { valid: false };
  }

  // 正しい入力 typed の「次に押せる文字」の集合（ヒント＆にがてキー記録用）
  const ALPHA = 'abcdefghijklmnopqrstuvwxyz-,./!?; ';
  function nextChars(toks, typed) {
    const set = [];
    for (const c of ALPHA) {
      if (evaluate(toks, typed + c).valid) set.push(c);
    }
    return set;
  }

  // おすすめ（先頭表記）でつないだ全文ローマ字（ヒント全体表示用）
  function canonical(toks) {
    let out = '';
    for (let i = 0; i < toks.length; i++) {
      const opts = optionsFor(toks, i);
      out += opts[0] || '';
    }
    return out;
  }

  const Romaji = { tokenize: tokenize, evaluate: evaluate, nextChars: nextChars, canonical: canonical, toHira: toHira, optionsFor: optionsFor };

  /* ============================ 育成エンジン ============================ */
  const STORE_KEY = 'typingQuiz.v1';
  let store = {};
  function load() {
    try { store = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { store = {}; }
    store.kana = store.kana || {};          // { かな: 正かい回数 } 図鑑
    store.keys = store.keys || {};          // { 英字: {ok,miss} } にがてキー
    store.medals = store.medals || {};
    store.bestCombo = store.bestCombo || 0;
    store.plays = store.plays || 0;
    store.totalChars = store.totalChars || 0;   // 打てたかな（正かい）累計
    store.totalKeys = store.totalKeys || 0;     // 打鍵総数
    store.bestKpm = store.bestKpm || 0;
    store.perfectCount = store.perfectCount || 0;
    store.dailyTotal = store.dailyTotal || 0;
    store.cleared = store.cleared || {};        // { レベルID: true } 解放用
    store.levelBest = store.levelBest || {};    // { レベルID: {kpm,acc} }
    return store;
  }
  load();
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }

  /* かな図鑑：ごじゅうおん＋濁点＋拗音の代表セット（集めるカード） */
  const DEX = Object.keys(R).filter(function (k) {
    if (k.length > 2) return false;
    return /[ぁ-ゖ]/.test(k[0]) && k !== 'っ'; // ひらがな主体。記号と促音は除外
  });
  const dexCount = function () { return DEX.filter(function (k) { return (store.kana[k] || 0) >= 1; }).length; };
  const dexMaster = function () { return DEX.filter(function (k) { return (store.kana[k] || 0) >= 5; }).length; };
  const dexTotal = DEX.length;

  function recordKana(kana) {
    const h = toHira(kana);
    if (R[h] && h.length <= 2 && DEX.includes(h)) store.kana[h] = (store.kana[h] || 0) + 1;
  }
  function recordKey(letter, ok) {
    if (!letter || letter < 'a' || letter > 'z') return;
    const s = store.keys[letter] || { ok: 0, miss: 0 };
    if (ok) s.ok++; else s.miss++;
    store.keys[letter] = s;
  }
  // にがてキー上位（ミス率の高い順）
  function weakKeys(n) {
    const arr = Object.keys(store.keys).map(function (k) {
      const s = store.keys[k]; const t = s.ok + s.miss;
      return { key: k, miss: s.miss, rate: t ? s.miss / t : 0, total: t };
    }).filter(function (x) { return x.miss > 0; });
    arr.sort(function (a, b) { return b.miss - a.miss || b.rate - a.rate; });
    return arr.slice(0, n || 5);
  }

  function bumpChars(n) { store.totalChars = (store.totalChars || 0) + (n || 1); }
  function bumpKeys(n) { store.totalKeys = (store.totalKeys || 0) + (n || 1); }
  function noteCombo(c) { if (c > (store.bestCombo || 0)) store.bestCombo = c; }
  function notePlay() { store.plays = (store.plays || 0) + 1; }
  function notePerfect() { store.perfectCount = (store.perfectCount || 0) + 1; }
  function noteDaily() { store.dailyTotal = (store.dailyTotal || 0) + 1; }
  function noteKpm(kpm) { if (kpm > (store.bestKpm || 0)) store.bestKpm = Math.round(kpm); }
  function noteLevel(id, kpm, acc) {
    const b = store.levelBest[id] || { kpm: 0, acc: 0 };
    if (kpm > b.kpm) b.kpm = Math.round(kpm);
    if (acc > b.acc) b.acc = Math.round(acc);
    store.levelBest[id] = b;
  }
  function clearLevel(id) { store.cleared[id] = true; }
  function isCleared(id) { return !!store.cleared[id]; }

  /* 称号（タイピング級〜段）：打てたかな累計 totalChars で昇格 */
  const STAGES = [
    { at: 0, name: 'タイピング 10きゅう', emoji: '🥚' },
    { at: 30, name: 'タイピング 9きゅう', emoji: '🐣' },
    { at: 80, name: 'タイピング 8きゅう', emoji: '🐥' },
    { at: 160, name: 'タイピング 7きゅう', emoji: '🐤' },
    { at: 300, name: 'タイピング 6きゅう', emoji: '🐔' },
    { at: 500, name: 'タイピング 5きゅう', emoji: '🦅' },
    { at: 800, name: 'タイピング 4きゅう', emoji: '🐉' },
    { at: 1200, name: 'タイピング 3きゅう', emoji: '⚡' },
    { at: 1800, name: 'タイピング 2きゅう', emoji: '🌟' },
    { at: 2600, name: 'タイピング 1きゅう', emoji: '💎' },
    { at: 3600, name: 'タイピング 初だん', emoji: '🏅' },
    { at: 5000, name: 'タイピング 2だん', emoji: '🥈' },
    { at: 7000, name: 'タイピング 3だん', emoji: '🥇' },
    { at: 10000, name: 'タイピング 名人', emoji: '👑' },
    { at: 15000, name: 'タイピング マスター', emoji: '🛡️' },
  ];
  function stage() {
    let cur = STAGES[0];
    for (const s of STAGES) if (store.totalChars >= s.at) cur = s;
    const idx = STAGES.indexOf(cur);
    const next = STAGES[idx + 1] || null;
    return { cur: cur, next: next, value: store.totalChars };
  }

  /* メダル */
  const MEDALS = [
    { id: 'first', name: 'はじめの一歩', emoji: '👣', test: function () { return store.plays >= 1; } },
    { id: 'play10', name: '10かいあそんだ', emoji: '🎮', test: function () { return store.plays >= 10; } },
    { id: 'play50', name: '50かいあそんだ', emoji: '🕹️', test: function () { return store.plays >= 50; } },
    { id: 'c100', name: '100もじ打った', emoji: '💯', test: function () { return store.totalChars >= 100; } },
    { id: 'c1000', name: '1000もじ打った', emoji: '📜', test: function () { return store.totalChars >= 1000; } },
    { id: 'combo10', name: '10れんぞく', emoji: '🔥', test: function () { return store.bestCombo >= 10; } },
    { id: 'combo30', name: '30れんぞく', emoji: '🌋', test: function () { return store.bestCombo >= 30; } },
    { id: 'perfect', name: 'ノーミスクリア', emoji: '✨', test: function () { return store.perfectCount >= 1; } },
    { id: 'perfect10', name: 'ノーミス10かい', emoji: '🌈', test: function () { return store.perfectCount >= 10; } },
    { id: 'kpm60', name: 'はやさ60とっぱ', emoji: '🚀', test: function () { return store.bestKpm >= 60; } },
    { id: 'kpm120', name: 'はやさ120とっぱ', emoji: '⚡', test: function () { return store.bestKpm >= 120; } },
    { id: 'kpm200', name: 'はやさ200とっぱ', emoji: '💨', test: function () { return store.bestKpm >= 200; } },
    { id: 'dex25', name: 'かな図鑑 半分', emoji: '📗', test: function () { return dexCount() >= Math.floor(dexTotal / 2); } },
    { id: 'dexall', name: 'かな図鑑コンプ', emoji: '📚', test: function () { return dexCount() >= dexTotal; } },
    { id: 'daily7', name: 'デイリー7かい', emoji: '📅', test: function () { return store.dailyTotal >= 7; } },
    { id: 'clearall', name: '全レベルクリア', emoji: '🏆', test: function () { return ['home', 'aiueo1', 'aiueo5', 'words', 'special', 'phrase', 'sentence', 'text'].every(isCleared); } },
  ];
  function checkMedals() {
    const got = [];
    for (const m of MEDALS) {
      if (m.test() && !store.medals[m.id]) { store.medals[m.id] = true; got.push(m); }
    }
    return got; // 新しく獲得したメダル
  }
  function medalCount() { return Object.keys(store.medals).length; }

  function resetAll() { store = {}; localStorage.removeItem(STORE_KEY); load(); }

  /* ── セーブ／読み込み（store 全体＝進捗をまとめて入出力） ── */
  function exportSave(filename) {
    const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'ローマ字タイピング-きろく.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function importSave(file, onOk) {
    const r = new FileReader();
    r.onload = function () {
      try {
        const obj = JSON.parse(r.result);
        if (!obj || typeof obj !== 'object' || !obj.kana) throw 0;
        if (!confirm('いまの きろくを、よみこんだ きろくに 入れかえます。よろしいですか？')) return;
        localStorage.setItem(STORE_KEY, JSON.stringify(obj));
        if (onOk) onOk(); else location.reload();
      } catch (e) { alert('この ファイルは よみこめませんでした。'); }
    };
    r.readAsText(file);
  }

  const TypingCore = {
    Romaji: Romaji,
    store: function () { return store; },
    load: load, save: save, resetAll: resetAll,
    recordKana: recordKana, recordKey: recordKey, weakKeys: weakKeys,
    bumpChars: bumpChars, bumpKeys: bumpKeys, noteCombo: noteCombo, notePlay: notePlay,
    notePerfect: notePerfect, noteDaily: noteDaily, noteKpm: noteKpm, noteLevel: noteLevel,
    clearLevel: clearLevel, isCleared: isCleared,
    DEX: DEX, dexCount: dexCount, dexMaster: dexMaster, dexTotal: dexTotal, kanaCount: function (k) { return store.kana[toHira(k)] || 0; },
    STAGES: STAGES, stage: stage,
    MEDALS: MEDALS, checkMedals: checkMedals, medalCount: medalCount,
    exportSave: exportSave, importSave: importSave,
  };

  global.Romaji = Romaji;
  global.TypingCore = TypingCore;
})(typeof window !== 'undefined' ? window : this);
