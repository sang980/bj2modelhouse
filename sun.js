/* 일조 시뮬레이션 — 55A·55B·55C·56T 공용
   날짜(1월 1일~12월 31일)와 시각에 맞춰 해·달·하늘을 움직이고, 그림자를 켠 햇빛이 창으로 들어오는 자리·각도를 보여 줌.
   재생하면 2초에 1시간씩 흐름. 위치: 성남복정2 A-1블록(북위 37.4514°, 동경 127.1432°), 한국 표준시.
   '우리 집 들어가기'로 들어오면 실제 거실 방향과, 3D 조감도에서 잰 주변 건물·산의 높이각(가림)을 씀. */
const LAT = 37.4514, LNG = 127.1432, RAD = Math.PI / 180, DAYMS = 864e5, OB = RAD * 23.4397;
const toDays = ms => ms / DAYMS - .5 + 2440588 - 2451545;
const raOf = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OB) - Math.tan(b) * Math.sin(OB), Math.cos(l));
const decOf = (l, b) => Math.asin(Math.sin(b) * Math.cos(OB) + Math.cos(b) * Math.sin(OB) * Math.sin(l));
function sunC(d) { const M = RAD * (357.5291 + .98560028 * d), C = RAD * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)), L = M + C + RAD * 102.9372 + Math.PI; return { ra: raOf(L, 0), dec: decOf(L, 0) }; }
function moonC(d) { const L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d), l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F); return { ra: raOf(l, b), dec: decOf(l, b), dist: 385001 - 20905 * Math.cos(M) }; }
/* 고도(도)·방위(도, 북=0 시계방향) */
function altAz(c, d) { const phi = RAD * LAT, H = RAD * (280.16 + 360.9856235 * d) + RAD * LNG - c.ra;
  const alt = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H)), az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi));
  return { alt: alt / RAD, brg: ((az / RAD + 180) % 360 + 360) % 360 }; }
function moonPhase(d) { const s = sunC(d), m = moonC(d), sd = 149598000, phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)), inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi)),
  ang = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
  return { frac: (1 + Math.cos(inc)) / 2, phase: .5 + .5 * inc * (ang < 0 ? -1 : 1) / Math.PI }; }
const KST = 9 * 3600e3, YEAR = new Date(Date.now() + KST).getUTCFullYear();
const msOf = (mo, dd, min) => Date.UTC(YEAR, mo - 1, dd) - KST + min * 60e3;
const sunAt = (mo, dd, min) => altAz(sunC(toDays(msOf(mo, dd, min))), toDays(msOf(mo, dd, min)));
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const DIR16 = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
const dirName = b => DIR16[Math.round(((b % 360) + 360) % 360 / 22.5) % 16];
const hm = min => { const m = Math.round(min), h = Math.floor(m / 60) % 24; return String(h).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const ampm = min => { const m = Math.round(min) % 1440, h = Math.floor(m / 60); return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + String(m % 60).padStart(2, '0'); };
const dur = min => { const m = Math.round(min); return m >= 60 ? Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') : m + '분'; };
const MDAYS = [31, 28 + (YEAR % 4 === 0 && (YEAR % 100 !== 0 || YEAR % 400 === 0) ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SPECIAL = { '3-20': '춘분', '6-21': '하지', '9-23': '추분', '12-22': '동지' };
const WD = '일월화수목금토';

export function initSun(o) {
  const { THREE, scene, renderer, sun, hemi, sky, skyFloor, rectLights, state } = o;
  if (window.__sun) return window.__sun;
  const home = window.__homeInfo || null, hz = home && Array.isArray(home.hz) && home.hz.length === 360 ? home.hz : null;
  const hasHomeBrg = !!(home && typeof home.brg === 'number');
  let B = hasHomeBrg ? home.brg : 180; /* 거실 창 바깥(+z)이 향하는 방위 */

  /* 세대 범위(하늘·주변 3D 제외) → 햇빛 그림자 범위·과녁 */
  const box = new THREE.Box3(), tb = new THREE.Box3(), V = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(m => { if (!m.isMesh || m === skyFloor) return; for (let p = m; p; p = p.parent) if (p === sky) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); tb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); tb.getSize(V); if (V.x > 40 || V.z > 40) return; box.union(tb); });
  const C = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3()); C.y = 0;
  const SR = box.isEmpty() ? 9 : Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + .6;
  /* 거실 창: 가장 넓은 바깥(+z) 창 — 창 위 끝 높이로 바닥에 닿는 깊이 계산 */
  const wins = (o.southWindows || []).filter(w => (w.out ?? 1) === 1 && w.horiz !== false);
  const LW = wins.sort((a, b) => (b.to - b.from) - (a.to - a.from))[0] || null, HEAD = LW ? LW.y1 : 2.2;

  /* 하늘의 해·달·별(하늘 원통의 자식 → 전체 보기에서 함께 숨음) */
  const R = window.__homeSky ? 95 : 62, eyeC = window.__homeEye ? window.__homeEye.clone() : new THREE.Vector3(C.x, 1.5, C.z);
  const cnv = (n, f) => { const c = document.createElement('canvas'); c.width = c.height = n; f(c.getContext('2d'), n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const sunTex = cnv(128, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.11, 'rgba(255,252,240,1)'); g.addColorStop(.16, 'rgba(255,238,200,.6)'); g.addColorStop(.42, 'rgba(255,214,150,.14)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
  const spr = (tex, s) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false })); m.scale.setScalar(s); m.renderOrder = -5; m.visible = false; m.raycast = () => {}; sky.add(m); return m; }; /* 11-23: 해·달 스프라이트는 클릭·배치용 레이캐스트에서 뺌 — 카메라 없는 레이캐스터가 장면을 훑을 때 'Raycaster.camera' 콘솔 오류(sun.js가 늦게 불러와지면 나타남) */
  const sunS = spr(sunTex, R * .16);
  const moonCnv = document.createElement('canvas'); moonCnv.width = moonCnv.height = 128; const moonTex = new THREE.CanvasTexture(moonCnv); moonTex.colorSpace = THREE.SRGBColorSpace;
  const moonS = spr(moonTex, R * .075); let moonDrawn = -1;
  const drawMoon = p => { const x = moonCnv.getContext('2d'), c = 64, r = 38; x.clearRect(0, 0, 128, 128);
    const g = x.createRadialGradient(c, c, r * .9, c, c, 64); g.addColorStop(0, 'rgba(220,226,255,.22)'); g.addColorStop(1, 'rgba(220,226,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(70,78,108,.55)'; x.beginPath(); x.arc(c, c, r, 0, 7); x.fill();
    x.save(); if (p > .5) { x.translate(128, 0); x.scale(-1, 1); } const k = Math.cos(p * 2 * Math.PI);
    x.fillStyle = '#f3f0e4'; x.beginPath(); x.arc(c, c, r, -Math.PI / 2, Math.PI / 2, false);
    if (k >= 0) x.ellipse(c, c, r * k + .001, r, 0, Math.PI / 2, -Math.PI / 2, true); else x.ellipse(c, c, -r * k, r, 0, Math.PI / 2, Math.PI * 1.5, false);
    x.fill(); x.restore(); moonTex.needsUpdate = true; };
  const starGeo = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 420; i++) { const a = Math.random() * 2 * Math.PI, e = Math.asin(Math.pow(Math.random(), .8)); sp.push(Math.cos(e) * Math.sin(a) * R * .99, Math.sin(e) * R * .99, Math.cos(e) * Math.cos(a) * R * .99); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })); stars.renderOrder = -6; stars.visible = false; sky.add(stars);

  /* 방위(북=0) → 세대 안 방향(+z = 거실 창 바깥, +x = 바깥을 볼 때 왼쪽) */
  const dirOf = (alt, brg, out) => { const a = alt * RAD, d = (brg - B) * RAD; return out.set(-Math.cos(a) * Math.sin(d), Math.sin(a), Math.cos(a) * Math.cos(d)); };
  const blockedAt = (alt, brg) => hz ? hz[Math.round(brg) % 360] : -90;

  /* ───── 패널 ───── */
  const css = document.createElement('style'); css.textContent = `
.sun-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#sunBtn{border:1px solid var(--line);background:var(--panel-solid,#fff);color:var(--ink);font:600 13px var(--body);padding:5px 12px;border-radius:10px;cursor:pointer;white-space:nowrap}
#sunBtn[aria-pressed="true"]{background:#f2a33a;border-color:#f2a33a;color:#2a1a05}
#sunBtn:focus-visible,#sunPanel button:focus-visible,#sunPanel select:focus-visible,#spT:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sun-on #timeSeg{opacity:.45;pointer-events:none}
#sunPanel{left:50%;transform:translateX(-50%);bottom:calc(56px + env(safe-area-inset-bottom,0px));width:min(470px,calc(100vw - 32px));padding:12px 14px 10px;display:flex;flex-direction:column;gap:8px;z-index:6;color:var(--ink)}
#sunPanel[hidden]{display:none}
.sp-top{display:flex;align-items:center;gap:12px}
.sp-clock{width:58px;height:58px;flex:none}
.sp-clock .face{fill:#fffdf6;stroke:#d9c9a3;stroke-width:2;transition:fill .4s}
.sp-clock.night .face{fill:#26304d;stroke:#47557e}
.sp-clock .tk{stroke:#8b7d62;stroke-width:1.6;stroke-linecap:round}
.sp-clock.night .tk{stroke:#9aa6c8}
.sp-clock .hh{stroke:#1f2a33;stroke-width:3.2;stroke-linecap:round}
.sp-clock .mh{stroke:#1f2a33;stroke-width:2;stroke-linecap:round}
.sp-clock.night .hh,.sp-clock.night .mh{stroke:#eef1fb}
.sp-clock .ic{font:13px sans-serif;text-anchor:middle;fill:#e2902a}
.sp-clock.night .ic{fill:#e8e4c8}
.sp-when{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.sp-when b{font:600 16px var(--display,var(--body));letter-spacing:-.01em}
.sp-when span{font:600 20px var(--display,var(--body));font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.sp-when small{font-size:12px;color:var(--muted)}
.sp-play{flex:none;width:46px;height:46px;border-radius:50%;border:0;background:var(--accent);color:var(--accent-ink,#fff);font:600 16px var(--body);cursor:pointer;display:grid;place-items:center}
.sp-play svg{width:18px;height:18px;fill:currentColor}
.sp-x{position:absolute;top:6px;right:6px;width:26px;height:26px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-size:14px;cursor:pointer}
#spT{-webkit-appearance:none;appearance:none;width:100%;height:16px;border-radius:8px;margin:2px 0 0;cursor:pointer;border:1px solid var(--line)}
#spT::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid var(--accent);box-shadow:0 1px 4px rgba(0,0,0,.25)}
#spT::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid var(--accent)}
#spT::-moz-range-track{background:transparent}
.sp-ticks{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:-4px;padding:0 2px}
.sp-legend{display:flex;gap:10px;font-size:11px;color:var(--muted);flex-wrap:wrap}
.sp-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
.sp-date{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sp-date select{font:500 13px var(--body);color:var(--ink);background:var(--accent-soft);border:0;border-radius:8px;padding:6px 6px}
.sp-date .nav{width:30px;height:30px;border:0;border-radius:8px;background:var(--accent-soft);color:var(--ink);font:600 15px var(--body);cursor:pointer}
.sp-chips{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
.sp-chips button{border:1px solid var(--line);background:transparent;color:var(--ink);font:500 12px var(--body);padding:4px 8px;border-radius:999px;cursor:pointer}
.sp-chips button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink,#fff)}
.sp-info{font-size:12.5px;line-height:1.55;display:flex;flex-direction:column;gap:2px}
.sp-info b{font-weight:600}
.sp-info .hot{color:#b86a0c}
.sp-dir{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sp-dir select{font:500 12px var(--body);color:var(--ink);background:var(--accent-soft);border:0;border-radius:7px;padding:3px 4px}
.sp-msg{font-size:12px;color:var(--accent)}
@media (max-width:760px){
  #sunPanel{left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));transform:none;width:auto;top:calc(58px + env(safe-area-inset-top,0px));bottom:auto;padding:10px 12px 8px;gap:6px;max-height:calc(100% - 230px);overflow:auto}
  .sp-clock{width:48px;height:48px}.sp-when b{font-size:14px}.sp-when span{font-size:17px}.sp-play{width:42px;height:42px}
  .sp-chips{margin-left:0}.sp-info{font-size:12px}
}`;
  document.head.appendChild(css);
  const ts = document.getElementById('timeSeg'), row = document.createElement('div'); row.className = 'sun-row';
  ts.parentNode.insertBefore(row, ts); row.appendChild(ts);
  const btn = document.createElement('button'); btn.id = 'sunBtn'; btn.type = 'button'; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-controls', 'sunPanel'); btn.textContent = '☀ 일조 시뮬레이션'; btn.title = '날짜·시각별 햇빛이 집 안에 드는 모습'; row.appendChild(btn);
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = i * 30 * RAD, r0 = i % 3 ? 25 : 22.5; return `<line class="tk" x1="${32 + Math.sin(a) * r0}" y1="${32 - Math.cos(a) * r0}" x2="${32 + Math.sin(a) * 28}" y2="${32 - Math.cos(a) * 28}"/>`; }).join('');
  const P = document.createElement('div'); P.id = 'sunPanel'; P.className = 'panel'; P.hidden = true; P.setAttribute('role', 'region'); P.setAttribute('aria-label', '일조 시뮬레이션');
  P.innerHTML = `<button class="sp-x" id="spClose" type="button" aria-label="일조 시뮬레이션 닫기" title="닫기">✕</button>
  <div class="sp-top"><svg class="sp-clock" id="spClock" viewBox="0 0 64 64" aria-hidden="true"><circle class="face" cx="32" cy="32" r="30"/>${ticks}<text class="ic" id="spIc" x="32" y="47">☀</text><line class="hh" id="spHH" x1="32" y1="32" x2="32" y2="17"/><line class="mh" id="spMH" x1="32" y1="32" x2="32" y2="8"/><circle cx="32" cy="32" r="2.6" fill="#e2902a"/></svg>
  <div class="sp-when"><b id="spDate"></b><span id="spTime" aria-live="off"></span><small id="spRise"></small></div>
  <button class="sp-play" id="spPlay" type="button" aria-label="재생"><svg viewBox="0 0 24 24" aria-hidden="true"><path id="spPlayIc" d="M7 4l13 8-13 8z"/></svg></button></div>
  <input id="spT" type="range" min="0" max="1439" step="1" aria-label="시각">
  <div class="sp-ticks" aria-hidden="true"><span>0시</span><span>3</span><span>6</span><span>9</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span></div>
  <div class="sp-legend" aria-hidden="true"><span><i style="background:#2b3557"></i>밤</span><span><i style="background:#e9e2cf"></i>낮</span><span><i style="background:#f2a33a"></i>거실 창에 직사광</span></div>
  <div class="sp-date"><button class="nav" id="spPrev" type="button" aria-label="하루 전">‹</button><select id="spM" aria-label="월"></select><select id="spD" aria-label="일"></select><button class="nav" id="spNext" type="button" aria-label="하루 뒤">›</button>
  <div class="sp-chips" id="spChips"><button type="button" data-md="today">오늘</button><button type="button" data-md="3-20">춘분</button><button type="button" data-md="6-21">하지</button><button type="button" data-md="9-23">추분</button><button type="button" data-md="12-22">동지</button></div></div>
  <div class="sp-info" id="spInfo"></div>
  <div class="sp-dir" id="spDir"></div>
  <div class="sp-msg" id="spMsg" hidden></div>`;
  (document.getElementById('stage') || document.body).appendChild(P);
  const $ = id => P.querySelector('#' + id), mSel = $('spM'), dSel = $('spD'), tIn = $('spT');
  for (let m = 1; m <= 12; m++) mSel.add(new Option(m + '월', m));
  const fillDays = () => { const n = MDAYS[mSel.value - 1], keep = Math.min(+dSel.value || 1, n); dSel.innerHTML = ''; for (let d = 1; d <= n; d++) dSel.add(new Option(d + '일', d)); dSel.value = keep; };
  const dir = $('spDir');
  if (hasHomeBrg) dir.textContent = `거실 방향: 실제 ${dirName(B)}향(${Math.round(B)}°)` + (hz ? ' · 주변 건물·산 가림 반영(3D 조감도 기준)' : '');
  else { dir.innerHTML = '<span>거실 방향</span><select id="spB" aria-label="거실 방향"></select><span>— ‘우리 집 들어가기’로 들어오면 실제 방향·앞 동 가림 반영</span>';
    const bs = dir.querySelector('#spB'); for (const [n, b] of [['정남향', 180], ['남동향', 135], ['남서향', 225], ['남남동향', 157.5], ['남남서향', 202.5], ['동향', 90], ['서향', 270], ['북향', 0]]) bs.add(new Option(n, b)); bs.value = '180';
    bs.addEventListener('change', () => { B = +bs.value; dayStats(); dirty = true; }); }

  /* ───── 상태 ───── */
  const now = new Date(Date.now() + KST);
  let mo = now.getUTCMonth() + 1, dd = now.getUTCDate(), min = now.getUTCHours() * 60 + now.getUTCMinutes(), playing = false, active = false, dirty = true, prevTime = 'day', stats = null, lastEve = null;
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), tmpC = new THREE.Color(), tint = new THREE.Color(), cDay = new THREE.Color(0xfff1de), cLow = new THREE.Color(0xff9a52), hDay = new THREE.Color(0xe4edf6), hNight = new THREE.Color(0x6a72a0);
  const SAVE = { pos: sun.position.clone(), tgt: sun.target.position.clone(), cam: { l: sun.shadow.camera.left, r: sun.shadow.camera.right, t: sun.shadow.camera.top, b: sun.shadow.camera.bottom, n: sun.shadow.camera.near, f: sun.shadow.camera.far }, col: sun.color.clone() };

  function dayStats() { /* 해 뜨고 짐 + 거실 창 직사광 시간(2분 간격) + 시각 막대 색 */
    let rise = null, set = null, prev = sunAt(mo, dd, 0).alt, lit = 0, first = null, last = null; const seg = [];
    for (let m = 2; m <= 1440; m += 2) { const s = sunAt(mo, dd, m);
      if (prev < -.833 && s.alt >= -.833) rise = m - 2 + 2 * (-.833 - prev) / (s.alt - prev);
      if (prev >= -.833 && s.alt < -.833) set = m - 2 + 2 * (prev + .833) / (prev - s.alt); prev = s.alt;
      const front = Math.cos((s.brg - B) * RAD) > .02, direct = s.alt > .5 && front && s.alt > blockedAt(s.alt, s.brg) + .3;
      if (direct) { lit += 2; if (first === null) first = m; last = m; }
      seg.push(direct ? 3 : s.alt > 0 ? 2 : s.alt > -6 ? 1 : 0); }
    const col = ['#2b3557', '#8f8aa8', '#e9e2cf', '#f2a33a'], st = []; let k = seg[0], a = 0;
    for (let i = 1; i <= seg.length; i++) if (i === seg.length || seg[i] !== k) { st.push(`${col[k]} ${(a / seg.length * 100).toFixed(2)}%`, `${col[k]} ${(i / seg.length * 100).toFixed(2)}%`); k = seg[i]; a = i; }
    tIn.style.background = `linear-gradient(90deg,${st.join(',')})`;
    const noon = (() => { let best = -99, bm = 720; for (let m = 600; m <= 840; m += 2) { const s = sunAt(mo, dd, m).alt; if (s > best) { best = s; bm = m; } } return { alt: best, m: bm }; })();
    stats = { rise, set, lit, first, last, noon };
    $('spRise').textContent = rise !== null && set !== null ? `일출 ${hm(rise)} · 일몰 ${hm(set)} · 낮 ${dur(set - rise)}` : '';
    const lbl = SPECIAL[mo + '-' + dd], wd = WD[new Date(Date.UTC(YEAR, mo - 1, dd)).getUTCDay()];
    $('spDate').textContent = `${mo}월 ${dd}일(${wd})` + (lbl ? ' · ' + lbl : '');
    P.querySelectorAll('#spChips button').forEach(b => { const md = b.dataset.md === 'today' ? (now.getUTCMonth() + 1) + '-' + now.getUTCDate() : b.dataset.md; b.setAttribute('aria-pressed', String(md === mo + '-' + dd)); });
  }
  function setDate(m, d) { mo = m; dd = d; mSel.value = m; fillDays(); dSel.value = d; dayStats(); dirty = true; }
  function stepDay(k) { const t = new Date(Date.UTC(YEAR, mo - 1, dd) + k * DAYMS); if (t.getUTCFullYear() !== YEAR) return; setDate(t.getUTCMonth() + 1, t.getUTCDate()); }

  function update() { /* 시각 → 해·달·빛·하늘·글자 */
    const d = toDays(msOf(mo, dd, min)), s = altAz(sunC(d), d), mc = altAz(moonC(d), d), blockAlt = blockedAt(s.alt, s.brg);
    dirOf(s.alt, s.brg, sunDir); dirOf(mc.alt, mc.brg, moonDir);
    const k = sm(-6, 5, s.alt), up = sm(-.6, 5, s.alt), lowCol = sm(1, 28, s.alt), open = hz ? sm(blockAlt - .2, blockAlt + .8, s.alt) : 1;
    const tierNow = o.getTier(), mult = tierNow >= 3 ? 2.6 : tierNow === 2 ? 1.6 : 1, tame = tierNow >= 2 ? .72 : 1;
    /* 밤(해 고도 −4° 아래)에는 집 안 조명 켬 — 페이지의 저녁 모드 그대로(빛 값은 아래에서 다시 덮어씀) */
    const eve = s.alt < -4; if (eve !== lastEve) { lastEve = eve; o.simTime(eve); }
    /* 햇빛(그림자 켠 방향광): 세대 가운데를 향해 40m 밖에서 */
    sun.castShadow = true; sun.target.position.copy(C); sun.position.copy(C).addScaledVector(sunDir, 40);
    sun.intensity = s.alt > -1 ? (tierNow >= 2 ? 6.5 : 8) * up * (.6 + .4 * sm(4, 35, s.alt)) * open : 0; /* 평소(3.4)보다 세게 — 창으로 든 햇빛 자리가 또렷하게 */
    sun.color.copy(cLow).lerp(cDay, lowCol);
    hemi.intensity = (.06 + (.32 - .06) * k) * mult * tame * .7; hemi.color.copy(hNight).lerp(hDay, k);
    if (window.__amb) window.__amb.intensity = (tierNow >= 3 ? 1.1 + .4 * k : tierNow === 2 ? .4 * k : 0) * (tierNow >= 2 ? .6 : 1);
    for (const r of rectLights) { r.intensity = .25 + (1.1 - .25) * k; }
    /* 하늘 색: 낮 흰색 → 노을 → 밤 남색(그린 하늘·우리 집 사진 모두 곱해서) */
    if (s.alt >= 12) tint.setRGB(1, 1, 1); else if (s.alt >= 0) tint.setRGB(1, .8, .66).lerp(tmpC.setRGB(1, 1, 1), s.alt / 12);
    else if (s.alt >= -8) tint.setRGB(.15, .17, .32).lerp(tmpC.setRGB(.98, .66, .52), (s.alt + 8) / 8); else tint.setRGB(.13, .15, .28);
    sky.material.color.copy(tint); if (window.__homeSky) window.__homeSky.children.forEach(m => m.material.color.copy(tint));
    skyFloor.material.color.setHex(0x8a9a7c).multiply(tint); if (o.getMode() !== 'doll') scene.background.setHex(0xcfdbe6).multiply(tint);
    /* 해·달·별 그림 */
    const sp = sky.position;
    sunS.visible = s.alt > -1.5 && s.alt > blockAlt - .5; sunS.position.copy(eyeC).addScaledVector(sunDir, R).sub(sp); sunS.material.color.copy(cLow).lerp(tmpC.setRGB(1, 1, 1), lowCol);
    moonS.visible = mc.alt > -1; moonS.position.copy(eyeC).addScaledVector(moonDir, R * .97).sub(sp);
    if (moonS.visible) { const ph = moonPhase(d).phase; if (Math.abs(ph - moonDrawn) > .01) { drawMoon(ph); moonDrawn = ph; } moonS.material.opacity = .35 + .65 * (1 - k); }
    stars.visible = k < .9; stars.position.copy(eyeC).sub(sp); stars.material.opacity = (1 - k) * .9;
    renderer.shadowMap.needsUpdate = true;
    /* 시계·글자 */
    const h = min / 60; $('spHH').setAttribute('transform', `rotate(${(h % 12) * 30} 32 32)`); $('spMH').setAttribute('transform', `rotate(${(min % 60) * 6} 32 32)`);
    $('spClock').classList.toggle('night', s.alt < -2); $('spIc').textContent = s.alt < -2 ? '☾' : '☀';
    $('spTime').textContent = ampm(min); if (+tIn.value !== Math.round(min) % 1440) tIn.value = Math.round(min) % 1440;
    const L = [], rel = ((s.brg - B + 540) % 360) - 180;
    if (s.alt > 0) {
      L.push(`해 높이 <b>${s.alt.toFixed(1)}°</b> · ${dirName(s.brg)}쪽 ${Math.round(s.brg)}°`);
      if (hz && s.alt <= blockAlt + .3) L.push(`<span class="hot">지금은 주변 건물·산에 가려 햇빛이 직접 들지 않아요</span> (그쪽 가림 높이 ${Math.max(0, blockAlt).toFixed(0)}°)`);
      else if (Math.abs(rel) >= 89) L.push('해가 거실 반대편 — 거실 창으로 직사광 없음(옆·뒤 창으로만)');
      else { const depth = HEAD * Math.cos(rel * RAD) / Math.tan(s.alt * RAD);
        L.push(`거실 창으로 드는 빛: 바닥과 <b>${s.alt.toFixed(0)}°</b>, 창 정면에서 ${Math.abs(rel) < 3 ? '거의 정면' : (rel > 0 ? '오른쪽' : '왼쪽') + ' ' + Math.abs(rel).toFixed(0) + '°'}`);
        L.push(`<span class="hot">창(위 끝 ${HEAD.toFixed(2)}m)에서 바닥 약 <b>${depth > 30 ? '30m 이상' : depth.toFixed(1) + 'm'}</b> 안쪽까지 햇빛</span>`); }
    } else { const ph = moonPhase(d); L.push(s.alt > -6 ? '해가 막 진(뜨기 전) 어스름' : '밤'); if (mc.alt > 0) L.push(`달 높이 ${mc.alt.toFixed(0)}° · ${dirName(mc.brg)}쪽 · ${ph.frac > .97 ? '보름달' : ph.frac < .03 ? '그믐' : (ph.phase < .5 ? '차오르는 달' : '기우는 달')} ${Math.round(ph.frac * 100)}%`); }
    if (stats) L.push(stats.lit ? `이날 거실 창 직사광 <b>약 ${dur(stats.lit)}</b> (${hm(stats.first)}~${hm(stats.last)})` + (hz ? ' · 가림 반영' : '') : '이날은 거실 창으로 직사광이 들지 않아요' + (hz ? '(가림 반영)' : ''));
    $('spInfo').innerHTML = L.map(x => `<div>${x}</div>`).join('');
  }

  /* ───── 켜기·끄기 ───── */
  async function open() {
    if (active) return; active = true; window.__sunSim = true; prevTime = state.time; lastEve = null;
    document.body.classList.add('sun-on'); btn.setAttribute('aria-pressed', 'true'); P.hidden = false;
    if (innerWidth <= 760) { const hc = document.getElementById('headClose'); if (hc && !document.getElementById('head').classList.contains('closed')) hc.click(); }
    const SC = sun.shadow.camera; Object.assign(SC, { left: -SR, right: SR, top: SR, bottom: -SR, near: 1, far: 40 + SR + 10 }); SC.updateProjectionMatrix();
    const want = o.isTouch ? 1024 : (o.getTier() === 0 ? 4096 : 2048); if (sun.shadow.mapSize.x !== want) { sun.shadow.mapSize.set(want, want); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    const needCompile = !sun.castShadow; const msg = $('spMsg');
    if (needCompile) { msg.hidden = false; msg.textContent = '햇빛 그림자를 준비하는 중… (처음 한 번 잠시 멈출 수 있어요)'; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }
    setDate(mo, dd); update(); dirty = false;
    if (needCompile) setTimeout(() => { msg.hidden = true; }, 1200);
  }
  function close() {
    if (!active) return; active = false; playing = false; setPlayIcon(); window.__sunSim = false;
    document.body.classList.remove('sun-on'); btn.setAttribute('aria-pressed', 'false'); P.hidden = true;
    sunS.visible = moonS.visible = stars.visible = false; sky.material.color.set(0xffffff); if (window.__homeSky) window.__homeSky.children.forEach(m => m.material.color.set(0xffffff));
    sun.position.copy(SAVE.pos); sun.target.position.copy(SAVE.tgt); sun.color.copy(SAVE.col); const SC = sun.shadow.camera, c = SAVE.cam; Object.assign(SC, { left: c.l, right: c.r, top: c.t, bottom: c.b, near: c.n, far: c.f }); SC.updateProjectionMatrix();
    o.restore(prevTime); renderer.shadowMap.needsUpdate = true;
  }
  function setPlayIcon() { $('spPlayIc').setAttribute('d', playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l13 8-13 8z'); $('spPlay').setAttribute('aria-label', playing ? '일시정지' : '재생'); }
  function togglePlay() {
    playing = !playing;
    if (playing && stats && stats.rise !== null && (min >= stats.set + 30 || min < stats.rise - 40)) min = Math.max(0, stats.rise - 30); /* 밤에 누르면 해 뜨기 30분 전부터 */
    setPlayIcon(); dirty = true;
  }
  btn.addEventListener('click', () => active ? close() : open());
  $('spClose').addEventListener('click', close);
  $('spPlay').addEventListener('click', togglePlay);
  tIn.addEventListener('input', () => { min = +tIn.value; dirty = true; });
  mSel.addEventListener('change', () => { fillDays(); setDate(+mSel.value, +dSel.value); });
  dSel.addEventListener('change', () => setDate(+mSel.value, +dSel.value));
  $('spPrev').addEventListener('click', () => stepDay(-1)); $('spNext').addEventListener('click', () => stepDay(1));
  P.querySelectorAll('#spChips button').forEach(b => b.addEventListener('click', () => { if (b.dataset.md === 'today') setDate(now.getUTCMonth() + 1, now.getUTCDate()); else { const [m, d] = b.dataset.md.split('-').map(Number); setDate(m, d); } }));
  P.addEventListener('keydown', e => { if (e.key === ' ' && e.target === P) { e.preventDefault(); togglePlay(); } e.stopPropagation(); }); /* 패널 안 키 입력은 걷기 조작으로 새지 않게 */
  mSel.value = mo; fillDays(); dSel.value = dd;

  let tPrev = 0;
  window.__sunTick = () => {
    const t = performance.now(), dt = tPrev ? Math.min(.1, (t - tPrev) / 1000) : 0; tPrev = t;
    if (!active) return;
    if (playing) { min += dt * 30; if (min >= 1440) min -= 1440; dirty = true; } /* 2초에 1시간 */
    if (dirty) { dirty = false; update(); }
  };
  const api = { open, close, togglePlay, setDate, setTime: m => { min = m; dirty = true; }, get state() { return { active, playing, mo, dd, min, B, hz: !!hz, SR, C: C.toArray(), stats }; }, sunAt };
  window.__sun = api; return api;
}
