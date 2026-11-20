/* 줄자 — 55A·55B·55C·56T 공용(1인칭·전체 보기 모두)
   두 점: 아무 두 곳 사이 / 벽↔벽: 벽 한 곳을 누르면 맞은편 면까지 수평으로 / 높이: 바닥↔천장, 창턱·가구 윗면 높이
   점은 누른 곳(PC는 마우스를 올리면 미리 보기)에서 모서리·모서리선에 자석처럼 붙음. 치수는 벽을 뚫고도 보이게 그림.
   '우리 집 들어가기'로 들어온 집은 잰 치수도 동·호별로 이 브라우저에 저장. */
export function initMeasure(o) {
  if (window.__measure) return window.__measure;
  const { THREE: T, scene, renderer, camera, canvas, sky, skyFloor, rooms, WX, WZ } = o;
  const OX = -WX(0), OZ = -WZ(0), H = o.H || 2.35, KEY = o.home ? 'mh:measure:' + o.home : null;
  const COL = { pt: '#534AB7', wall: '#BA7517', height: '#0F6E56' }, BG = { pt: '#EEEDFE', wall: '#FAEEDA', height: '#E1F5EE' }, FG = { pt: '#3C3489', wall: '#633806', height: '#085041' };
  const NAME = { pt: '두 점', wall: '벽↔벽', height: '높이' };
  let on = false, mode = 'pt', A = null, list = [], hover = null, lastHoverXY = null;
  let unit = 'mm'; try { unit = localStorage.getItem('mh:measure:unit') || 'mm'; } catch (e) {}
  const grp = new T.Group(); grp.name = 'measure'; scene.add(grp);
  const prev = new T.Group(); prev.name = 'measurePreview'; scene.add(prev);
  const fmt = d => unit === 'mm' ? Math.round(d * 1000).toLocaleString('ko-KR') + ' mm' : (d * 100).toFixed(1) + ' cm';

  /* ───── 고를 수 있는 물체(보이는 것만, 하늘·풍경·투명 그림자판 제외) ───── */
  let cands = [], candsAt = 0;
  const visDeep = m => { for (let p = m; p; p = p.parent) if (!p.visible) return false; return true; };
  function candidates(force) {
    if (!force && performance.now() - candsAt < 500) return cands; candsAt = performance.now(); cands = [];
    scene.traverse(m => { if (!m.isMesh || m === skyFloor) return; for (let p = m; p; p = p.parent) if (p === sky || p === grp || p === prev) return;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material; if (!mat || mat.colorWrite === false || mat.visible === false || (mat.transparent && mat.opacity < .05)) return; if (!visDeep(m)) return; cands.push(m); });
    return cands;
  }
  const ray = new T.Raycaster(), ndc = new T.Vector2(), tmpM = new T.Matrix4();
  const nameOf = obj => { for (let p = obj; p; p = p.parent) if (p.userData && p.userData.name && p.userData.name.length < 20) return p.userData.name; return ''; };
  function hitAt(cx, cy) { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); ray.far = 200; const h = ray.intersectObjects(candidates(), false); return h[0] || null; }
  function snap(hit) {
    const p = hit.point.clone(), obj = hit.object; let kind = '';
    const n = hit.face ? hit.face.normal.clone().transformDirection(obj.matrixWorld) : new T.Vector3(0, 1, 0);
    if (hit.face) {
      const pos = obj.geometry.attributes.position, vs = [hit.face.a, hit.face.b, hit.face.c].map(i => new T.Vector3().fromBufferAttribute(pos, i));
      if (obj.isInstancedMesh && hit.instanceId != null) { obj.getMatrixAt(hit.instanceId, tmpM); vs.forEach(v => v.applyMatrix4(tmpM)); }
      vs.forEach(v => v.applyMatrix4(obj.matrixWorld));
      const dist = camera.position.distanceTo(p), px = 2 * dist * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, canvas.clientHeight), tol = Math.min(.1, Math.max(.012, px * 12));
      let best = null; for (const v of vs) { const d = v.distanceTo(p); if (d < tol && (!best || d < best.d)) best = { d, v }; }
      if (best) { p.copy(best.v); kind = '모서리'; }
      else for (let i = 0; i < 3; i++) { const a = vs[i], b = vs[(i + 1) % 3], ab = b.clone().sub(a), L = ab.length(); if (L < 1e-4) continue; const dir = ab.divideScalar(L);
        if (Math.max(Math.abs(dir.x), Math.abs(dir.y), Math.abs(dir.z)) < .985) continue; /* 사각면의 대각선은 빼고 진짜 모서리선만 */
        const t = Math.max(0, Math.min(L, p.clone().sub(a).dot(dir))), q = a.clone().addScaledVector(dir, t), d = q.distanceTo(p); if (d < tol * .7 && (!best || d < best.d)) best = { d, v: q }; }
      if (!kind && best) { p.copy(best.v); kind = '모서리선'; }
    }
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material, glass = mat && mat.transparent && mat.opacity < .7, nm = nameOf(obj);
    const surf = glass ? '유리' : Math.abs(n.y) > .9 ? (n.y > 0 ? (p.y < .03 ? '바닥' : (nm || '윗면')) : (p.y > H - .2 ? '천장' : (nm || '아랫면'))) : (nm || '벽 면');
    return { p, n, kind, surf, obj };
  }
  /* 모드별로 두 끝 계산 */
  function castFrom(p, dir, skipFurn) { ray.set(p, dir); ray.far = 40; const hs = ray.intersectObjects(candidates(), false); for (const h of hs) { if (skipFurn && o.furn) { let inF = false; for (let q = h.object; q; q = q.parent) if (q === o.furn) { inF = true; break; } if (inF) continue; } if (h.distance > .003) return h; } return null; }
  function endsFor(s) {
    if (mode === 'wall') { const d = new T.Vector3(s.n.x, 0, s.n.z); if (d.length() < .5) return { err: '벽(세로 면)을 눌러 주세요' }; d.normalize();
      const h = castFrom(s.p.clone().addScaledVector(d, .002), d, true); if (!h) return { err: '맞은편 면을 찾지 못했어요' }; const b = h.point.clone(); b.y = s.p.y; return { a: s.p.clone(), b }; }
    if (mode === 'height') { const a = s.p.clone();
      if (s.n.y > .5 && a.y < .03) { const h = castFrom(a.clone().add(new T.Vector3(0, .002, 0)), new T.Vector3(0, 1, 0), false); const b = h ? h.point.clone() : new T.Vector3(a.x, H, a.z); b.x = a.x; b.z = a.z; return { a: new T.Vector3(a.x, 0, a.z), b, ceilGuess: !h }; }
      return { a: new T.Vector3(a.x, 0, a.z), b: a }; }
    return null;
  }

  /* ───── 3D 치수선(벽을 뚫고도 보이게) + 글자(화면 위 겹침) ───── */
  const UP = new T.Vector3(0, 1, 0), cylG = new T.CylinderGeometry(1, 1, 1, 8), dotG = new T.SphereGeometry(1, 14, 10), mats = {};
  const matOf = (c, op = 1) => { const k = c + op; return mats[k] || (mats[k] = new T.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true, opacity: op, toneMapped: false })); };
  function segment(parent, a, b, c, op = 1) { const g = new T.Group(), d = b.clone().sub(a), L = d.length(), r = .006;
    if (L > 1e-4) { const cyl = new T.Mesh(cylG, matOf(c, op)); cyl.scale.set(r, L, r); cyl.position.copy(a).addScaledVector(d, .5); cyl.quaternion.setFromUnitVectors(UP, d.clone().normalize()); cyl.renderOrder = 998; g.add(cyl); }
    for (const p of [a, b]) { const s = new T.Mesh(dotG, matOf(c, op)); s.scale.setScalar(.018); s.position.copy(p); s.renderOrder = 999; g.add(s); }
    parent.add(g); return g; }
  const layer = document.createElement('div'); layer.id = 'measureLayer'; layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4';
  (document.getElementById('stage') || document.body).appendChild(layer);
  const pill = (m, txt) => { const e = document.createElement('div'); e.className = 'mlabel'; e.style.cssText = `position:absolute;left:0;top:0;transform:translate(-50%,-50%);padding:4px 10px;border-radius:999px;font:600 13px var(--body,sans-serif);white-space:nowrap;background:${BG[m]};color:${FG[m]};border:1px solid ${COL[m]};box-shadow:0 2px 8px rgba(0,0,0,.12)`; e.textContent = txt; layer.appendChild(e); return e; };
  const hoverDot = document.createElement('div'); hoverDot.style.cssText = 'position:absolute;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid #2C2C2A;border-radius:50%;display:none;background:rgba(255,255,255,.35)'; layer.appendChild(hoverDot);
  const hoverTag = document.createElement('div'); hoverTag.style.cssText = 'position:absolute;left:0;top:0;transform:translate(14px,12px);padding:3px 9px;border-radius:999px;background:#2C2C2A;color:#F1EFE8;font:500 12px var(--body,sans-serif);white-space:nowrap;display:none'; layer.appendChild(hoverTag);
  let prevLabel = null;

  function addMeasure(m, a, b, extra) {
    const it = { m, a: a.clone(), b: b.clone(), d: a.distanceTo(b), ceilGuess: !!(extra && extra.ceilGuess) };
    const mid = a.clone().add(b).multiplyScalar(.5), R = rooms.find(r => mid.x + OX >= r.x0 && mid.x + OX <= r.x1 && mid.z + OZ >= r.z0 && mid.z + OZ <= r.z1); it.room = R ? R.n : '';
    it.obj = segment(grp, it.a, it.b, COL[m]); it.el = pill(m, ''); list.push(it); relabel(it); save(); renderList(); return it; }
  function relabel(it) { it.el.textContent = (it.m === 'wall' ? '폭 ' : it.m === 'height' ? '높이 ' : '') + fmt(it.d) + (it.ceilGuess ? '(천장 가정)' : ''); }
  function delMeasure(it) { grp.remove(it.obj); it.el.remove(); list.splice(list.indexOf(it), 1); save(); renderList(); }
  function clearAll() { for (const it of list.slice()) { grp.remove(it.obj); it.el.remove(); } list = []; A = null; clearPrev(); save(); renderList(); setHint(); }
  function clearPrev() { prev.clear(); if (prevLabel) { prevLabel.remove(); prevLabel = null; } }
  function save() { if (!KEY) return; try { if (!list.length) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(list.map(i => ({ m: i.m, a: i.a.toArray().map(v => +v.toFixed(4)), b: i.b.toArray().map(v => +v.toFixed(4)), c: i.ceilGuess ? 1 : 0 })))); } catch (e) {} }

  /* ───── 도구 막대·목록 ───── */
  const css = document.createElement('style'); css.textContent = `
#mzBtn{position:absolute;left:50%;transform:translateX(-50%);top:calc(12px + env(safe-area-inset-top,0px));z-index:6;border:1px solid var(--line);background:var(--panel);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:12px;padding:8px 14px;font:600 13px var(--body);color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 8px 30px rgba(20,28,36,.12)}
#mzBtn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#mzBtn[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink,#fff);border-color:var(--accent)}
#mzPanel{left:50%;transform:translateX(-50%);top:calc(60px + env(safe-area-inset-top,0px));z-index:6;padding:8px;display:flex;flex-direction:column;gap:6px;max-width:min(620px,calc(100vw - 24px))}
#mzPanel[hidden]{display:none}
.mz-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.mz-row button{border:1px solid var(--line);background:var(--panel-solid,#fff);color:var(--ink);font:500 12.5px var(--body);padding:6px 10px;border-radius:9px;cursor:pointer;white-space:nowrap}
.mz-row button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.mz-row .sep{width:1px;height:20px;background:var(--line);margin:0 2px}
.mz-row button.dz{color:#b42318}
#mzHint{font-size:12px;color:var(--muted);padding:0 4px}
#mzList{display:flex;gap:6px;flex-wrap:wrap;max-height:84px;overflow:auto}
.mz-chip{display:flex;align-items:center;gap:4px;font:500 12px var(--body);padding:3px 4px 3px 9px;border-radius:999px;border:1px solid}
.mz-chip button{border:0;background:transparent;font-size:12px;cursor:pointer;color:inherit;width:20px;height:20px;border-radius:50%}
.measure-on #gl{cursor:crosshair}
#mzBtn:focus-visible,.mz-row button:focus-visible,.mz-chip button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:760px){#mzBtn{left:auto;right:max(16px,env(safe-area-inset-right,0px));transform:none;top:calc(58px + env(safe-area-inset-top,0px));padding:7px 11px}#mzPanel{top:calc(104px + env(safe-area-inset-top,0px));left:12px;right:12px;transform:none;max-width:none}}`;
  document.head.appendChild(css);
  const stage = document.getElementById('stage') || document.body;
  const btn = document.createElement('button'); btn.id = 'mzBtn'; btn.type = 'button'; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-controls', 'mzPanel');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l14-14 4 4-14 14z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>줄자'; stage.appendChild(btn);
  const P = document.createElement('div'); P.id = 'mzPanel'; P.className = 'panel'; P.hidden = true; P.setAttribute('role', 'region'); P.setAttribute('aria-label', '줄자');
  P.innerHTML = `<div class="mz-row"><button type="button" data-mode="pt">두 점</button><button type="button" data-mode="wall">벽↔벽</button><button type="button" data-mode="height">높이</button><span class="sep"></span>
  <button type="button" id="mzUnit" title="단위 바꾸기">mm</button><button type="button" id="mzShot">사진 저장</button><button type="button" id="mzClear" class="dz">모두 지우기</button><button type="button" id="mzClose">닫기</button></div>
  <div id="mzHint"></div><div id="mzList"></div>`;
  stage.appendChild(P);
  const $ = id => P.querySelector('#' + id), hintEl = $('mzHint'), listEl = $('mzList');
  function setHint(msg) {
    if (msg) { hintEl.textContent = msg; hintEl.style.color = '#b42318'; clearTimeout(setHint.t); setHint.t = setTimeout(() => setHint(), 2200); return; } hintEl.style.color = '';
    const touch = matchMedia('(pointer: coarse)').matches, act = touch ? '누르세요' : '클릭하세요';
    hintEl.textContent = mode === 'pt' ? (A ? `둘째 점을 ${act} · Esc 취소` : `첫 점을 ${act} — 모서리·모서리선에 자석처럼 붙어요`) : mode === 'wall' ? `벽 한 곳을 ${act} — 맞은편 면까지 수평으로 재요(가구는 무시)` : `바닥을 ${act}면 천장까지, 창턱·가구 윗면을 ${act}면 바닥에서 그 높이까지`;
  }
  function renderList() {
    listEl.innerHTML = ''; list.forEach((it, i) => { const c = document.createElement('div'); c.className = 'mz-chip'; c.style.background = BG[it.m]; c.style.color = FG[it.m]; c.style.borderColor = COL[it.m];
      c.innerHTML = `<span>${it.room ? it.room + ' · ' : ''}${NAME[it.m]} ${fmt(it.d)}</span><button type="button" aria-label="이 치수 지우기" title="지우기">✕</button>`;
      c.querySelector('button').addEventListener('click', () => delMeasure(it)); c.addEventListener('mouseenter', () => { it.el.style.outline = '3px solid ' + COL[it.m]; }); c.addEventListener('mouseleave', () => { it.el.style.outline = ''; }); listEl.appendChild(c); });
  }
  function setMode(m) { mode = m; A = null; clearPrev(); P.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m))); setHint(); }
  function open() { on = true; window.__measureOn = true; btn.setAttribute('aria-pressed', 'true'); P.hidden = false; document.body.classList.add('measure-on'); setMode(mode); candidates(true);
    if (innerWidth <= 760) { const hc = document.getElementById('headClose'), hd = document.getElementById('head'); if (hc && hd && !hd.classList.contains('closed')) hc.click(); } }
  function close() { on = false; window.__measureOn = false; btn.setAttribute('aria-pressed', 'false'); P.hidden = true; document.body.classList.remove('measure-on'); A = null; clearPrev(); hoverDot.style.display = hoverTag.style.display = 'none'; hover = null; }
  btn.addEventListener('click', () => on ? close() : open());
  $('mzClose').addEventListener('click', close);
  P.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('mzUnit').textContent = unit; $('mzUnit').addEventListener('click', () => { unit = unit === 'mm' ? 'cm' : 'mm'; $('mzUnit').textContent = unit; try { localStorage.setItem('mh:measure:unit', unit); } catch (e) {} list.forEach(relabel); renderList(); });
  $('mzClear').addEventListener('click', () => { if (list.length && confirm('잰 치수를 모두 지울까요?')) clearAll(); });
  $('mzShot').addEventListener('click', shot);
  P.addEventListener('keydown', e => e.stopPropagation());
  addEventListener('keydown', e => { if (!on || e.key !== 'Escape') return; if (A) { A = null; clearPrev(); setHint(); } else close(); });

  /* ───── 누르기(짧게 탭/클릭 = 점, 끌기 = 시점 돌리기) ───── */
  let down = null;
  canvas.addEventListener('pointerdown', e => { if (on) down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
  canvas.addEventListener('pointerup', e => {
    if (!on || !down || e.pointerId !== down.id) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 600; down = null;
    if (moved > 7 || !quick) return; const h = hitAt(e.clientX, e.clientY); if (!h) { setHint('여기는 잴 면이 없어요'); return; } const s = snap(h);
    if (mode === 'pt') { if (!A) { A = s; clearPrev(); segment(prev, s.p, s.p, COL.pt, .9); setHint(); } else { if (A.p.distanceTo(s.p) > .005) addMeasure('pt', A.p, s.p); A = null; clearPrev(); setHint(); } return; }
    const r = endsFor(s); if (!r) return; if (r.err) { setHint(r.err); return; } clearPrev(); addMeasure(mode, r.a, r.b, r); setHint();
  });
  canvas.addEventListener('pointermove', e => { if (!on || e.pointerType === 'touch' || e.buttons) return; lastHoverXY = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerleave', () => { lastHoverXY = null; hover = null; hoverDot.style.display = hoverTag.style.display = 'none'; if (!A) clearPrev(); });

  /* ───── 매 프레임: 마우스 미리 보기 + 글자 위치 ───── */
  const v3 = new T.Vector3(), rect = () => canvas.getBoundingClientRect();
  function toScreen(p) { v3.copy(p).project(camera); if (v3.z > 1 || v3.z < -1) return null; const r = rect(), lr = layer.getBoundingClientRect(); return [(v3.x + 1) / 2 * r.width + r.left - lr.left, (1 - v3.y) / 2 * r.height + r.top - lr.top]; }
  let hoverTick = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (on && lastHoverXY && ++hoverTick % 2 === 0) { const h = hitAt(lastHoverXY[0], lastHoverXY[1]); hover = h ? snap(h) : null;
      clearPrev(); if (A) segment(prev, A.p, A.p, COL.pt, .9);
      if (hover) { let a = null, b = null, err = null;
        if (mode === 'pt') { if (A) { a = A.p; b = hover.p; } } else { const r = endsFor(hover); if (r && !r.err) { a = r.a; b = r.b; } else if (r) err = r.err; }
        if (a && b && a.distanceTo(b) > .005) { segment(prev, a, b, COL[mode], .65); prevLabel = pill(mode, fmt(a.distanceTo(b))); prevLabel.style.opacity = '.85'; prevLabel._p = a.clone().add(b).multiplyScalar(.5); }
        hoverTag.textContent = (hover.kind ? hover.kind + ' · ' : '') + hover.surf + (err ? ' — ' + err : ''); } }
    if (on && hover) { const s = toScreen(hover.p); if (s) { hoverDot.style.display = hoverTag.style.display = 'block'; hoverDot.style.left = s[0] + 'px'; hoverDot.style.top = s[1] + 'px'; hoverDot.style.borderColor = hover.kind ? COL[mode] : '#2C2C2A'; hoverTag.style.left = s[0] + 'px'; hoverTag.style.top = s[1] + 'px'; } else hoverDot.style.display = hoverTag.style.display = 'none'; }
    else { hoverDot.style.display = hoverTag.style.display = 'none'; }
    for (const it of list) { const s = toScreen(v3.copy(it.a).add(it.b).multiplyScalar(.5)); if (s) { it.el.style.display = ''; it.el.style.left = s[0] + 'px'; it.el.style.top = s[1] + 'px'; } else it.el.style.display = 'none'; }
    if (prevLabel && prevLabel._p) { const s = toScreen(prevLabel._p); if (s) { prevLabel.style.left = s[0] + 'px'; prevLabel.style.top = s[1] + 'px'; } }
  }
  requestAnimationFrame(frame);

  /* ───── 사진 저장: 지금 화면 + 치수 글자 ───── */
  function shot() {
    const pv = prev.visible; prev.visible = false; renderer.render(scene, camera); const src = renderer.domElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0); prev.visible = pv;
    const k = src.width / canvas.clientWidth, r = rect(), lr = layer.getBoundingClientRect();
    for (const it of list) { if (it.el.style.display === 'none') continue; const cx = (parseFloat(it.el.style.left) + lr.left - r.left) * k, cy = (parseFloat(it.el.style.top) + lr.top - r.top) * k, t = it.el.textContent;
      x.font = `600 ${Math.round(13 * k)}px sans-serif`; const w = x.measureText(t).width + 20 * k, h = 26 * k; x.fillStyle = BG[it.m]; x.strokeStyle = COL[it.m]; x.lineWidth = k;
      x.beginPath(); if (x.roundRect) x.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); else x.rect(cx - w / 2, cy - h / 2, w, h); x.fill(); x.stroke(); x.fillStyle = FG[it.m]; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, cx, cy); }
    const d = new Date(), z = n => String(n).padStart(2, '0'), a = document.createElement('a'); a.download = `줄자_${o.type || ''}_${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}.png`; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }

  /* 저장된 치수(우리 집) 되살리기 */
  if (KEY) try { const s = JSON.parse(localStorage.getItem(KEY) || '[]'); for (const it of s) if (COL[it.m]) addMeasure(it.m, new T.Vector3(...it.a), new T.Vector3(...it.b), { ceilGuess: !!it.c }); } catch (e) {}
  renderList(); setHint();
  const api = { open, close, setMode, clearAll, get list() { return list; }, addAt: (cx, cy) => { const h = hitAt(cx, cy); return h ? snap(h) : null; }, endsFor: s => endsFor(s) };
  window.__measure = api; return api;
}
