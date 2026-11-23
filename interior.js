/* 인테리어 메뉴(전체 보기) — 55A·55B·55C·56T 공용
   왼쪽 '인테리어' 목록에서 실제 제품 치수대로 만든 가구를 추가하고, 놓인 가구(기존 포함)를 선택해 끌어서 옮기기·회전·삭제.
   놓을 자리: 방 위에서 내려다본 높이 지도(한 번 그려 읽음)로 벽에 등을 대거나(수납장·침대 등) 빈 바닥(식탁)·조리대 위(전자레인지·식기세척기)를 찾음.
   배치는 타입별로 이 기기(브라우저)에 저장. */
export function initInterior(o) {
  if (window.__interior) return window.__interior;
  const { THREE: T, RoundedBoxGeometry: RBG, scene, renderer, canvas, furn, fixed, movables, rooms, WX, WZ } = o;
  /* 저장: '우리 집 들어가기'(동·호)로 들어온 집만 — 옵션 선택 + 가구 배치를 그 동·호 이름으로 이 브라우저에 저장(타입 둘러보기는 저장 안 함) */
  const KEY = o.home ? 'mh:home:' + o.home : null; let restoring = false;
  try { localStorage.removeItem('mh:interior:' + o.type); } catch (e) {} /* 예전(타입별) 저장은 정리 */

  /* ───── 재질·무늬 ───── */
  const cv = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const wood = (base, line) => cv(256, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++) { const y = rnd() * h, a = .05 + rnd() * .12; x.strokeStyle = line; x.globalAlpha = a; x.lineWidth = .6 + rnd() * 1.6; x.beginPath(); x.moveTo(0, y); for (let s = 0; s <= 8; s++) x.lineTo(s * w / 8, y + Math.sin(s * .9 + i) * (1 + rnd() * 3)); x.stroke(); } x.globalAlpha = 1; });
  const std = (c, r = .55, m = 0, e = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, e));
  const tamb = cv(64, 8, (x, w, h) => { x.fillStyle = '#f5f4f0'; x.fillRect(0, 0, w, h); for (let p = 0; p < 4; p++) { const o0 = p * 16; x.fillStyle = '#dcd8d0'; x.fillRect(o0 + 13, 0, 2, h); x.fillStyle = '#e9e6df'; x.fillRect(o0 + 11, 0, 2, h); x.fillStyle = '#ffffff'; x.fillRect(o0 + 1, 0, 2, h); } }); tamb.repeat.set(10, 1);
  const chan = cv(64, 8, (x, w, h) => { x.fillStyle = '#d3ccc0'; x.fillRect(0, 0, w, h); x.fillStyle = '#b9b0a2'; x.fillRect(30, 0, 3, h); x.fillStyle = '#ddd7cc'; x.fillRect(4, 0, 18, h); }); chan.repeat.set(8, 1); /* 헤드보드 세로 채널 8줄 */
  const M = {
    white: std(0xf4f3ef, .45), applW: std(0xf2f2ef, .3), cotton: std(0xefebe2, .5), seam: std(0x8c7a64, .7),
    natural: std(0xffffff, .55, 0, { map: wood('#d2ad7e', '#9c7448') }), oak: std(0xffffff, .5, 0, { map: wood('#b98b5b', '#7d5530') }), oakL: std(0xffffff, .5, 0, { map: wood('#dcc097', '#b08a5c') }),
    glassDark: std(0x1c2024, .12, .2), mirror: std(0xc9d3d8, .06, .55, { emissive: 0x6d7a82, emissiveIntensity: .25 }), /* 11-22: 금속 100%는 반사 환경이 없는 화질에서 새까맣게 보여 → 밝은 회청색 반금속 */ leather: std(0x6d4f3d, .5), leatherD: std(0x3d302a, .6), leatherL: std(0x8a6a55, .5),
    fabric: std(0xcec7bb, .92), chanFab: std(0xffffff, .9, 0, { map: chan }), linen: std(0xf5f4f0, .85), duvet: std(0xe4e1db, .92), pillow: std(0xf7f6f3, .9),
    black: std(0x232427, .5), grey: std(0x8e9194, .45), greyD: std(0x55585c, .5), cream: std(0xe9e3d7, .22), display: std(0x0f1113, .2, 0, { emissive: 0x2a6f9a, emissiveIntensity: .35 }),
    chrome: std(0xc9cccf, .25, .9), tamb: std(0xffffff, .5, 0, { map: tamb }), robot: std(0x2b2d31, .35), robotTop: std(0x4a4d52, .25),
  };
  const MUSE = [ /* 이름, 몸통, 문·서랍 앞, 선반·상판 */
    ['화이트', M.white, M.white, M.white], ['화이트오크', M.white, M.white, M.oakL], ['오크', M.oakL, M.oakL, M.oakL],
    ['오크화이트', M.oakL, M.white, M.oakL], ['그레이', std(0x8f9295, .5), std(0x8f9295, .5), std(0x8f9295, .5)], ['그레이화이트', std(0x8f9295, .5), M.white, M.white]];
  { /* 삼익 빅룸 벙커침대 재질: 문·서랍 앞 = 흰 돌 무늬(옅은 얼룩, 자체 시드라 다른 무늬 순서에 영향 없음) · 몸통·계단 = 따뜻한 그레이지 · 은색 막대 손잡이 · 니트 담요 */
    let s2 = 11; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    const stone = cv(256, 256, (x, w, h) => { x.fillStyle = '#eeede9'; x.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { const px = r2() * w, py = r2() * h, r = 1.5 + r2() * 7; x.fillStyle = r2() < .55 ? 'rgba(140,138,132,.028)' : 'rgba(255,255,255,.07)'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } });
    Object.assign(M, { skFront: std(0xffffff, .5, 0, { map: stone }), skBody: std(0xd9d2c6, .6), skStair: std(0xd3cbbe, .6), skStairF: std(0xe1dbd1, .55), skGap: std(0x6f685e, .8), skHandle: std(0xd6d8da, .32, .25), skThrow: std(0xc8b393, .95), skCl: [0xe9e4da, 0x3b4a5e, 0xb9b2a6, 0x7d8466, 0xf4f2ee].map(c => std(c, .9)) }); }
  { /* 소프시스 메이저 피크 책상: 상판 옆면 자작 합판 결(가로 겹 줄, 무작위 없음) */
    const ply = cv(128, 32, (x, w, h) => { x.fillStyle = '#dcc7a3'; x.fillRect(0, 0, w, h); const L = [[3, '#c4a77c'], [9, '#e6d4b4'], [14, '#bf9f72'], [20, '#e3cfac'], [26, '#c6a87d']]; for (const [y, c] of L) { x.fillStyle = c; x.fillRect(0, y, w, 2); } }); ply.repeat.set(6, 1);
    Object.assign(M, { pkPly: std(0xffffff, .6, 0, { map: ply }), pkTop: std(0xf3f2ee, .42), pkLeg: std(0xf1f1ee, .35, .3) }); }
  M.cdBrass = std(0xc9a25e, .3, .7); M.cdGlass = std(0xead8c0, .08, 0, { transparent: true, opacity: .6 }); /* 화장대 금색 손잡이·향수병 유리 */
  M.stDoor = std(0xe6dccb, .18, .05); /* 스타일러 베이지 유광 문 */
  { const t = cv(128, 64, (x, w, h) => { x.fillStyle = '#16191d'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(150,158,166,.8)'; for (let yy = 3; yy < h; yy += 6) for (let xx = (yy % 12 === 3 ? 3 : 6); xx < w; xx += 6) { x.beginPath(); x.arc(xx, yy, 1.6, 0, 7); x.fill(); } }); t.repeat.set(2, 2); M.mwWin = std(0xffffff, .15, .2, { map: t }); M.mwRim = std(0x8a8e93, .4, .3); } /* 전자레인지 문 창: 점 구멍 망 */
  M.bumper = std(0x55585c, .5, 0, { side: T.DoubleSide }); /* 로봇청소기 앞 범퍼(열린 호) */
  M.robotLed = std(0x2f8f4e, .4, 0, { emissive: 0x35c46a, emissiveIntensity: .8 }); /* 충전 거치대 초록 불 */
  M.dwPanel = std(0x2a2d31, .18, .2); M.dwIcon = std(0xe9ecef, .4, 0, { emissive: 0x9aa3ab, emissiveIntensity: .4 }); /* 식기세척기 조작 띠(어두운 유리) · 흰 터치 표시 */
  M.wrGold = std(0xc6a066, .3, .65); /* 로프트 침대 옷장: 금색 막대 손잡이 */
  { /* 11-22 루프: 킹 침대 이불 누빔 — 마름모 박음질 줄 + 칸마다 살짝 볼록한 밝기(무작위 없음) */
    const q = cv(256, 256, (x, w, h) => { x.fillStyle = '#e6e3dd'; x.fillRect(0, 0, w, h); const n = 4, c = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const gx = x.createRadialGradient(i * c + c / 2, j * c + c / 2, 2, i * c + c / 2, j * c + c / 2, c * .62); gx.addColorStop(0, 'rgba(255,255,255,.22)'); gx.addColorStop(1, 'rgba(160,150,135,.06)'); x.fillStyle = gx; x.save(); x.translate(i * c + c / 2, j * c + c / 2); x.rotate(Math.PI / 4); x.fillRect(-c * .36, -c * .36, c * .72, c * .72); x.restore(); }
      x.strokeStyle = 'rgba(120,110,95,.2)'; x.lineWidth = 1.3; x.setLineDash([4, 3]); for (let k = -n; k <= 2 * n; k++) { x.beginPath(); x.moveTo(k * c, 0); x.lineTo(k * c + h, h); x.stroke(); x.beginPath(); x.moveTo(k * c, 0); x.lineTo(k * c - h, h); x.stroke(); } }); q.repeat.set(2, 2);
    M.duvetQ = std(0xffffff, .92, 0, { map: q }); M.cushCamel = std(0xb9a383, .95); M.cushSage = std(0x9aa892, .95); }
  M.book = [0x4a5d73, 0xc9b79c, 0x8e3b3b, 0xe8e4dc, 0x2f3a33, 0xb08a5c, 0x6c7a89].map(c => std(c, .8)); M.bin = [std(0xd8cdb8, .95), std(0x9a9da1, .95)]; M.bookBand = std(0xeadfc6, .6); M.bookBandD = std(0x3b3c3f, .6); M.pages = std(0xf2ecdc, .95); /* 11-22 루프: 책등 띠(밝은·어두운) · 위 책장 면(크림) */ /* 칸막이 책장: 책 표지 7색 · 천 수납 바구니 2색 */
  const chairMesh = cv(32, 32, (x, w, h) => { x.fillStyle = '#2e2e2e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffffff'; x.lineWidth = 7; for (const o of [-32, 0, 32]) { x.beginPath(); x.moveTo(o, 0); x.lineTo(o + 32, 32); x.moveTo(o + 32, 0); x.lineTo(o, 32); x.stroke(); } }); chairMesh.colorSpace = T.NoColorSpace; chairMesh.repeat.set(18, 18); const MO = () => ({ alphaMap: chairMesh, transparent: true, depthWrite: false, side: T.DoubleSide }); /* 11-22 루프: 바퀴 의자 등받이 메시 — 마름모 그물(줄은 불투명, 틈은 비침 · 멀리서는 반투명) */
  M.chair = [ /* 바퀴 의자 색: [몸체·다리, 좌판, 등받이 메시, 팔걸이 패드] */
    [M.black, std(0x34373c, .9), std(0x2a2c30, .85, 0, MO()), M.black], [std(0xeeeeec, .4, .1), std(0x9a9ea3, .9), std(0xa9adb2, .85, 0, MO()), std(0xe9e9e7, .5)]];

  /* ───── 도형 도우미(단위 m, 바닥 y=0, 앞 = +z) ───── */
  const mk = (g, geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const bx = (g, w, h, d, x, y0, z, mat) => mk(g, new T.BoxGeometry(w, h, d), mat, x, y0 + h / 2, z);
  const rb = (g, w, h, d, r, x, y0, z, mat) => mk(g, new RBG(w, h, d, 3, Math.max(.001, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001))), mat, x, y0 + h / 2, z);
  const cy = (g, r, h, x, y0, z, mat, seg = 24, r2 = r) => mk(g, new T.CylinderGeometry(r, r2, h, seg), mat, x, y0 + h / 2, z);
  const boxBatch = () => { const P = [], N = []; return { add(w, h, d, x, y0, z) { const b = new T.BoxGeometry(w, h, d).toNonIndexed(); b.translate(x, y0 + h / 2, z); for (const v of b.attributes.position.array) P.push(v); for (const v of b.attributes.normal.array) N.push(v); b.dispose(); }, mesh(g, mat) { if (!P.length) return; const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); const m = new T.Mesh(geo, mat); m.receiveShadow = true; g.add(m); } }; }; /* 작은 상자 여러 개를 한 메시로(그리기 횟수 줄임) */
  const bookBatch = () => ({ c: boxBatch(), d: boxBatch(), p: boxBatch(), done(g) { this.c.mesh(g, M.bookBand); this.d.mesh(g, M.bookBandD); this.p.mesh(g, M.pages); } });
  const bookDeco = (BB, x, w, h, y0, zf, i) => { const lt = i % 7 === 1 || i % 7 === 3; for (const yy of i % 3 ? [h * .8] : [h * .12, h * .8]) (lt ? BB.d : BB.c).add(w - .004, .008, .002, x, y0 + yy, zf + .001); if (i % 4 === 1) (lt ? BB.d : BB.c).add(w * .45, .03, .002, x, y0 + h * .45, zf + .001); BB.p.add(w - .007, .0026, .186, x, y0 + h - .002, zf - .1); }; /* 11-22 루프 소품 퀄리티업: 세운 책 — 책등 위·아래 띠 + 가운데 제목 칸(몇 권) + 위로 보이는 크림색 책장 면(앞뒤 표지 안쪽) */
  const endShape = (L, Dp, a) => { const x0 = -L / 2, x1 = L / 2 - a, b = Dp / 2, s = new T.Shape(); s.moveTo(x0, -b); s.lineTo(x1, -b); s.absellipse(x1, 0, a, b, -Math.PI / 2, Math.PI / 2, false); s.lineTo(x0, b); s.closePath(); return s; };
  const opG = (g, k, v, x, y, z, n) => { const p = new T.Group(); p.position.set(x, y, z); p.userData.op = { k, v, n }; g.add(p); return p; }; /* 열리는 묶음: k 's' = 앞(+z)으로 v m 미끄러짐(서랍) · 'h' = 경첩 축으로 v rad 회전(문) */
  const upEx = (shape, h) => { const g = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); return g; };
  const puff = (w, h, d) => { const g = new T.SphereGeometry(1, 40, 20), p = g.attributes.position, uv = g.attributes.uv; /* 11-23 루프: 도톰한 이불 덩어리 — 위는 거의 평평, 테두리는 둥글게 부푼 슈퍼타원 판(무늬는 위에서 내려다본 평면으로 펴 바름) */
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), s = Math.hypot(x, z), dx = s > 1e-6 ? x / s : 0, dz = s > 1e-6 ? z / s : 0, rr = Math.pow(s, .35), X = Math.sign(dx) * Math.pow(Math.abs(dx), .25) * rr * w / 2, Z = Math.sign(dz) * Math.pow(Math.abs(dz), .25) * rr * d / 2; p.setXYZ(i, X, Math.sign(y) * Math.pow(Math.abs(y), .6) * h / 2, Z); uv.setXY(i, X / w + .5, Z / d + .5); }
    g.computeVertexNormals(); return g; };

  /* ───── 제품 목록(사용자 제공 사양) ───── */
  const CAT = [
    { k: 'round1000', g: '식탁', name: '원형 식탁', model: '한샘 미나 내추럴 원형 4인 1000', size: '지름 998 · 높이 744 · 다리 간격 555', note: '상판 코튼화이트 · 고무나무 원목 다리 · 의자 미포함', put: 'free', room: ['식당', '주방'], clear: .45,
      build: () => { /* 11-22 루프 퀄리티업: 상판 가장자리 둥글게 깎은 단면(선반) · 상판 밑 원목 테두리 · 아래로 가늘어지며 살짝 벌어진 원목 다리 4(바닥 간격 555 그대로) + 펠트 받침 */
        const g = new T.Group(), H = .744; mk(g, new T.LatheGeometry([[0, 0], [.488, 0], [.495, .003], [.499, .0115], [.4975, .019], [.49, .025], [0, .025]].map(([a, b]) => new T.Vector2(a, b)), 72), M.cotton, 0, H - .025, 0);
        cy(g, .4, .045, 0, H - .07, 0, M.natural, 48); cy(g, .17, .02, 0, H - .045, 0, M.natural, 32);
        for (const [x, z] of [[-.2775, -.2775], [.2775, -.2775], [-.2775, .2775], [.2775, .2775]]) { const r = Math.hypot(x, z), a = Math.atan2(z, x), lg = new T.Group(); lg.rotation.y = -a; g.add(lg); const sp = .06, L = H - .07, rt = r - L * Math.sin(sp);
          const leg = mk(lg, new T.CylinderGeometry(.026, .018, L, 20), M.natural, (rt + r) / 2, L / 2, 0); leg.rotation.z = sp; cy(lg, .02, .006, r, 0, 0, M.greyD, 16); }
        { /* 11-23 루프 퀄리티업: 비어 있던 상판 가운데 — 테 있는 원목 원형 트레이 + 흰 무광 도자기 화병(어깨·좁은 입) + 유칼립투스 3줄기(동그란 은녹색 잎) */
          const tr = mk(g, new T.LatheGeometry([[0, 0], [.15, 0], [.155, .004], [.156, .018], [.15, .018], [.147, .006], [0, .006]].map(([a, b]) => new T.Vector2(a, b)), 48), M.natural, 0, H, 0);
          mk(g, new T.LatheGeometry([[0, 0], [.04, 0], [.052, .03], [.05, .09], [.032, .135], [.016, .15], [.017, .162], [.012, .162], [.011, .15], [0, .15]].map(([a, b]) => new T.Vector2(a, b)), 32), std(0xf1eee8, .7), -.03, H + .006, .02);
          const lf = std(0x8fa59a, .7, 0, { side: T.DoubleSide }), stm = std(0x6f7d63, .8), Y = new T.Vector3(0, 1, 0);
          for (let i = 0; i < 3; i++) { const a = i * 2.1 + .4, tl = .25 + i * .12, d = new T.Vector3(Math.cos(a) * Math.sin(tl), Math.cos(tl), Math.sin(a) * Math.sin(tl)), L2 = .26 + i * .05, b = new T.Vector3(-.03, H + .15, .02), s1 = mk(g, new T.CylinderGeometry(.0018, .0022, L2, 5), stm, b.x + d.x * L2 / 2, b.y + d.y * L2 / 2, b.z + d.z * L2 / 2); s1.quaternion.setFromUnitVectors(Y, d);
            for (let k = 1; k <= 7; k++) { const t = k / 7.5, p = b.clone().addScaledVector(d, L2 * t), side = k % 2 ? 1 : -1, n = new T.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(side * .014), lp = mk(g, new T.CircleGeometry(.013 - k * .0008, 12), lf, p.x + n.x, p.y + .004, p.z + n.z); lp.rotation.set(-Math.PI / 2 + .5 * side, a, 0); } } }
        return g; } },
    { k: 'cielo1500', g: '식탁', name: '확장형 원목 식탁', model: '한샘 씨엘로 모디프 확장형 원목 식탁 1500', size: '확장 전 1100×1100 · 확장 후 1500×1100 · 높이 750', note: '원목 · 의자 미포함 · 선택 후 [확장] 버튼', put: 'free', room: ['식당', '주방'], clear: .45, ext: true,
      build: s => { /* 11-22 루프 퀄리티업: 모서리 둥근 상판 · 아래로 가늘어지는 사각 원목 다리 · 펠트 받침 */ const W = s.ext ? 1.5 : 1.1, D = 1.1, H = .75, g = new T.Group(); rb(g, W, .04, D, .008, 0, H - .04, 0, M.oak);
        for (const x of (s.ext ? [-.2, .2] : [0])) bx(g, .004, .002, D - .004, x, H, 0, M.seam);
        const ai = .075; bx(g, W - 2 * ai, .08, .025, 0, H - .12, D / 2 - ai, M.oak); bx(g, W - 2 * ai, .08, .025, 0, H - .12, -(D / 2 - ai), M.oak); bx(g, .025, .08, D - 2 * ai, W / 2 - ai, H - .12, 0, M.oak); bx(g, .025, .08, D - 2 * ai, -(W / 2 - ai), H - .12, 0, M.oak);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const lg = mk(g, new T.CylinderGeometry(.046, .032, H - .04, 4), M.oak, sx * (W / 2 - .075), (H - .04) / 2, sz * (D / 2 - .075)); lg.rotation.y = Math.PI / 4; cy(g, .02, .006, sx * (W / 2 - .075), 0, sz * (D / 2 - .075), M.greyD, 12); }
        { /* 11-23 루프 퀄리티업: 비어 있던 상판 — 가운데 길게 깐 오트밀 린넨 러너(양끝 술) + 낮은 흰 도자기 볼(안쪽 연회색) + 놋쇠 촛대 2(흰 긴 초) */
          const rl = W * .78; bx(g, rl, .003, .34, 0, H, 0, std(0xd8ccb6, .92)); for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) bx(g, .02, .002, .004, sx * (rl / 2 + .01), H, -.16 + i * .0246, std(0xcdbfa6, .95));
          mk(g, new T.LatheGeometry([[0, 0], [.06, 0], [.075, .006], [.12, .045], [.124, .05], [.118, .05], [.07, .014], [0, .014]].map(([a, b]) => new T.Vector2(a, b)), 40), std(0xf3f1ec, .55, 0, { side: T.DoubleSide }), 0, H + .003, 0);
          const br = std(0xc9a45c, .35, .4); for (const x of [-.26, .26]) { mk(g, new T.LatheGeometry([[0, 0], [.04, 0], [.042, .006], [.012, .018], [.009, .06], [.014, .14], [.009, .2], [.018, .21], [.018, .222], [0, .222]].map(([a, b]) => new T.Vector2(a, b)), 24), br, x, H + .003, .04 * Math.sign(x)); cy(g, .0105, .2, x, H + .225, .04 * Math.sign(x), std(0xf8f6f0, .6), 16); cy(g, .0012, .012, x, H + .425, .04 * Math.sign(x), std(0x1a1715, .8), 6); } }
        return g; } },
    { k: 'mw23', g: '주방', name: '전자레인지', model: '삼성 세라믹 전자레인지 23L (MS23C3535AW)', size: '489 × 275 × 374 (가로×높이×깊이)', note: '화이트 · 조리대·렌지대 위에 놓임', put: 'top', room: ['주방', '식당'],
      build: () => { /* 11-22 루프 퀄리티업: 문 창은 점 구멍 망(어두운 유리 속 작은 점 격자) + 둘레 회색 테 · 문 오른쪽 끝 세로 손잡이 홈 · 옆면 통풍 틈 */
        const g = new T.Group(), W = .489, H = .275, D = .374; rb(g, W, H - .008, D, .014, 0, .008, 0, M.applW);
        bx(g, W - .158, H - .063, .003, -.06, .034, D / 2 + .0005, M.mwRim); bx(g, W - .17, H - .075, .004, -.06, .04, D / 2 + .001, M.mwWin); bx(g, W - .15, .012, .003, -.06, H - .03, D / 2 + .001, M.white);
        bx(g, .008, H - .09, .004, W / 2 - .12, .045, D / 2 + .0015, M.greyD); for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) bx(g, .002, .008, .1, sx * (W / 2 + .0005), H - .07 - i * .016, -.08, M.greyD); /* 손잡이 홈 · 옆 통풍 틈 */
        bx(g, .1, H - .04, .003, W / 2 - .06, .02, D / 2 + .001, std(0xe8e8e5, .35)); bx(g, .055, .016, .003, W / 2 - .06, H - .07, D / 2 + .003, M.display);
        const d = mk(g, new T.CylinderGeometry(.019, .019, .012, 28), M.chrome, W / 2 - .06, .12, D / 2 + .007); d.rotation.x = Math.PI / 2;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, .012, .008, sx * (W / 2 - .04), 0, sz * (D / 2 - .04), M.black, 12); return g; } },
    { k: 'flat1400', g: '주방', name: '높은 렌지대 수납장', model: '플랫 높은 렌지대 수납장 1400 세트 (O80)', size: '1400 × 935 × 400 (폭×높이×깊이)', note: '가운데 칸에 전자레인지 · 슬라이드 선반 · 서랍', put: 'wall', room: ['주방', '식당'], slots: [[0, .518, -.01, .54, .395, .37]], /* x·y·z · 칸 폭·높이·깊이 */
      build: () => { const g = new T.Group(), W = 1.4, H = .935, D = .4; bx(g, W, .02, D, 0, H - .02, 0, M.oakL); bx(g, W - .04, .07, D - .06, 0, 0, -.02, M.greyD);
        for (const sx of [-1, 1]) bx(g, .018, H - .09, D, sx * (W / 2 - .009), .07, 0, M.white); bx(g, W - .036, H - .09, .012, 0, .07, -D / 2 + .006, M.white); bx(g, W - .036, .018, D - .012, 0, .07, .006, M.white);
        for (const x of [-.28, .28]) bx(g, .018, H - .09, D - .012, x, .07, .006, M.white);
        for (const x of [-.59, -.39]) { bx(g, .196, H - .1, .018, x, .075, D / 2 - .009, M.white); bx(g, .006, .16, .004, x + (x < -.5 ? .09 : -.09), .5, D / 2 + .001, M.greyD); }
        bx(g, .542, .018, D - .03, 0, .5, .003, M.oakL); bx(g, .52, .018, D - .045, 0, .285, .01, M.oakL); bx(g, .52, .035, .014, 0, .285, D / 2 - .03, M.white); bx(g, .542, .19, .018, 0, .078, D / 2 - .009, M.white); bx(g, .16, .006, .004, 0, .25, D / 2 + .001, M.greyD);
        { const tb = std(0xe9e2d4, .35), y0 = .303; rb(g, .26, .165, .15, .03, 0, y0, .0, tb); for (const dz of [-.03, .03]) bx(g, .17, .003, .024, 0, y0 + .164, dz, M.black); bx(g, .012, .022, .03, .136, y0 + .11, .0, M.chrome); bx(g, .006, .05, .004, .131, y0 + .05, .0, M.greyD); for (const sx of [-1, 1]) bx(g, .02, .008, .12, sx * .11, y0 - .004, 0, M.greyD); } /* 11-22 루프 퀄리티업: 슬라이드 선반 위 크림색 토스터(위 빵 구멍 2 · 옆 크롬 레버 · 받침) */
        { const kx = .45; cy(g, .085, .02, kx, H, 0, M.black, 28); mk(g, new T.LatheGeometry([[0, 0], [.076, 0], [.08, .03], [.074, .15], [.058, .185], [0, .185]].map(([a, b]) => new T.Vector2(a, b)), 32), M.applW, kx, H + .02, 0); cy(g, .016, .016, kx, H + .205, 0, M.black, 16);
          { const hd = mk(g, new T.TorusGeometry(.05, .009, 8, 20, Math.PI), M.black, kx, H + .19, 0); hd.rotation.y = Math.PI / 2; } { const sp = mk(g, new T.CylinderGeometry(.009, .015, .06, 12), M.applW, kx + .085, H + .15, 0); sp.rotation.z = -.9; } } /* 윗판 위 흰 전기주전자(검은 받침 · 위 손잡이 · 주둥이) */
        for (const [y0, y1] of [[.075, .33], [.335, .59], [.595, .91]]) { bx(g, .4, y1 - y0 - .005, .018, .49, y0, D / 2 - .009, M.white); bx(g, .16, .006, .004, .49, y1 - .03, D / 2 + .001, M.greyD); } return g; } },
    { k: 'frua1400', g: '주방', name: '홈바 렌지대(반타원)', model: '프루아 1400 템바보드 반타원 렌지대 수납장 아일랜드 홈바 식탁 (NDD171C)', size: '상판 600×1400 · 하단 390×1185 · 높이 888', note: '화이트 · 앞면 템바보드 · 선택 후 [좌우 바꾸기]로 좌측형/우측형', put: 'free', room: ['식당', '주방'], clear: .35, flip: true,
      build: () => { const g = new T.Group(), H = .888; const base = mk(g, upEx(endShape(1.185, .39, .3), H - .03), [M.white, M.tamb], 0, 0, -.105);
        mk(g, upEx(endShape(1.4, .6, .36), .03), M.white, 0, H - .03, 0); bx(g, .78, .3, .004, -.17, .1, -.3 - .002, std(0xd9d6cf, .7)); bx(g, .78, .3, .004, -.17, .46, -.3 - .002, std(0xd9d6cf, .7)); base.castShadow = true;
        mk(g, new T.LatheGeometry([[0, 0], [.09, 0], [.13, .045], [.137, .062], [.128, .062], [.086, .012], [0, .012]].map(([a, b]) => new T.Vector2(a, b)), 36), M.natural, .32, H, .02);
        for (const [dx, dz, dy, c] of [[-.04, -.02, 0, 0xe8862a], [.04, -.025, 0, 0xc8312b], [0, .04, 0, 0x8cbf3f], [.005, -.005, .055, 0xe8862a]]) mk(g, new T.SphereGeometry(.036, 18, 12), std(c, .45), .32 + dx, H + .046 + dy, .02 + dz); return g; } }, /* 11-22 루프 퀄리티업: 상판 위 원목 과일 그릇(오렌지 2·사과·청사과) */
    { k: 'muse600', g: '주방', name: '스몰 렌지대', model: '가이온 뮤즈 600 스몰 렌지대', size: '600 × 400 × 785 (폭×깊이×높이)', note: '위 칸 전자레인지 · 선택 후 [색상]으로 6가지 색', put: 'wall', room: ['주방', '식당'], cols: MUSE.map(c => c[0]), slots: [[0, .448, -.01, .56, .315, .37]],
      build: s => { const [, B, F, S] = MUSE[s.col || 0], g = new T.Group(), W = .6, D = .4, H = .785; bx(g, W, .02, D, 0, H - .02, 0, S); bx(g, W - .04, .04, D - .05, 0, 0, -.015, M.greyD);
        for (const sx of [-1, 1]) bx(g, .018, H - .06, D, sx * (W / 2 - .009), .04, 0, B); bx(g, W - .036, H - .06, .012, 0, .04, -D / 2 + .006, B);
        bx(g, W - .036, .018, D - .012, 0, .43, .006, S); bx(g, W - .05, .018, D - .045, 0, .24, .01, S); bx(g, W - .05, .04, .015, 0, .24, D / 2 - .03, F);
        bx(g, W - .036, .018, D - .012, 0, .222, .006, B); bx(g, W - .006, .175, .018, 0, .045, D / 2 - .009, F); bx(g, .14, .006, .004, 0, .19, D / 2 + .001, M.greyD);
        { const y0 = .258; mk(g, new T.LatheGeometry([[0, 0], [.088, 0], [.096, .015], [.1, .06], [.094, .11], [.084, .12], [0, .12]].map(([a, b]) => new T.Vector2(a, b)), 32), M.applW, 0, y0, .02); { const ld = mk(g, new T.SphereGeometry(.084, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.grey, 0, y0 + .118, .02); ld.scale.y = .32; }
          bx(g, .05, .03, .004, 0, y0 + .055, .02 + .1, M.black); bx(g, .028, .008, .002, 0, y0 + .063, .02 + .1025, M.display); bx(g, .07, .012, .02, 0, y0 + .135, .02 + .07, M.greyD); } return g; } }, /* 11-22 루프 퀄리티업: 슬라이드 선반 위 3인용 흰 전기밥솥(둥근 몸통 · 회색 뚜껑 · 앞 검은 조작판 · 손잡이) */
    { k: 'dw6', g: '주방', name: '식기세척기(카운터탑)', model: '삼성 비스포크 식기세척기 카운터탑 6인용', size: '555 × 480 × 500 (폭×높이×깊이)', note: '화이트 · 조리대 위에 놓임', put: 'top', room: ['주방', '식당'],
      build: () => { const g = new T.Group(), W = .555, H = .48, D = .5; rb(g, W, H - .01, D, .016, 0, .01, 0, M.applW); bx(g, W - .02, H - .07, .006, 0, .02, D / 2 + .002, std(0xf6f6f4, .25));
        bx(g, W - .03, .034, .004, 0, H - .056, D / 2 + .004, M.dwPanel); bx(g, .06, .012, .003, W / 2 - .07, H - .045, D / 2 + .007, M.display); bx(g, .26, .012, .005, 0, H - .095, D / 2 + .005, M.black);
        for (let i = 0; i < 5; i++) bx(g, .016, .003, .002, -W / 2 + .06 + i * .045, H - .04, D / 2 + .0065, M.dwIcon); { const pw = mk(g, new T.TorusGeometry(.006, .0012, 6, 18), M.dwIcon, W / 2 - .14, H - .039, D / 2 + .0065); pw.rotation.set(0, 0, .5); } /* 11-22 루프 퀄리티업: 위 조작 띠를 어두운 유리로 + 흰 터치 표시 5·전원 고리 */
        for (const [w2, h2, x2, y2] of [[W - .02, .003, 0, .019], [.003, H - .07, -(W - .02) / 2, .02], [.003, H - .07, (W - .02) / 2, .02]]) bx(g, w2, h2, .004, x2, y2, D / 2 + .003, M.greyD); /* 문 둘레 틈 */
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, .012, .01, sx * (W / 2 - .04), 0, sz * (D / 2 - .04), M.black, 12); return g; } },
    { k: 'king', g: '침실', name: '킹사이즈 침대', model: '킹사이즈 침대 1600 × 2000', size: '매트리스 1600 × 2000', note: '안방(침실1)에 놓임 · 헤드보드를 벽에', put: 'wall', room: ['침실1', '안방'],
      build: () => { /* 11-22 루프 퀄리티업: 바닥에서 살짝 뜬 패브릭 받침(어두운 걸레받이 그림자) · 누빔 이불(위 + 양옆·발치로 늘어짐) · 머리 쪽 흰 시트 접힘 · 헤드보드에 기댄 베개 2 + 앞 캐멀 쿠션·세이지 작은 쿠션 */
        const g = new T.Group(); bx(g, 1.56, .045, 1.96, 0, 0, 0, M.greyD); rb(g, 1.66, .255, 2.06, .03, 0, .045, 0, M.fabric); rb(g, 1.6, .24, 2, .05, 0, .3, 0, M.linen);
        { /* 11-23 루프 퀄리티업: 누빔 판 + 양옆·발치에 붙인 얇은 판 → 매트리스를 덮고 모서리를 둥글게 돌아 양옆·발치로 늘어지는 한 장 이불(두께 3cm, 아래로 갈수록 살짝 벌어지는 자락 + 잔물결, 발치 모서리는 같은 높이로 접힘) */
          const path = (a0, a1, yT, yH, r) => { const P = [], add = (a, y) => P.push([a, y]); for (let y = yH; y < yT - r - .004; y += .02) add(a0, y); for (let k = 0; k <= 8; k++) { const t = Math.PI - k / 8 * Math.PI / 2; add(a0 + r + Math.cos(t) * r, yT - r + Math.sin(t) * r); } for (let a = a0 + r + .03; a < a1 - r - .02; a += .04) add(a, yT); for (let k = 0; k <= 8; k++) { const t = Math.PI / 2 - k / 8 * Math.PI / 2; add(a1 - r + Math.cos(t) * r, yT - r + Math.sin(t) * r); } for (let y = yT - r - .02; y > yH; y -= .02) add(a1, y); add(a1, yH); return P; };
          const YT = .575, WP = path(-.835, .835, YT, .34, .045), LP0 = path(-1.6, 1.015, YT, .36, .045), LP = LP0.filter(p => p[0] >= -.48) /* 머리 쪽 끝은 접어 내린 흰 시트 밑에서 끝남 */, th = .03;
          const acc = P => { const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return S; }, SW = acc(WP), SL = acc(LP), NI = WP.length, NJ = LP.length;
          const pos = [], uv = [], idx = [], wob = (x, z, d) => d > .01 ? .006 * Math.min(1, d / .15) * Math.sin(x * 23 + z * 19) : 0;
          for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) { const [x0, yw] = WP[i], [z0, yl] = LP[j], dw = YT - yw, dl = YT - yl, d = Math.min(dw + dl, YT - .34), fl = .025 * Math.min(1, d / .2); let x = x0 + Math.sign(x0) * (dw > .01 ? fl : 0), z = z0 + (dl > .01 ? fl : 0); const w = wob(x0, z0, d); x += Math.sign(x0) * (dw > .01 ? w : 0); z += dl > .01 ? w : 0; pos.push(x, YT - d, z); uv.push(SW[i] / 1.7, SL[j] / 1.5); }
          const id = (i, j) => i * NJ + j; for (let i = 0; i < NI - 1; i++) for (let j = 0; j < NJ - 1; j++) { const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), dd = id(i, j + 1); idx.push(a, dd, b, dd, c, b); }
          const top = new T.BufferGeometry(); top.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); top.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); top.setIndex(idx); top.computeVertexNormals();
          const n = top.attributes.normal, bp = pos.map((v, k) => v - n.array[k] * th), bot = new T.BufferGeometry(); bot.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); bot.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); bot.setIndex(idx.slice()); bot.computeVertexNormals();
          const dm = M.duvetQ.clone(); dm.side = T.DoubleSide; mk(g, top, dm, 0, 0, 0); const bm = M.duvet.clone(); bm.side = T.DoubleSide; mk(g, bot, bm, 0, 0, 0).castShadow = false;
          const ep = [], edge = (ks) => { for (let q = 0; q < ks.length - 1; q++) { const k0 = ks[q] * 3, k1 = ks[q + 1] * 3, A = pos.slice(k0, k0 + 3), B = pos.slice(k1, k1 + 3), C = bp.slice(k1, k1 + 3), D = bp.slice(k0, k0 + 3); ep.push(...A, ...B, ...C, ...A, ...C, ...D); } };
          edge([...Array(NJ).keys()].map(j => id(0, j))); edge([...Array(NJ).keys()].map(j => id(NI - 1, j))); edge([...Array(NI).keys()].map(i => id(i, NJ - 1))); edge([...Array(NI).keys()].map(i => id(i, 0)));
          const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(ep, 3)); eg.computeVertexNormals(); mk(g, eg, bm, 0, 0, 0).castShadow = false; }
        rb(g, 1.72, .03, .24, .014, 0, .585, -.35, M.linen); /* 머리 쪽으로 접어 내린 흰 시트 */
        for (const x of [-.4, .4]) { const p = rb(g, .62, .15, .42, .07, x, .56, -.8, M.pillow); p.rotation.x = -.45; } /* 헤드보드에 기댄 베개 */
        { const c = rb(g, .62, .17, .13, .06, -.06, .6, -.56, M.cushCamel); c.rotation.x = -.3; const c2 = rb(g, .34, .3, .12, .06, .42, .59, -.6, M.cushSage); c2.rotation.set(-.32, -.15, 0); } /* 앞 장식 쿠션 */
        rb(g, 1.72, 1.02, .1, .035, 0, 0, -1.08, M.chanFab).material = M.chanFab; return g; } },
    { k: 'bunkSS', g: '침실', name: '수납 벙커침대(행거·서랍)', model: '삼익가구 빅룸 빅수납 행거 서랍 벙커침대 SS · C타입(행거+서랍+행거)', size: '본체 2000×1122×1026 · 계단 포함 길이 2400 · 안전가드 1200×400', note: '슈퍼싱글 · 행거 2칸(안 깊이 1055·높이 980) + 서랍 4 · 3단 수납계단(높이 900) · 문·서랍을 누르면 열림 · 매트리스 별도 · [좌우 바꾸기]로 계단 쪽', put: 'wall', room: ['알파룸', '침실2'], flip: true,
      build: () => { /* 상세 도면: 본체 2000(길이)×1122(깊이)×1026(높이), 앞(+z) = 왼 문(행거) · 서랍 4 · 오른 문(행거), 위 앞쪽 머리 쪽에 1200×400 안전가드, 발 쪽 끝에 400×900 3단 계단(단마다 서랍, 뒤로 갈수록 높아짐, 맨 위 900)
          몸통은 속이 빈 칸(옆판·윗판·바닥판·뒤판·칸막이) — 문·서랍·계단 서랍은 누르면(E·탭) 열림: 행거 칸엔 앞뒤 방향 봉에 옷, 서랍엔 개어 둔 옷 */
        const g = new T.Group(), L = 2, D = 1.122, H = 1.026, F = D / 2, t = .018, zc = -.009, Dc = D - t, B = M.skBody, Fr = M.skFront, Hd = M.skHandle, Hi = H - .048 - t;
        bx(g, L - .04, .03, D - .06, 0, 0, -.03, M.greyD); bx(g, L, t, Dc, 0, .03, zc, B); bx(g, L, t, Dc, 0, H - t, zc, B); /* 걸레받이(안으로 들어감) · 바닥판 · 윗판 */
        for (const sx of [-1, 1]) bx(g, t, Hi, Dc, sx * (L / 2 - t / 2), .048, zc, B); bx(g, L - 2 * t, Hi, .008, 0, .048, -F + .004, B); for (const x of [-.335, .335]) bx(g, t, Hi, Dc - .008, x, .048, zc + .004, B); /* 옆판 · 뒤판 · 칸막이 */
        const bar = (p, cx, y0, w, h, zF) => { bx(p, w, h, .01, cx, y0, zF + .012, Hd); if (w > h) for (const k of [-1, 1]) bx(p, .01, h, .012, cx + k * (w / 2 - .02), y0, zF + .006, Hd); else for (const kk of [.02, h - .03]) bx(p, w, .01, .012, cx, y0 + kk, zF + .006, Hd); }; /* 은색 막대 손잡이(다리 2개로 앞판에서 띄움) */
        for (const sx of [-1, 1]) { const p = opG(g, 'h', sx * -1.75, sx * (L / 2 - .002), 0, F - t, '행거 문'); bx(p, .661, H - .05, t, -sx * .3305, .035, t / 2, Fr); bar(p, -sx * .3305, .74, .014, .17, t); /* 문(바깥쪽 끝 경첩) */
          const cx = sx * .663; bx(g, .012, .012, Dc - .06, cx, .9, zc, Hd); for (let i = 0; i < 5; i++) { const z = .4 - i * .19; bx(g, .38, .008, .008, cx, .875, z, M.greyD); rb(g, .42, .58, .035, .012, cx, .29, z, M.skCl[(i + (sx > 0 ? 2 : 0)) % 5]); } } /* 행거 봉(앞뒤 방향) + 옷걸이·옷 5벌 */
        const dh = (H - .05) / 4; for (let i = 0; i < 4; i++) { const y0 = .035 + i * dh, p = opG(g, 's', .5, 0, 0, 0, '서랍'), bz = F - t - .4875, bh = .182; /* 서랍 4(안 590×975×170) */
          bx(p, .666, dh - .004, t, 0, y0 + .002, F - t / 2, Fr); bar(p, 0, y0 + dh - .055, .22, .012, F);
          bx(p, .61, .012, .975, 0, y0 + .03, bz, B); for (const sx of [-1, 1]) bx(p, .012, bh, .975, sx * .299, y0 + .03, bz, B); bx(p, .586, bh, .012, 0, y0 + .03, bz - .4815, B);
          if (i >= 2) for (const [x, c] of [[-.15, 0], [.12, 3]]) rb(p, .24, .07, .3, .02, x, y0 + .042, .1, M.skCl[c]); }
        rb(g, 1.98, .2, 1.05, .04, 0, H, -.02, M.linen); /* 매트리스(별도 구매) */
        mk(g, puff(1.4, .06, 1.07), M.duvetQ, .25, H + .215, -.02); /* 11-23 루프: 얇은 판 → 둥글게 부푼 도톰한 누빔 이불 */ rb(g, .18, .026, 1.08, .011, -.48, H + .214, -.02, M.linen); /* 11-22 루프: 누빔 이불 + 머리 쪽 접어 내린 흰 시트(로프트 침대와 같은 침구) */ { const P = [], th = .028, yT = H + .262, add = (a, b) => P.push([a, b]); /* 11-23 루프 퀄리티업: 발 쪽 니트 담요 — 판 + 끝 판(각진 판 두 장) → 이불 위에 덮여 발치 끝에서 둥글게 넘어가 늘어지는 한 장 천(자락은 아래로 갈수록 살짝 벌어지고 잔물결) */
          for (let a = -.13; a < .95; a += .04) add(a, yT); for (let k = 0; k <= 8; k++) { const t = Math.PI / 2 - k / 8 * Math.PI / 2; add(.955 + Math.cos(t) * .05, yT - .05 + Math.sin(t) * .05); } for (let y = yT - .07; y > H - .085; y -= .02) add(1.005, y);
          const N = P.length, Mz = 25, S = [0], pos = [], uv = [], idx = []; for (let i = 1; i < N; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
          for (const sd of [1, -1]) for (let i = 0; i < N; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(N - 1, i + 1)], tl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), nx = -(p1[1] - p0[1]) / tl, ny = (p1[0] - p0[0]) / tl, hf = Math.max(0, Math.min(1, (yT - .05 - P[i][1]) / .3));
            for (let j = 0; j < Mz; j++) { const v = j / (Mz - 1), z = (v - .5) * 1.08 * (1 + .04 * hf), o = .006 * hf * Math.sin(z * 31) + .012 * hf * hf + sd * th / 2; pos.push(P[i][0] + nx * o, P[i][1] + ny * o, z - .02); uv.push(v * 1.4, S[i] / .5); } }
          const id = (o, i, j) => o + i * Mz + j, B0 = N * Mz, q = (a, b, c, d) => idx.push(a, b, d, b, c, d);
          for (let i = 0; i < N - 1; i++) { for (let j = 0; j < Mz - 1; j++) { q(id(0, i, j), id(0, i, j + 1), id(0, i + 1, j + 1), id(0, i + 1, j)); q(id(B0, i, j), id(B0, i + 1, j), id(B0, i + 1, j + 1), id(B0, i, j + 1)); } q(id(0, i, 0), id(0, i + 1, 0), id(B0, i + 1, 0), id(B0, i, 0)); q(id(0, i, Mz - 1), id(B0, i, Mz - 1), id(B0, i + 1, Mz - 1), id(0, i + 1, Mz - 1)); }
          for (let j = 0; j < Mz - 1; j++) { q(id(0, 0, j), id(B0, 0, j), id(B0, 0, j + 1), id(0, 0, j + 1)); q(id(0, N - 1, j), id(0, N - 1, j + 1), id(B0, N - 1, j + 1), id(B0, N - 1, j)); }
          const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); mk(g, geo, M.skThrow, 0, 0, 0); }
        { const p = rb(g, .42, .13, .62, .06, -.74, H + .2, -.06, M.pillow); p.rotation.z = -.2; } { const c = rb(g, .12, .42, .42, .05, -.93, H + .2, -.02, M.pillow); c.rotation.z = -.18; }
        { const bg = new T.Group(); bg.position.set(-.5, H + .235, .26); bg.rotation.y = -.35; g.add(bg); /* 11-23 루프 퀄리티업(침대 위 인형): 접은 시트 앞쪽에 앉은 크림색 토끼 인형 — 통통한 몸·머리 + 길게 선 두 귀(안쪽 분홍) + 밝은 주둥이·분홍 코·검은 눈 + 앞으로 뻗은 발 + 옆으로 늘어진 팔 + 둥근 꼬리 */
          const fur = std(0xf1ebe0, .95), pk = std(0xe9a9b0, .8), mz = std(0xfbf8f2, .9), bk = std(0x1b1a19, .35), S = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = mk(bg, new T.SphereGeometry(r, 18, 12), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
          S(.055, fur, 0, .062, 0, 1, 1.1, .95); S(.042, fur, 0, .15, .008); S(.016, mz, 0, .14, .04, 1.2, .85, .8); S(.006, pk, 0, .148, .054); S(.018, fur, 0, .05, -.055);
          for (const sx of [-1, 1]) { S(.005, bk, sx * .016, .162, .037); const e = S(.016, fur, sx * .02, .225, -.004, 1, 3.2, .55); e.rotation.z = -sx * .16; const ei = S(.009, pk, sx * .021, .222, .003, 1, 3, .3); ei.rotation.z = -sx * .16;
            const a = S(.017, fur, sx * .05, .08, .02, 1, 1.7, 1); a.rotation.z = sx * .45; S(.022, fur, sx * .03, .02, .045, 1, .8, 1.6); } }
        rb(g, 1.2, .4, .022, .03, -.35, H, F - .03, M.white); for (const [dx, dy] of [[-.55, .06], [.55, .06], [.55, .33], [-.55, .33]]) bx(g, .012, .012, .004, -.35 + dx, H + dy, F - .017, M.greyD); /* 안전가드 + 고정 나사 */
        for (let i = 0; i < 3; i++) { const y0 = i * .3, zf = F - i * .3, dz = .9 - i * .3, zm = zf - dz / 2, S = M.skStair, dd = [.575, .475, .225][i]; /* 계단 단: 디딤판·바닥판·옆판·뒤판 + 서랍(안 312×155×dd) */
          bx(g, .398, .018, dz, 1.201, y0 + .28, zm, S); bx(g, .398, .018, dz - .016, 1.201, y0, zm - .008, S); for (const sx of [-1, 1]) bx(g, .018, .262, dz - .016, 1.201 + sx * .19, y0 + .018, zm - .008, S); bx(g, .362, .262, .01, 1.201, y0 + .018, zf - dz + .005, S);
          bx(g, .362, .017, .012, 1.201, y0 + .018, zf - .03, M.skGap); /* 서랍 밑 손 넣는 틈 */
          const p = opG(g, 's', Math.min(.42, dd * .8), 0, 0, 0, '계단 서랍'), bz = zf - .016 - dd / 2; bx(p, .372, .245, .016, 1.201, y0 + .035, zf - .008, M.skStairF);
          bx(p, .324, .01, dd, 1.201, y0 + .04, bz, S); for (const sx of [-1, 1]) bx(p, .01, .16, dd, 1.201 + sx * .157, y0 + .04, bz, S); bx(p, .304, .16, .01, 1.201, y0 + .04, bz - dd / 2 + .005, S); }
        return g; } },
    { k: 'peak1400', g: '서재', name: '책상 1400', model: '소프시스 E0등급 메이저 피크 1400×600 데스크 책상', size: '1400 × 600 × 720 (폭×깊이×높이)', note: '화이트 상판(옆면 자작 합판 결) · 흰 철제 다리 · 양 끝 바닥 받침봉 · 뒤쪽 대각 보강대 · 옆 가방 고리', put: 'wall', room: ['알파룸', '침실2'],
      build: () => { /* 상세 도면: 상판 1400×600, 높이 720 — 양 끝은 다리 2개 + 위·아래 가로봉으로 닫힌 'ㅁ'자 철제 프레임(바닥에 검은 수평 발), 뒤쪽엔 다리에서 상판 밑으로 가는 대각 보강대, 오른쪽 앞에 가방 고리 */
        const g = new T.Group(), W = 1.4, D = .6, H = .72, tt = .025, Lg = M.pkLeg, lx = W / 2 - .05, lz = D / 2 - .035;
        mk(g, new T.BoxGeometry(W, tt, D), [M.pkPly, M.pkPly, M.pkTop, M.pkTop, M.pkPly, M.pkPly], 0, H - tt / 2, 0); /* 상판: 윗면·밑면 흰색, 네 옆면 자작 결 */
        for (const sx of [-1, 1]) { const x = sx * lx;
          for (const sz of [-1, 1]) { bx(g, .028, H - tt - .018, .028, x, .018, sz * lz, Lg); cy(g, .013, .018, x, 0, sz * lz, M.black, 14); } /* 다리 + 검은 수평 발 */
          bx(g, .026, .028, 2 * lz - .028, x, H - tt - .028, 0, Lg); bx(g, .026, .026, 2 * lz - .028, x, .045, 0, Lg); /* 위 가로봉(상판 받침) · 아래 받침봉 */
          const a = [x, .3], b = [sx * (lx - .4), H - tt - .004], L = Math.hypot(b[0] - a[0], b[1] - a[1]), br = mk(g, new T.BoxGeometry(L, .008, .008), Lg, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -lz + .006); br.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]); } /* 뒤 대각 보강대 */
        bx(g, .52 * W, .02, .022, 0, H - tt - .02, -lz, Lg); /* 뒤 가로 보강(상판 밑) */
        { const hk = mk(g, new T.TorusGeometry(.016, .0028, 6, 18, Math.PI * 1.25), Lg, lx + .022, H - tt - .05, lz - .05); hk.rotation.y = Math.PI / 2; hk.rotation.z = Math.PI * .87; bx(g, .005, .035, .005, lx + .022, H - tt - .04, lz - .05, Lg); } /* 오른쪽 앞 가방 고리 */
        { /* 11-23 루프 퀄리티업: 비어 있던 상판 위 소품 — 27인치 모니터(얇은 검은 테 · 어두운 화면 은은한 빛 · 뒤 기둥 + 납작한 타원 받침) · 흰 슬림 키보드(옅은 회색 자판 줄) · 흰 무선 마우스 · 원목 연필꽂이(연필 3) */
          const blk = std(0x1c1d20, .45, .2), wt = std(0xf2f2ef, .35), y = H;
          { const b = mk(g, new T.CylinderGeometry(.11, .11, .012, 36), std(0x2a2b2e, .35, .5), -.05, y + .006, -.15); b.scale.set(1, 1, .72); rb(g, .045, .3, .02, .008, -.05, y + .012, -.19, std(0x2a2b2e, .35, .5));
            const pn = new T.Group(); pn.position.set(-.05, y + .34, -.17); pn.rotation.x = -.06; g.add(pn); rb(pn, .62, .37, .022, .006, 0, -.185, 0, blk);
            const sc = mk(pn, new T.PlaneGeometry(.596, .336), std(0x1b2430, .15, 0, { emissive: 0x34506e, emissiveIntensity: .32 }), 0, .008, .0115); sc.castShadow = false; bx(pn, .62, .022, .0232, 0, -.185, 0, blk); }
          { const kt = cv(512, 160, (x, w, h) => { x.fillStyle = '#f4f4f1'; x.fillRect(0, 0, w, h); x.fillStyle = '#dcdcd8'; for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) { if (r === 4 && k > 3 && k < 11) continue; x.fillRect(8 + k * 33.2, 8 + r * 30, 28, 25); } x.fillRect(8 + 4 * 33.2, 8 + 4 * 30, 7 * 33.2 - 5, 25); });
            const kb = rb(g, .44, .012, .13, .004, -.05, y, .08, wt); kb.rotation.x = -.03; bx(g, .425, .0012, .115, -.05, y + .0122, .08, std(0xffffff, .6, 0, { map: kt })); }
          { const ms = mk(g, new T.SphereGeometry(.03, 20, 12), wt, .3, y + .004, .09); ms.scale.set(.72, .42, 1.15); bx(g, .0015, .002, .03, .3, y + .016, .07, std(0xcfcfcb, .5)); }
          { const px = .52, pz = -.16, wd = std(0xc49a6c, .6); mk(g, new T.CylinderGeometry(.034, .034, .1, 24, 1, true), std(0xc49a6c, .6, 0, { side: T.DoubleSide }), px, y + .05, pz); cy(g, .034, .006, px, y, pz, wd, 24);
            for (const [ox, oz, rz, col] of [[-.01, .006, .12, 0x2d4f8a], [.012, -.004, -.1, 0xe3b33a], [0, -.012, .04, 0x202124]]) { const pc = mk(g, new T.CylinderGeometry(.0035, .0035, .16, 6), std(col, .5), px + ox, y + .085, pz + oz); pc.rotation.set(oz * 4, 0, rz); } } }
        return g; } },
    { k: 'loftWR', g: '침실', name: '로프트 침대(수납계단+옷장 4)', model: '수납계단형 로프트 침대 2046 + 옷장 500 4개(B·B·A·A)', size: '침대 2046×1143×1800 · 계단 353(전체 길이 2399) · 침대 밑 1300 · 옷장 500×555×1300', note: '흰 몸통 · 가드·앞 레일 오크/화이트 [색상] · 옷장 문 4·서랍 4·계단 서랍 4를 누르면 열림 · 계단 손잡이 레일 · [좌우 바꾸기]로 계단 쪽', put: 'wall', room: ['알파룸', '침실2'], flip: true, cols: ['오크', '화이트'],
      build: s => { /* 도면: 침대 길이 2046(양 끝판 포함)·깊이 1143·가드 위 1800, 바닥판 밑 1300 / 계단 353×1143, 4단(단 290)·서랍마다 둥근 손잡이, 손잡이 레일 꼭대기 1590 / 옷장 500×555×1300 — B(문 + 서랍 210·210) 2개, A(긴 문) 2개, 문은 왼쪽 경첩·오른쪽 금색 막대 손잡이
          가드(1148×340)·앞 레일은 [색상]으로 오크/화이트, 계단 서랍 앞은 오크. 옷장 안: 봉에 옷(앞뒤로 걸림) · 서랍 상자 */
        const g = new T.Group(), W = M.white, GC = s.col === 1 ? M.white : M.oak, DH = 1.143 / 2, t = .018, UB = 1.3;
        const sideG = (pts, th) => { const sh = new T.Shape(); pts.forEach(([z, y], i) => i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)); const geo = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 12 }); geo.rotateY(Math.PI / 2); return geo; }; /* 옆판 모양([z, y] 윤곽 → x 두께) */
        const bar = (p, x, y0, w, h, zF, mat) => { bx(p, w, h, .012, x, y0, zF + .014, mat); if (w > h) for (const k of [-1, 1]) bx(p, .012, h, .016, x + k * (w / 2 - .03), y0, zF + .008, mat); else for (const yy of [y0 + .03, y0 + h - .042]) bx(p, w, .012, .016, x, yy, zF + .008, mat); }; /* 막대 손잡이(다리 2개로 띄움) */
        /* 침대: 왼 끝판(위 모서리 둥글게) · 오른 끝판(위에 작은 홈 2) · 앞(색상)·뒤 레일 · 바닥판 · 매트리스·이불·베개 · 가드(오른쪽 위 둥글게) + 흰 고정쇠 3 */
        const rc = (z0, z1, r) => [[z0, 0], [z1, 0], [z1, 1.8 - r], [z1 - r * .3, 1.8 - r * .3], [z1 - r, 1.8], [z0 + r, 1.8], [z0 + r * .3, 1.8 - r * .3], [z0, 1.8 - r]];
        mk(g, sideG(rc(-DH, DH, .06), t), W, -1.023, 0, 0);
        { const pts = [[-DH, 0], [DH, 0], [DH, 1.76], [DH - .012, 1.788], [DH - .04, 1.8]]; for (const nz of [.3, -.12]) for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; pts.push([nz + .055 * Math.cos(a), 1.8 - .055 * Math.sin(a)]); } pts.push([-DH + .04, 1.8], [-DH + .012, 1.788], [-DH, 1.76]); mk(g, sideG(pts, t), W, 1.005, 0, 0); }
        bx(g, 2.01, .16, .02, 0, UB, DH - .01, GC); bx(g, 2.01, .16, .02, 0, UB, -DH + .01, W); bx(g, 2.01, .02, 2 * DH - .04, 0, UB, 0, W);
        rb(g, 1.98, .14, 1.08, .04, 0, UB + .02, -.005, M.linen); mk(g, puff(1.32, .07, 1.1), M.duvetQ, .3, UB + .17, -.005); /* 11-23 루프: 얇은 판 → 둥글게 부푼 도톰한 누빔 이불 */ rb(g, .2, .028, 1.11, .012, -.36, UB + .168, -.005, M.linen); { const p = rb(g, .4, .13, .62, .06, -.76, UB + .16, -.1, M.pillow); p.rotation.z = -.22; const c = rb(g, .12, .28, .3, .05, -.5, UB + .17, .2, M.cushSage); c.rotation.set(.12, .3, .32); } /* 11-22 루프: 단색 이불 판 → 누빔 이불 + 머리 쪽 접어 내린 흰 시트 + 끝판에 기댄 베개 + 세이지 작은 쿠션 */
        { const bg = new T.Group(); bg.position.set(-.42, UB + .19, -.33); bg.rotation.y = .45; g.add(bg); /* 11-23 루프 퀄리티업(침대 위 인형): 접은 시트 위 베개 옆에 앉은 캐러멜색 곰 인형 — 통통한 몸·머리 + 밝은 주둥이·검은 코·눈 + 둥근 귀(안쪽 밝게) + 앞으로 뻗은 다리(발바닥 밝게) + 옆으로 벌린 팔 */
          const fur = std(0xb07a4a, .95), lt = std(0xe9cfa6, .9), bk = std(0x1b1a19, .35), S = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = mk(bg, new T.SphereGeometry(r, 18, 12), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
          S(.066, fur, 0, .072, 0, 1, 1.12, .9); S(.05, fur, 0, .178, .004); S(.022, lt, 0, .168, .046, 1, .8, .8); S(.0075, bk, 0, .175, .064); for (const sx of [-1, 1]) { S(.0055, bk, sx * .018, .192, .043); S(.019, fur, sx * .037, .218, -.002, 1, 1, .6); S(.011, lt, sx * .037, .218, .006, 1, 1, .4);
            const a = S(.022, fur, sx * .066, .088, .018, 1, 1.6, 1); a.rotation.z = sx * .5; S(.027, fur, sx * .036, .026, .055, 1, .9, 1.5); S(.017, lt, sx * .036, .026, .092, 1, 1.1, .35); } }
        { const L = 1.148, h = .34, r = .07, sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, h - r); sh.quadraticCurveTo(L, h, L - r, h); sh.lineTo(0, h); sh.closePath(); mk(g, new T.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 10 }), GC, -1.005, UB + .16, DH - t - .002);
          for (const f of [.13, .5, .87]) bx(g, .045, .05, .012, -1.005 + f * L, UB + .135, DH + .006, W); }
        /* 옷장 4(B·B·A·A): 속 빈 몸통 + 문(왼 경첩) + B는 서랍 2 · 안에 봉과 옷 — 11-22 요청: 깊이 555 옷장은 침대 앞이 아니라 뒤쪽(벽 쪽)에 붙임, 앞쪽 약 0.59m는 빈 공간 */
        const zb = -DH + .004, zf = zb + .555, Dc = .537, zc = (zb + zf - t) / 2;
        ['B', 'B', 'A', 'A'].forEach((ty, k) => { const cx = -.75 + k * .5;
          for (const sx of [-1, 1]) bx(g, t, UB - t, Dc, cx + sx * .241, 0, zc, W); bx(g, .5, t, Dc, cx, UB - t, zc, W); bx(g, .464, t, Dc, cx, 0, zc, W); bx(g, .464, UB - 2 * t, .006, cx, t, zb + .003, W);
          const y0 = ty === 'B' ? .422 : .002, dh = UB - .002 - y0, p = opG(g, 'h', -1.75, cx - .248, 0, zf - t, '옷장 문'); bx(p, .496, dh, t, .248, y0, t / 2, W); bar(p, .45, .65, .012, .38, t, M.wrGold);
          bx(g, .464, .012, .012, cx, 1.17, zc, M.chrome); const gl = ty === 'B' ? .6 : .86; for (let i = 0; i < 4; i++) { const x = cx - .15 + i * .1; bx(g, .008, .008, .36, x, 1.155, zc, M.greyD); rb(g, .03, gl, .42, .01, x, 1.16 - gl, zc, M.skCl[(i + k) % 5]); }
          if (ty === 'B') { bx(g, .464, t, Dc, cx, .42, zc, W); for (const yd of [.002, .212]) { const q = opG(g, 's', .4, 0, 0, 0, '옷장 서랍'), bz = zf - t - .24; bx(q, .496, .206, t, cx, yd, zf - t / 2, W); bar(q, cx + .03, yd + .15, .3, .012, zf, M.wrGold);
            bx(q, .434, .01, .48, cx, yd + .03, bz, W); for (const sx of [-1, 1]) bx(q, .01, .14, .48, cx + sx * .212, yd + .03, bz, W); bx(q, .414, .14, .01, cx, yd + .03, bz - .235, W); } } });
        /* 수납계단(침대 오른쪽 끝, 353×1143): 4단 — 앞에서 뒤로 올라감, 단마다 오크 서랍 + 둥근 은색 손잡이, 바깥 옆판은 계단 따라 비스듬히, 흰 손잡이 레일(꼭대기 1590) */
        const SX1 = 1.376, sw = SX1 - t - 1.023, scx = 1.023 + sw / 2;
        for (let i = 0; i < 4; i++) { const y0 = i * .29, zF = DH - i * .2857, zB = -DH, dz = zF - zB, zm = (zF + zB) / 2;
          bx(g, sw, t, dz, scx, y0 + .272, zm, W); if (!i) bx(g, sw, t, dz - t, scx, 0, zm - t / 2, W); bx(g, sw, .254, .01, scx, y0 + t, zB + .005, W);
          const dd = Math.min(.42, dz - .06), p = opG(g, 's', Math.min(.32, dd * .8), 0, 0, 0, '계단 서랍'), bz = zF - t - dd / 2; bx(p, sw - .006, .262, t, scx, y0 + .006, zF - t / 2, M.oak);
          { const kn = mk(p, new T.CylinderGeometry(.016, .016, .018, 18), M.chrome, scx, y0 + .15, zF + .009); kn.rotation.x = Math.PI / 2; }
          bx(p, sw - .04, .01, dd, scx, y0 + .03, bz, W); for (const sx of [-1, 1]) bx(p, .01, .2, dd, scx + sx * (sw / 2 - .025), y0 + .03, bz, W); bx(p, sw - .06, .2, .01, scx, y0 + .03, bz - dd / 2 + .005, W); }
        mk(g, sideG([[DH, 0], [DH, .44], [-.2857, 1.3], [-DH, 1.3], [-DH, 0]], t), W, SX1 - t, 0, 0);
        { const V = T.Vector3, xr = SX1 - .03, c = new T.CatmullRomCurve3([new V(xr, .61, .4), new V(xr, .7, .38), new V(xr, 1.12, 0), new V(xr, 1.5, -.3), new V(xr, 1.59, -.42), new V(xr, 1.5, -.52), new V(xr, 1.3, -.54)]); mk(g, new T.TubeGeometry(c, 48, .012, 10, false), W, 0, 0, 0); }
        return g; } },
    { k: 'desk1200', g: '서재', name: '화이트 책상 1200', model: '화이트 책상 1200×600 (높이 750)', size: '1200 × 600 × 750 (폭×깊이×높이)', note: '흰 상판 · 흰 철제 다리 4 · 상판 밑 테두리', put: 'wall', room: ['알파룸', '침실2'],
      build: () => { /* 요청 치수: 상판 1200×600, 높이 750 — 흰 상판(두께 25) + 모서리 흰 사각 철제 다리 4(아래 회색 수평 발) + 상판 밑 테두리 4변 */
        const g = new T.Group(), W = 1.2, D = .6, H = .75, tt = .025, L = M.pkLeg, lx = W / 2 - .04, lz = D / 2 - .04;
        rb(g, W, tt, D, .004, 0, H - tt, 0, M.pkTop);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { bx(g, .04, H - tt - .012, .04, sx * lx, .012, sz * lz, L); cy(g, .016, .012, sx * lx, 0, sz * lz, M.greyD, 14); }
        for (const sz of [-1, 1]) bx(g, 2 * lx - .04, .05, .02, 0, H - tt - .05, sz * lz, L); for (const sx of [-1, 1]) bx(g, .02, .05, 2 * lz - .04, sx * lx, H - tt - .05, 0, L);
        { /* 11-23 루프 퀄리티업: 비어 있던 상판 위 소품 — 반쯤 연 은색 노트북(검은 자판 줄·트랙패드·어두운 화면 은은한 빛) · 흰 막대형 LED 스탠드(둥근 받침·가는 기둥·아래 따뜻한 빛 띠) · 흰 머그(속 커피·고리 손잡이) · 천 표지 책 2권(종이 단면) */
          const sil = std(0xc9ccd0, .32, .6), kb = cv(256, 96, (x, w, h) => { x.fillStyle = '#26282c'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3d42'; for (let r = 0; r < 5; r++) for (let k = 0; k < 14; k++) { const kw = r === 4 && k > 3 && k < 10 ? 0 : 14; if (kw) x.fillRect(5 + k * 17.7, 5 + r * 18, kw, 14); } x.fillRect(5 + 4 * 17.7, 5 + 4 * 18, 6 * 17.7 - 4, 14); });
          const lp = new T.Group(); lp.position.set(-.12, H, .03); lp.rotation.y = -.08; g.add(lp); rb(lp, .32, .014, .22, .006, 0, 0, 0, sil);
          bx(lp, .275, .0012, .095, 0, .014, -.04, std(0xffffff, .7, 0, { map: kb })); bx(lp, .1, .0008, .062, 0, .014, .06, std(0xd6d8db, .25, .5));
          { const pv = new T.Group(); pv.position.set(0, .012, -.108); pv.rotation.x = -.28; lp.add(pv); rb(pv, .32, .21, .007, .005, 0, 0, 0, sil);
            const sc = mk(pv, new T.PlaneGeometry(.29, .18), std(0x1d2733, .15, 0, { emissive: 0x3d5470, emissiveIntensity: .35 }), 0, .108, .0038); sc.castShadow = false; bx(pv, .32, .012, .0072, 0, 0, .0005, std(0x2a2c30, .5)); } /* 화면 아래 검은 띠 */
          const wt = std(0xf5f5f2, .35), lx2 = .44, lz2 = -.17; cy(lp.parent, .065, .014, lx2, H, lz2, wt, 32); cy(g, .0065, .37, lx2, H + .014, lz2, wt, 12);
          { const hd = rb(g, .3, .014, .045, .006, lx2 - .13, H + .384, lz2 + .01, wt); hd.rotation.y = .12; const led = mk(g, new T.PlaneGeometry(.26, .012), std(0xfff3dc, .3, 0, { emissive: 0xffe2b0, emissiveIntensity: .9 }), lx2 - .13, H + .3835, lz2 + .01); led.rotation.set(Math.PI / 2, 0, -.12); led.castShadow = false; }
          { const mx = .22, mz = .14, mug = mk(g, new T.CylinderGeometry(.04, .037, .095, 28, 1, true), std(0xf7f6f2, .3, 0, { side: T.DoubleSide }), mx, H + .0475, mz); cy(g, .037, .006, mx, H, mz, std(0xf7f6f2, .3), 28); cy(g, .0375, .002, mx, H + .078, mz, std(0x3b2414, .25), 28);
            const hl = mk(g, new T.TorusGeometry(.024, .006, 8, 20, Math.PI), std(0xf7f6f2, .3), mx + .04, H + .05, mz); hl.rotation.z = -Math.PI / 2; mug.castShadow = true; }
          for (const [bw, bc, by, ry] of [[.23, 0x6e7f6a, 0, .05], [.21, 0xc9b79a, .028, -.08]]) { const bk = new T.Group(); bk.position.set(-.45, H + by, -.12); bk.rotation.y = ry; g.add(bk); rb(bk, bw, .026, .16, .003, 0, 0, 0, std(bc, .8)); bx(bk, bw - .012, .02, .004, 0, .003, .079, std(0xf3efe4, .9)); bx(bk, .004, .02, .15, bw / 2 - .002, .003, 0, std(0xf3efe4, .9)); } }
        return g; } },
    { k: 'chair5', g: '서재', name: '바퀴 의자', model: '사무용 바퀴 의자 (메시 등받이 · 팔걸이 · 5발 바퀴)', size: '폭 610 · 깊이 640 · 높이 1020 · 좌판 높이 485', note: '책상을 먼저 놓았으면 그 책상 앞에 책상을 보고 놓임 · [색상]으로 블랙/화이트', put: 'free', room: ['알파룸', '침실2'], clear: .1, cols: ['블랙', '화이트'], near: ['desk1200', 'peak1400'],
      build: s => { /* 5발 받침(끝마다 쌍바퀴) + 가스 실린더 + 좌판 + 살짝 뒤로 젖힌 메시 등받이 + 양 팔걸이 — 앞(+z)이 앉는 사람이 보는 쪽 */
        const [Bm, Se, Me, Pa] = M.chair[s.col || 0], g = new T.Group(); /* 11-23 루프 퀄리티업: 네모 막대 다리 → 가운데서 끝으로 가늘어지며 끝이 살짝 들린 둥근 다리 · 좌판 앞 둥글게 말린 턱(허벅지 닿는 곳) · 좌판 밑 틸트 조절 손잡이 */
        const LEG = (() => { const sh = new T.Shape(); sh.moveTo(.035, .045); sh.lineTo(.285, .05); sh.quadraticCurveTo(.31, .052, .312, .064); sh.quadraticCurveTo(.31, .074, .285, .074); sh.lineTo(.035, .088); sh.closePath(); const e = new T.ExtrudeGeometry(sh, { depth: .032, bevelEnabled: true, bevelThickness: .007, bevelSize: .006, bevelSegments: 2, curveSegments: 6 }); e.translate(0, 0, -.016); return e; })();
        for (let i = 0; i < 5; i++) { const sg = new T.Group(); sg.rotation.y = i * Math.PI * 2 / 5 + Math.PI / 2; g.add(sg);
          mk(sg, LEG, Bm, 0, 0, 0); bx(sg, .03, .035, .05, .3, .03, 0, Bm);
          for (const z of [-.016, .016]) { const w = mk(sg, new T.CylinderGeometry(.028, .028, .016, 16), M.black, .3, .028, z); w.rotation.x = Math.PI / 2; } }
        cy(g, .04, .06, 0, .05, 0, Bm, 20); cy(g, .03, .14, 0, .11, 0, Bm, 20); cy(g, .02, .14, 0, .24, 0, M.chrome, 16); bx(g, .22, .03, .24, 0, .38, 0, Bm); /* 가운데 축 · 실린더 · 좌판 받침 */
        rb(g, .5, .075, .48, .035, 0, .41, .02, Se); /* 좌판 */ { const wf = mk(g, new T.CylinderGeometry(.032, .032, .45, 18), Se, 0, .447, .236); wf.rotation.z = Math.PI / 2; const kn = mk(g, new T.CylinderGeometry(.024, .022, .03, 18), M.black, 0, .372, .135); kn.rotation.x = Math.PI / 2; }
        bx(g, .06, .03, .2, 0, .385, -.15, Bm); bx(g, .06, .26, .03, 0, .4, -.255, Bm); /* 등받이 연결대 */
        { const bg = new T.Group(); bg.position.set(0, .55, -.255); bg.rotation.x = -.12; g.add(bg); for (const sx of [-1, 1]) rb(bg, .035, .48, .03, .012, sx * .2175, 0, 0, Bm); for (const y of [0, .445]) rb(bg, .47, .035, .03, .012, 0, y, 0, Bm); bx(bg, .405, .415, .003, 0, .032, 0, Me).castShadow = false; rb(bg, .34, .07, .03, .015, 0, .08, .02, Se); } /* 11-22 루프: 꽉 막힌 판 → 등받이 테두리 틀(네 변) + 비치는 메시 그물 + 허리 받침 */
        bx(g, .13, .012, .014, .17, .372, .12, Bm); rb(g, .035, .014, .05, .006, .245, .366, .12, M.black); /* 좌판 밑 오른쪽 높이 조절 레버 */
        for (const sx of [-1, 1]) { bx(g, .16, .025, .05, sx * .19, .385, -.03, Bm); bx(g, .03, .23, .05, sx * .27, .41, -.03, Bm); rb(g, .07, .03, .26, .012, sx * .27, .64, -.01, Pa); } /* 팔걸이 */
        return g; } },
    { k: 'cube1000', g: '서재', name: '칸막이 책장', model: '3단 칸막이 책장 1000 (아래 3칸 · 가운데 3칸 · 위 2칸)', size: '1000 × 300 × 1150 (폭×깊이×높이)', note: '창턱(1230) 아래에 들어가는 높이 · 책·천 바구니 포함 · [색상] 화이트/오크', put: 'wall', room: ['알파룸', '침실2'], cols: ['화이트', '오크'],
      build: s => { /* 사용자 스케치: 벽에 붙는 칸막이 책장 — 아래·가운데 줄은 3칸, 위 줄은 2칸(더 높음). 옆판·가로판 18T + 얇은 뒤판, 칸마다 책(높이·두께·색 고정 순서)이나 천 바구니 */
        const g = new T.Group(), W = 1, D = .3, H = 1.15, t = .018, B = s.col === 1 ? M.oakL : M.white, Wi = W - 2 * t, ys = [0, .36, .7, H - t], cells = [3, 3, 2];
        for (const sx of [-1, 1]) bx(g, t, H, D, sx * (W / 2 - t / 2), 0, 0, B); for (const y of ys) bx(g, Wi, t, D - .006, 0, y, .003, B); bx(g, Wi, H - 2 * t, .006, 0, t, -D / 2 + .003, B); /* 옆판 · 가로판 4 · 뒤판 */
        const bh = [.24, .21, .26, .2, .23, .25, .22, .19], bt = [.03, .025, .035, .028, .04, .03, .026, .033]; let bi = 0; const BB = bookBatch();
        const books = (x0, cw, y0, fill) => { let x = x0 + .01; while (x < x0 + cw * fill) { const h = bh[bi % 8], w = bt[bi % 8]; bx(g, w - .002, h, .2, x + w / 2, y0, D / 2 - .13, M.book[bi % 7]); bookDeco(BB, x + w / 2, w, h, y0, D / 2 - .03, bi); x += w; bi++; } }; /* 세워 꽂은 책 */
        const bin = (cx, cw, y0, h, m) => { rb(g, cw - .04, h, D - .07, .015, cx, y0, .02, m); bx(g, .1, .025, .004, cx, y0 + h - .06, D / 2 - .015 + .001, M.greyD); }; /* 천 바구니 + 손잡이 구멍 */
        const plan = [['bin0', 'books', 'bin1'], ['books', 'stack', 'books'], ['books', 'books']];
        cells.forEach((n, r) => { const y0 = ys[r] + t, y1 = ys[r + 1], cw = (Wi - (n - 1) * t) / n;
          for (let k = 1; k < n; k++) bx(g, t, y1 - y0, D - .006, -Wi / 2 + k * (cw + t) - t / 2, y0, .003, B); /* 칸막이 */
          for (let c = 0; c < n; c++) { const x0 = -Wi / 2 + c * (cw + t), cx = x0 + cw / 2, what = plan[r][c];
            if (what === 'books') books(x0, cw, y0, r === 2 ? .55 : .7);
            else if (what.startsWith('bin')) bin(cx, cw, y0, Math.min(.26, y1 - y0 - .05), M.bin[+what[3]]);
            else for (let j = 0; j < 4; j++) bx(g, .22 - j * .015, .03, .17 - j * .01, cx - .02, y0 + j * .031, .02, M.book[(j + 2) % 7]); } }); /* 눕혀 쌓은 책 */
        { /* 11-23 루프 소품 퀄리티업: 비어 있던 책장 윗면 — 흰 도자기 화분 산세베리아(짙은 초록 가로 무늬·노란 테 잎 7장) + 원목 테 사진 액자(뒤로 기대 세움) + 무광 도자기 볼 */
          const L = (pts, n = 28) => new T.LatheGeometry(pts.map(([a, b]) => new T.Vector2(a, b)), n);
          mk(g, L([[0, 0], [.045, 0], [.05, .006], [.056, .1], [.052, .104], [.047, .1], [.047, .09], [0, .09]]), std(0xf1efe9, .35), -.33, H, 0); cy(g, .047, .004, -.33, H + .086, 0, std(0x3b2b1f, .95));
          const sv = cv(64, 128, (x, w, h) => { x.fillStyle = '#2f5a32'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(150,185,120,.45)'; x.lineWidth = 2.5; for (let y = 6; y < h; y += 11) { x.beginPath(); for (let k = 0; k <= 8; k++) { const px = k * 8, py = y + Math.sin(k * 1.3 + y) * 2; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } x.fillStyle = '#d6cc63'; x.fillRect(13, 0, 6, h); x.fillRect(45, 0, 6, h); });
          const lm = std(0xffffff, .55, 0, { map: sv, side: T.DoubleSide });
          for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + (i % 2) * .3, tilt = .06 + (i % 3) * .06, h = .24 + ((i * 5) % 4) * .035, bl = new T.Group(); bl.position.set(-.33 + Math.cos(a) * .016, H + .088, Math.sin(a) * .016); bl.rotation.set(Math.sin(a) * tilt, a * .7, -Math.cos(a) * tilt); g.add(bl);
            const cg = new T.ConeGeometry(.03, h, 4, 1); cg.scale(1, 1, .18); const m = new T.Mesh(cg, lm); m.position.y = h / 2; m.castShadow = true; bl.add(m); }
          const ph = cv(220, 300, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h * .6); gr.addColorStop(0, '#8fb8d8'); gr.addColorStop(1, '#e8eef0'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#f3d58a'; x.beginPath(); x.arc(150, 80, 22, 0, 7); x.fill(); x.fillStyle = '#7da36a'; x.beginPath(); x.moveTo(0, 200); x.quadraticCurveTo(70, 150, 130, 190); x.quadraticCurveTo(180, 165, 220, 185); x.lineTo(220, 300); x.lineTo(0, 300); x.fill(); x.fillStyle = '#5d7f50'; x.fillRect(0, 240, w, 60); });
          const fr = new T.Group(); fr.position.set(.06, H, .02); fr.rotation.y = -.18; g.add(fr); const tl = new T.Group(); tl.rotation.x = -.13; fr.add(tl);
          rb(tl, .14, .19, .014, .004, 0, .002, 0, s.col === 1 ? M.white : M.oakL); mk(tl, new T.PlaneGeometry(.112, .158), std(0xffffff, .6, 0, { map: ph }), 0, .097, .0072); bx(fr, .012, .12, .012, 0, 0, -.045, M.greyD);
          mk(g, L([[0, 0], [.03, 0], [.034, .004], [.06, .03], [.072, .05], [.068, .052], [.056, .036], [.03, .012], [0, .012]], 32), std(0xd9cfc0, .7), .33, H, .01); }
        BB.done(g); return g; } },
    { k: 'shelf5w', g: '서재', name: '5단 책장(폭 500)', model: '흰색 5단 책장 500', size: '500 × 300 × 1800 (폭×깊이×높이)', note: '흰색 · 같은 높이 칸 5 · 로프트 침대 계단 옆 같은 좁은 틈(약 0.55~0.65m)에 쏙 · 책·바구니 포함', put: 'wall', room: ['알파룸', '침실2'],
      build: () => { /* 사용자 스케치: 계단 옆 좁은 틈에 들어가는 키 큰 5단 책장 — 옆판·가로판 18T, 아래 걸레받이(안으로 들어감), 얇은 뒤판, 칸마다 책·천 바구니(고정 순서) */
        const g = new T.Group(), W = .5, D = .3, H = 1.8, t = .018, B = M.white, Wi = W - 2 * t, kick = .05, n = 5, sp = (H - t - kick) / n;
        for (const sx of [-1, 1]) bx(g, t, H, D, sx * (W / 2 - t / 2), 0, 0, B); bx(g, Wi, kick, t, 0, 0, D / 2 - .03, B); bx(g, Wi, H - kick - t, .006, 0, kick, -D / 2 + .003, B);
        const ys = []; for (let k = 0; k < n; k++) ys.push(kick + k * sp); ys.push(H - t); for (const y of ys) bx(g, Wi, t, D - .006, 0, y, .003, B); /* 바닥판 · 선반 4 · 윗판 */
        const bh = [.24, .21, .26, .2, .23, .25, .22, .19], bt = [.03, .025, .035, .028, .04, .03, .026, .033]; let bi = 3; const BB = bookBatch();
        const books = (y0, fill) => { let x = -Wi / 2 + .01; while (x < -Wi / 2 + Wi * fill) { const h = bh[bi % 8], w = bt[bi % 8]; bx(g, w - .002, h, .2, x + w / 2, y0, D / 2 - .13, M.book[bi % 7]); bookDeco(BB, x + w / 2, w, h, y0, D / 2 - .03, bi); x += w; bi++; } };
        const bin = (y0, m) => { rb(g, Wi - .04, .24, D - .07, .015, 0, y0, .02, m); bx(g, .1, .025, .004, 0, y0 + .18, D / 2 - .014, M.greyD); };
        bin(ys[0] + t, M.bin[0]); books(ys[1] + t, .75); books(ys[2] + t, .45); for (let j = 0; j < 3; j++) bx(g, .2 - j * .015, .03, .16 - j * .01, .1, ys[2] + t + j * .031, .02, M.book[(j + 4) % 7]); books(ys[3] + t, .65); bin(ys[4] + t, M.bin[1]);
        { /* 11-23 루프 소품 퀄리티업: 넷째 칸 책 옆 빈자리 — 흰 도자기 화분 스킨답서스(하트 잎이 줄기 따라 칸 앞으로 넘어 늘어짐, 잎 크기·각도는 고정 순서) */
          const y0 = ys[3] + t, px = .16, L = (pts, k = 24) => new T.LatheGeometry(pts.map(([a, b]) => new T.Vector2(a, b)), k);
          mk(g, L([[0, 0], [.04, 0], [.043, .005], [.047, .085], [.044, .088], [.041, .082], [.041, .075], [0, .075]]), std(0xb8694a, .55), px, y0, 0); /* 흰 책장·벽에 묻히지 않게 테라코타 화분 */ cy(g, .041, .004, px, y0 + .072, 0, std(0x3b2b1f, .95));
          const lg = new T.SphereGeometry(1, 10, 6); lg.scale(.022, .004, .028); const lm = [std(0x3f7d3a, .5, 0, { side: T.DoubleSide }), std(0x5e9a45, .5, 0, { side: T.DoubleSide }), std(0x8fb35a, .5, 0, { side: T.DoubleSide })], st = std(0x4f7d3c, .7);
          const vines = [[[px, y0 + .08, 0], [px - .02, y0 + .1, .06], [px - .04, y0 + .07, .13], [px - .05, y0 - .02, .165], [px - .055, y0 - .14, .17]], [[px, y0 + .08, 0], [px + .02, y0 + .095, .07], [px + .035, y0 + .05, .14], [px + .04, y0 - .06, .168], [px + .035, y0 - .2, .172]], [[px, y0 + .08, 0], [px - .01, y0 + .14, -.02], [px - .05, y0 + .16, -.04]], [[px, y0 + .08, 0], [px + .025, y0 + .13, -.01], [px + .04, y0 + .12, .02]]];
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + (k % 2) * .4, l = mk(g, lg, lm[k % 3], px + Math.cos(a) * .032, y0 + .088 + (k % 3) * .012, Math.sin(a) * .032); l.rotation.set(-.35 - (k % 2) * .3, -a + Math.PI / 2, (k % 3 - 1) * .3); } /* 화분 가장자리에 소복한 잎 */
          vines.forEach((V, vi) => { const cv3 = new T.CatmullRomCurve3(V.map(p => new T.Vector3(...p))); mk(g, new T.TubeGeometry(cv3, 16, .0018, 4, false), st, 0, 0, 0);
            const n = vi < 2 ? 9 : 5; for (let i = 1; i <= n; i++) { const u = i / (n + .5), p = cv3.getPointAt(u), tg = cv3.getTangentAt(u), sd = i % 2 ? 1 : -1, l = mk(g, lg, lm[(i + vi) % 3], p.x + sd * .012, p.y, p.z + (vi < 2 ? .006 : 0)); l.rotation.set(-.5 + tg.y * .8 + ((i * 7) % 5) * .08, Math.atan2(tg.x, tg.z) + sd * .9, sd * .35); const s3 = .8 + ((i * 3 + vi) % 4) * .1; l.scale.set(s3, s3, s3); } }); }
        BB.done(g); return g; } },
    { k: 'cindy', g: '침실', name: '확장형 화장대(거울)', model: '한샘 신디 서랍형 원목 확장형 화장대', size: '폭 800~1350 · 높이 1340 · 깊이 400', note: '원목 · 서랍 · 거울 포함 · 선택 후 [확장]', put: 'wall', room: ['침실1', '안방'], ext: true,
      build: s => { /* 11-22 루프 퀄리티업: 모서리 둥근 상판 · 아래로 가늘어지는 둥근 원목 다리 · 서랍 앞 금색 둥근 손잡이 · 상판 위 둥근 쟁반 + 향수병 2(유리 + 금색 뚜껑) */
        const g = new T.Group(), W = .8, D = .4, Ht = .75; rb(g, W, .028, D, .006, 0, Ht - .028, 0, M.natural); bx(g, W - .04, .14, D - .04, 0, Ht - .168, 0, M.natural);
        for (const x of [-.19, .19]) { bx(g, .36, .11, .008, x, Ht - .155, D / 2 - .016, M.oakL); mk(g, new T.SphereGeometry(.011, 14, 10), M.cdBrass, x, Ht - .1, D / 2 + .004); cy(g, .004, .01, x, Ht - .1, D / 2 - .006, M.cdBrass, 8).rotation.x = Math.PI / 2; }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, .02, Ht - .028, sx * (W / 2 - .03), 0, sz * (D / 2 - .03), M.natural, 16, .013);
        cy(g, .095, .012, .22, Ht, .03, M.cream, 36); for (const [x, z, h] of [[.19, .02, .075], [.25, .05, .06]]) { cy(g, .021, h, x, Ht + .012, z, M.cdGlass, 20); cy(g, .011, .022, x, Ht + .012 + h, z, M.cdBrass, 16); }
        bx(g, .52, .59, .024, 0, Ht, -D / 2 + .05, M.natural); bx(g, .46, .53, .004, 0, Ht + .03, -D / 2 + .064, M.mirror);
        if (s.ext) { bx(g, .55, .028, D, W / 2 + .275, Ht - .028, 0, M.natural); for (const sz of [-1, 1]) cy(g, .02, Ht - .028, W / 2 + .52, 0, sz * (D / 2 - .03), M.natural, 16, .013); } return g; } },
    { k: 'styler', g: '드레스룸', name: '스타일러', model: '의류관리기(스타일러)', size: '600 × 620 × 1965 (폭×깊이×높이)', note: '옷방(드레스룸)에 놓임', put: 'wall', room: ['드레스', '옷방'],
      build: () => { /* 11-22 루프 퀄리티업: 몸통 + 살짝 띄운 베이지 유광 문(둘레 어두운 틈) · 오른쪽 세로로 파인 손잡이 홈 · 위쪽 둥근 검은 표시창(청록 불빛 줄) · 맨 위 통풍 틈 · 아래 검은 받침 */
        const g = new T.Group(), W = .6, D = .62, H = 1.965, F = D / 2; bx(g, W - .03, .06, D - .06, 0, 0, -.02, M.black); rb(g, W, H - .06, D - .03, .01, 0, .06, -.015, M.applW);
        bx(g, W - .004, H - .072, .006, 0, .066, F - .028, M.greyD); rb(g, W - .012, H - .084, .025, .008, 0, .072, F - .0125, M.stDoor); /* 문 뒤 어두운 틈 + 문 */
        bx(g, .016, .82, .012, W / 2 - .03, .62, F + .002, M.greyD); bx(g, .004, .82, .013, W / 2 - .021, .62, F + .0025, M.applW); /* 손잡이 홈 + 밝은 가장자리 */
        rb(g, .17, .05, .006, .012, 0, H - .19, F + .003, M.black); bx(g, .1, .006, .002, 0, H - .168, F + .0065, M.display); for (const x of [-.06, .06]) bx(g, .008, .008, .002, x, H - .17, F + .0065, M.display); /* 표시창 */
        for (let i = 0; i < 3; i++) bx(g, W - .16, .004, .003, 0, H - .07 - i * .012, F + .0015, M.greyD); return g; } }, /* 맨 위 통풍 틈 3줄 */
    { k: 'arte', g: '거실', name: '안마의자', model: 'LG 힐링미 오브제컬렉션 아르테 (MH20BR)', size: '753 × 1007 × 1127 (폭×길이×높이)', note: '코지 브라운 · 뒤로 젖힐 공간 약 30cm 띄움', put: 'wall', room: ['거실'], gap: .3,
      build: () => { const g = new T.Group(), W = .753; bx(g, .56, .14, .62, 0, 0, -.05, M.leatherD);
        const arm = new T.Shape(); arm.moveTo(-.44, .14); arm.lineTo(.3, .14); arm.lineTo(.3, .5); arm.quadraticCurveTo(.3, .66, .16, .66); arm.lineTo(-.44, .66); arm.closePath();
        for (const sx of [-1, 1]) { const ag = new T.ExtrudeGeometry(arm, { depth: .15, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 3, curveSegments: 10 }); ag.rotateY(-Math.PI / 2); ag.translate(.075, 0, 0); mk(g, ag, M.leather, sx * (W / 2 - .1), 0, 0); }
        rb(g, .43, .12, .55, .05, 0, .38, 0, M.leatherL); const back = rb(g, .62, .78, .22, .08, 0, .37, -.36, M.leather); back.rotation.x = -.33;
        const head = rb(g, .4, .18, .12, .05, 0, .93, -.34, M.leatherL); head.rotation.x = -.33; for (const sx of [-1, 1]) { const wg = rb(g, .07, .7, .26, .03, sx * .33, .43, -.39, M.leatherD); wg.rotation.x = -.33; }
        for (const sx of [-1, 1]) { const l = rb(g, .2, .55, .17, .06, sx * .112, .0, .36, M.leather); l.position.y = .27; l.rotation.x = -.35; const gr = new T.Mesh(new T.BoxGeometry(.11, .4, .012), M.leatherD); gr.position.set(0, .02, .081); l.add(gr); } /* 11-22 루프 퀄리티업: 다리 받침 안쪽 어두운 발 홈 */
        for (const yy of [-.2, 0, .2]) { const sm = new T.Mesh(new T.BoxGeometry(.54, .006, .012), M.leatherD); sm.position.set(0, yy, .108); back.add(sm); } /* 등받이 박음질 줄 3 */
        rb(g, .045, .02, .12, .008, W / 2 - .1, .685, .12, M.black); bx(g, .028, .002, .03, W / 2 - .1, .705, .15, M.display); return g; } }, /* 오른쪽 팔걸이 위 리모컨(작은 화면) */
    { k: 'robo500', g: '거실', name: '로봇청소기 수납장', model: '벨리카가구 픽스 E0 로봇청소기 다용도 수납장 500 (협탁 겸용)', size: '480 × 810 × 565 (폭×높이×깊이)', note: '아래 칸에 로봇청소기 · 협탁으로도', put: 'wall', room: ['거실', '침실1'],
      build: () => { const g = new T.Group(), W = .48, H = .81, D = .565; bx(g, W, .02, D, 0, H - .02, 0, M.white); for (const sx of [-1, 1]) bx(g, .018, H - .02, D, sx * (W / 2 - .009), 0, 0, M.white); bx(g, W - .036, H - .02, .012, 0, 0, -D / 2 + .006, M.white);
        for (const y of [0, .245, .62]) bx(g, W - .036, .018, D - .012, 0, y, .006, M.white); bx(g, W - .006, .16, .018, 0, .638, D / 2 - .009, M.white); bx(g, .14, .008, .005, 0, .76, D / 2 + .002, M.greyD);
        bx(g, W - .006, .35, .018, 0, .265, D / 2 - .009, M.white); bx(g, .006, .14, .005, W / 2 - .05, .38, D / 2 + .002, M.greyD);
        cy(g, .165, .085, 0, .02, .03, M.robot, 40); cy(g, .167, .02, 0, .03, .03, M.greyD, 40); /* 11-22 루프 퀄리티업: 로봇청소기 — 윗판 안쪽 밝은 원판 · 라이다 탑(어두운 띠) · 앞쪽 범퍼 호 · 청록 표시등 · 뒤 충전 거치대(검은 쐐기 + 초록 불) */
        cy(g, .148, .004, 0, .105, .03, M.robotTop, 40); cy(g, .042, .022, 0, .109, -.03, M.robotTop, 24); cy(g, .043, .006, 0, .116, -.03, M.black, 24);
        { const bp = mk(g, new T.CylinderGeometry(.169, .169, .05, 32, 1, true, -Math.PI / 2.4, Math.PI / 1.2), M.bumper, 0, .055, .03); } bx(g, .03, .004, .008, 0, .109, .14, M.display);
        bx(g, .22, .1, .075, 0, .02, -.215, M.robot); bx(g, .012, .012, .004, .07, .09, -.176, M.robotLed);
        { /* 11-23 루프 소품 퀄리티업: 협탁으로 쓸 때 비어 있던 윗면 — 세이지 유약 도자기 받침 스탠드(놋쇠 목 + 아래가 넓은 리넨 갓, 은은한 빛) + 눕혀 쌓은 책 2권(종이 단면) */
          const L = (pts, n = 28) => new T.LatheGeometry(pts.map(([a, b]) => new T.Vector2(a, b)), n), y0 = H, lx = -.1, lz = -.11;
          mk(g, L([[0, 0], [.035, 0], [.06, .03], [.068, .075], [.058, .13], [.03, .165], [.014, .175], [0, .175]], 32), std(0xa9b8a0, .25), lx, y0, lz);
          cy(g, .009, .05, lx, y0 + .175, lz, std(0xc9a45c, .35, .7), 12); cy(g, .004, .1, lx, y0 + .225, lz, std(0xc9a45c, .35, .7), 8);
          mk(g, new T.CylinderGeometry(.085, .115, .16, 36, 1, true), std(0xf4efe4, .9, 0, { side: T.DoubleSide, emissive: 0xffe6bf, emissiveIntensity: .25 }), lx, y0 + .3, lz);
          for (const [k, w, h, d, col, ry] of [[0, .2, .028, .27, 0x5b6f86, .12], [1, .17, .022, .23, 0xd8c7a6, -.08]]) { const b = new T.Group(); b.position.set(.1, y0 + (k ? .028 : 0), .08); b.rotation.y = ry; g.add(b); const cm = std(col, .8); bx(b, w, .003, d, 0, 0, 0, cm); bx(b, w, .003, d, 0, h - .003, 0, cm); bx(b, .004, h - .006, d, -w / 2 + .002, .003, 0, cm); bx(b, w - .012, h - .006, d - .01, .002, .003, 0, std(0xf3efe4, .9)); } /* 표지 위·아래 판 + 책등, 종이 묶음은 안쪽으로 들여 단면이 보이게 */ }
        return g; } },
  ];
  const BY = Object.fromEntries(CAT.map(c => [c.k, c]));

  /* ───── 상태 ───── */
  const base = movables.slice(), added = [], gone = [];
  /* 가구의 문·서랍 여닫기: 페이지 문 클릭(E·탭) 목록(doorMeshes)에 스위치처럼(isSwitch → toggle) 끼워 넣음 — 페이지 문 목록(doors)은 건드리지 않음. 가구를 지우거나 다시 만들면 목록에서 뺌 */
  const DM = o.doorMeshes || null, opMoving = new Set(); let opRaf = 0, opT = 0, opTick = 0;
  const disposeG = g => g.traverse(m => { if (!m.isMesh) return; m.geometry.dispose(); if (DM && m.userData.door) { const i = DM.indexOf(m); if (i >= 0) DM.splice(i, 1); } });
  function opStep(now) { const dt = Math.min(.05, (now - (opT || now)) / 1000); opT = now;
    for (const p of opMoving) { const s = p.userData.opS, diff = s.target - s.cur; if (Math.abs(diff) < .002) { s.cur = s.target; opMoving.delete(p); } else s.cur += diff * Math.min(1, dt * 7);
      if (p.userData.op.k === 's') p.position.z = s.z0 + s.cur * p.userData.op.v; else p.rotation.y = s.cur * p.userData.op.v; }
    if (++opTick % 3 === 0 || !opMoving.size) renderer.shadowMap.needsUpdate = true; /* 그림자도 따라가게(3프레임마다 + 멈출 때) */
    if (opMoving.size) opRaf = requestAnimationFrame(opStep); else { opRaf = 0; opT = 0; } }
  function wireOps(inner) { if (!DM) return; inner.traverse(p => { if (!p.userData.op) return; p.userData.opS = { cur: 0, target: 0, z0: p.position.z };
    const d = { isSwitch: true, name: p.userData.op.n || '서랍', toggle() { const s = p.userData.opS; s.target = s.target ? 0 : 1; opMoving.add(p); if (!opRaf) opRaf = requestAnimationFrame(opStep); } };
    p.traverse(m => { if (m.isMesh) { m.userData.door = d; DM.push(m); } }); }); }
  const vis = g => { for (let p = g; p; p = p.parent) if (!p.visible) return false; return true; };
  function makeItem(k, st) {
    const C = BY[k]; if (!C) return null; const s = Object.assign({ ext: false, flip: false, col: 0 }, st || {});
    const g = new T.Group(); g.userData = { name: C.name, movable: true, solid: false, cat: k, st: s, home: { x: 0, z: 0, r: 0 } };
    const inner = C.build(s); if (s.flip) inner.scale.x = -1; g.add(inner); g.userData.inner = inner; wireOps(inner); return g;
  }
  function rebuild(g) { const C = BY[g.userData.cat], old = g.userData.inner; g.remove(old); disposeG(old); const inner = C.build(g.userData.st); if (g.userData.st.flip) inner.scale.x = -1; g.add(inner); g.userData.inner = inner; wireOps(inner); o.select(g); refresh(); }
  /* 로컬 바닥 크기(회전 0): 폭·깊이·중심 어긋남 */
  function foot(g) { const r = g.rotation.y, p = g.position.clone(); g.rotation.y = 0; g.position.set(0, 0, 0); g.updateMatrixWorld(true); const b = new T.Box3().setFromObject(g.userData.inner || g); g.rotation.y = r; g.position.copy(p); g.updateMatrixWorld(true);
    return { w: b.max.x - b.min.x, d: b.max.z - b.min.z, h: b.max.y, cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2 }; }

  /* ───── 높이 지도: 방 위에서 곧장 내려다본 깊이 → 칸마다 물체 높이(바닥 0)
     높이 2.5m에서(벽·키 큰 장까지) / 1.3m에서(위 수납장 밑 조리대 면) 두 가지 ───── */
  const RES = .02, CAM_H = 1.3, depthMat = new T.MeshDepthMaterial(); let highMeshes = null;
  function heightMap(x0, x1, z0, z1, hide, camH = 2.5) {
    const FAR = camH + .05, W = Math.max(8, Math.min(512, Math.ceil((x1 - x0) / RES))), H = Math.max(8, Math.min(512, Math.ceil((z1 - z0) / RES)));
    const cam = new T.OrthographicCamera(-(x1 - x0) / 2, (x1 - x0) / 2, (z1 - z0) / 2, -(z1 - z0) / 2, 0, FAR); cam.position.set((x0 + x1) / 2, camH, (z0 + z1) / 2); cam.up.set(0, 0, -1); cam.lookAt((x0 + x1) / 2, 0, (z0 + z1) / 2); cam.updateMatrixWorld();
    const rt = new T.WebGLRenderTarget(W, H), buf = new Uint8Array(W * H * 4), hidden = [];
    if (!highMeshes) { highMeshes = []; const bb = new T.Box3(); scene.updateMatrixWorld(true); scene.traverse(m => { if (!m.isMesh || !m.geometry) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); if (bb.min.y > 2.15) highMeshes.push(m); }); } /* 천장·지붕 판·천장 조명(전체 보기에서도 그림자용으로 남은 것) */
    scene.traverse(m => { if ((m.isLine || m.isLineSegments || m.isSprite || m.isPoints) && m.visible) { m.visible = false; hidden.push(m); } }); for (const h of (hide || []).concat(highMeshes)) if (h.visible) { h.visible = false; hidden.push(h); }
    const bg = scene.background, cc = renderer.getClearColor(new T.Color()), ca = renderer.getClearAlpha(), prevRT = renderer.getRenderTarget();
    scene.background = null; scene.overrideMaterial = depthMat; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    renderer.setRenderTarget(prevRT); renderer.setClearColor(cc, ca); scene.overrideMaterial = null; scene.background = bg; for (const h of hidden) h.visible = true; rt.dispose();
    const hm = new Float32Array(W * H); for (let i = 0; i < W * H; i++) { const c = buf[i * 4] / 255; hm[i] = c <= 0 ? -1 : camH - (1 - c) * FAR; }
    return { W, H, x0, x1, z0, z1, at(x, z) { const px = Math.floor((x - x0) / (x1 - x0) * W), py = Math.floor((z1 - z) / (z1 - z0) * H); if (px < 0 || py < 0 || px >= W || py >= H) return 9; return hm[py * W + px]; } };
  }
  /* 회전된 직사각(중심 c, 폭 w·깊이 d, 회전 r) 안의 점들 */
  function cells(hm, cx, cz, w, d, r, step = .04) { const out = [], ca = Math.cos(r), sa = Math.sin(r); for (let u = -w / 2 + step / 2; u < w / 2; u += step) for (let v = -d / 2 + step / 2; v < d / 2; v += step) out.push(hm.at(cx + u * ca + v * sa, cz - u * sa + v * ca)); return out; }
  const roomOf = keys => { for (const k of keys) { const r = rooms.find(r => r.n && r.n.includes(k)); if (r) return r; } return rooms.find(r => r.n === '거실') || rooms[0]; };

  function place(g, C) {
    const f = foot(g), R = roomOf(C.room), rx0 = WX(R.x0), rx1 = WX(R.x1), rz0 = WZ(R.z0), rz1 = WZ(R.z1), pad = .45;
    const hm = heightMap(rx0 - pad, rx1 + pad, rz0 - pad, rz1 + pad, [g]), WALL = 1.8; const mid = [(rx0 + rx1) / 2, (rz0 + rz1) / 2];
    const setAt = (cx, cz, r, y = 0) => { const ca = Math.cos(r), sa = Math.sin(r); g.rotation.y = r; g.position.set(cx - (f.cx * ca + f.cz * sa), y, cz - (-f.cx * sa + f.cz * ca)); };
    let best = null; const consider = (score, cx, cz, r, y) => { if (!best || score < best.s) best = { s: score, cx, cz, r, y }; };
    /* 문 앞 비우기: 보이는 문(방문·수납장 문)의 개구부에서 벽과 직각 방향으로 0.8m 안에는 가구를 놓지 않게 점수 벌점 */
    const DZ = (o.doors || []).filter(d => d.box && d.pivot && vis(d.pivot)).map(d => { const b = d.box, alongX = b.maxX - b.minX > b.maxZ - b.minZ, ex = alongX ? .03 : .8, ez = alongX ? .8 : .03; return [b.minX - ex, b.maxX + ex, b.minZ - ez, b.maxZ + ez]; });
    const doorPen = (cx, cz, hw, hd) => DZ.some(z => cx + hw > z[0] && cx - hw < z[1] && cz + hd > z[2] && cz - hd < z[3]) ? 1 : 0;
    if (C.near) { const dk = added.slice().reverse().find(a => a !== g && C.near.includes(a.userData.cat) && vis(a)); /* 의자: 가장 최근에 놓은 책상 앞 0.3m에 책상을 보고 */
      if (dk) { const fd = foot(dk), r = dk.rotation.y, ca = Math.cos(r), sa = Math.sin(r), lx = fd.cx, lz = fd.cz + fd.d / 2 + .3; setAt(dk.position.x + lx * ca + lz * sa, dk.position.z - lx * sa + lz * ca, r + Math.PI); return true; } }
    if (C.put === 'top') { /* 렌지대 칸 먼저 → 조리대 위(위 수납장 밑까지 보이게 1.3m 높이 지도) */
      const lowM = heightMap(rx0 - pad, rx1 + pad, rz0 - pad, rz1 + pad, [g], CAM_H);
      for (const h of added) { const HC = BY[h.userData.cat]; if (!HC.slots || h === g) continue; const ff = foot(g); for (const sl of HC.slots) { if (ff.w > sl[3] || ff.h > sl[4] || ff.d > sl[5]) continue; const taken = added.some(a => a !== g && BY[a.userData.cat].put === 'top' && a.position.distanceTo(slotWorld(h, sl)) < .2); if (taken) continue; const p = slotWorld(h, sl); g.rotation.y = h.rotation.y; g.position.copy(p); return true; } }
      for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const ww = Math.abs(Math.cos(r)) > .5 ? f.w : f.d, dd = Math.abs(Math.cos(r)) > .5 ? f.d : f.w;
        for (let cx = rx0 + ww / 2; cx <= rx1 - ww / 2; cx += .05) for (let cz = rz0 + dd / 2; cz <= rz1 - dd / 2; cz += .05) {
          const c = cells(lowM, cx, cz, f.w - .02, f.d - .02, r, .05); let lo = 9, hi = -9; for (const v of c) { lo = Math.min(lo, v); hi = Math.max(hi, v); } if (lo < .6 || hi > 1.25 || hi - lo > .015) continue;
          const back = cells(hm, cx - Math.sin(r) * (f.d / 2 + .12), cz - Math.cos(r) * (f.d / 2 + .12), f.w, .06, r); const wallish = back.filter(v => v > WALL).length / back.length; /* 등 뒤가 벽 */
          consider(-wallish * 2 + Math.hypot(cx - mid[0], cz - mid[1]) * .05, cx, cz, r, hi); } }
      if (best) { setAt(best.cx, best.cz, best.r, best.y + .002); return true; }
    }
    if (C.put === 'wall' || C.put === 'top') { /* 벽에 등 대기(앞으로 조금 여유) */
      const gap = (C.gap || 0) + .015, sides = [[0, rz0, 0], [Math.PI, rz1, 0], [Math.PI / 2, rx0, 1], [-Math.PI / 2, rx1, 1]];
      for (const [r, wl, ax] of sides) { const along = ax === 0 ? [rx0, rx1] : [rz0, rz1], sgn = (r === 0 || r === Math.PI / 2) ? 1 : -1, fx = Math.sin(r), fz = Math.cos(r);
        const P2 = (t, k) => ax === 0 ? [t, wl + sgn * k] : [wl + sgn * k, t];
        for (let t = along[0] + f.w / 2 + .03; t <= along[1] - f.w / 2 - .03; t += .05) {
          /* 벽 면 찾기(방 경계는 벽 중심선): 경계가 벽이면 안쪽으로 첫 빈 바닥까지, 비어 있으면 바깥쪽으로 첫 벽까지 */
          let face = 0; if (hm.at(...P2(t, 0)) > WALL) { face = null; for (let k = 0; k <= .3; k += .01) { const v = hm.at(...P2(t, k)); if (v < .06 || (v > f.h + .03 && v < WALL)) { face = k; break; } } if (face === null) continue; } /* 가구보다 높이 떠 있는 창턱 밑은 빈 바닥으로 봄 → 낮은 가구는 창 아래 벽에 바짝 */
          else { for (let k = 0; k >= -.15; k -= .01) if (hm.at(...P2(t, k)) > WALL) { face = k + .01; break; } }
          const off = wl + sgn * (face + gap + f.d / 2), cx = ax === 0 ? t : off, cz = ax === 0 ? off : t;
          const [opx, opz] = P2(t, face + gap + .05), over = cells(hm, opx, opz, f.w - .03, .1, r).filter(v => v > f.h + .03 && v < WALL).length; /* 등 쪽 10cm 안의 높은 창턱(가구 위로 지나감)은 겹침에서 뺌 */
          const occ = Math.max(0, cells(hm, cx + fx * .05, cz + fz * .05, f.w - .03, f.d + .08, r).filter(v => v > .06).length - over); /* 앞 10cm 여유 포함 */
          const [bpx, bpz] = P2(t, face - .03), behind = cells(hm, bpx, bpz, f.w - .03, .03, r), wallFrac = behind.filter(v => v > WALL).length / behind.length;
          consider(occ * 5 + (1 - wallFrac) * 40 + Math.abs(t - (along[0] + along[1]) / 2) * .3 + doorPen(cx, cz, (ax === 0 ? f.w : f.d) / 2, (ax === 0 ? f.d : f.w) / 2) * 30, cx, cz, r, 0); } }
      if (best && best.s < 20) { setAt(best.cx, best.cz, best.r); return true; } best = null;
    }
    /* 빈 바닥(식탁 등): 둘레 여유까지 비어 있는 곳 중 방 가운데에 가까운 곳 */
    const cl = C.clear || .1;
    for (const r of [0, Math.PI / 2]) { const ww = r ? f.d : f.w, dd = r ? f.w : f.d; for (let cx = rx0 + ww / 2 + .05; cx <= rx1 - ww / 2 - .05; cx += .1) for (let cz = rz0 + dd / 2 + .05; cz <= rz1 - dd / 2 - .05; cz += .1) {
      const occ = cells(hm, cx, cz, f.w + 2 * cl, f.d + 2 * cl, r, .05).filter(v => v > .06).length; consider(occ + Math.hypot(cx - mid[0], cz - mid[1]) * .8 + doorPen(cx, cz, ww / 2, dd / 2) * 60, cx, cz, r, 0); } }
    if (best) setAt(best.cx, best.cz, best.r); else setAt(mid[0], mid[1], 0);
    return true;
  }
  function slotWorld(h, sl) { const v = new T.Vector3(sl[0] * (h.userData.st.flip ? -1 : 1), sl[1], sl[2]); return v.applyAxisAngle(new T.Vector3(0, 1, 0), h.rotation.y).add(h.position); }

  /* ───── 추가·삭제·복원·저장 ───── */
  function add(k, st, pos, quiet) {
    const g = makeItem(k, st); if (!g) return null; furn.add(g); movables.push(g); added.push(g);
    if (pos) { g.position.set(pos[0], pos[1] || 0, pos[2]); g.rotation.y = pos[3] || 0; } else place(g, BY[k]);
    g.userData.home = { x: g.position.x, z: g.position.z, r: g.rotation.y };
    if (!quiet) { o.select(g); changed(); } return g;
  }
  function remove(g) {
    const i = movables.indexOf(g); if (i >= 0) movables.splice(i, 1); if (o.getSelected() === g) o.select(null);
    if (g.userData.cat) { furn.remove(g); disposeG(g); added.splice(added.indexOf(g), 1); } else { g.visible = false; if (!gone.includes(g)) gone.push(g); }
    changed();
  }
  function restore(g) { g.visible = true; if (!movables.includes(g)) movables.push(g); gone.splice(gone.indexOf(g), 1); o.select(g); changed(); }
  function resetAll() { for (const g of added.slice()) { furn.remove(g); disposeG(g); const i = movables.indexOf(g); if (i >= 0) movables.splice(i, 1); } added.length = 0;
    for (const g of gone.slice()) { g.visible = true; if (!movables.includes(g)) movables.push(g); } gone.length = 0;
    for (const g of base) { g.position.x = g.userData.home.x; g.position.z = g.userData.home.z; g.rotation.y = g.userData.home.r; } o.select(null);
    if (KEY && o.applyPreset) { restoring = true; try { o.applyPreset(); } finally { restoring = false; } for (const g of base) { g.position.x = g.userData.home.x; g.position.z = g.userData.home.z; g.rotation.y = g.userData.home.r; } } /* 우리 집: 옵션도 견본주택 구성으로 */
    try { if (KEY) localStorage.removeItem(KEY); } catch (e) {} changed(true); }
  function save() { if (!KEY || restoring) return; try { const mv = {}; base.forEach((g, i) => { const h = g.userData.home; if (Math.abs(g.position.x - h.x) > .001 || Math.abs(g.position.z - h.z) > .001 || Math.abs(g.rotation.y - h.r) > .001) mv[i] = [+g.position.x.toFixed(3), +g.position.z.toFixed(3), +g.rotation.y.toFixed(4)]; });
    const data = { v: 2, opts: o.sel ? Object.assign({}, o.sel) : null, at: Date.now(), add: added.map(g => ({ k: g.userData.cat, p: [+g.position.x.toFixed(3), +g.position.y.toFixed(3), +g.position.z.toFixed(3), +g.rotation.y.toFixed(4)], st: g.userData.st })), del: gone.map(g => base.indexOf(g)).filter(i => i >= 0), mv };
    localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function changed(noSave) { if (!noSave) save(); o.rebuildFurnColliders(); renderer.shadowMap.needsUpdate = true; o.queueBake(); refresh(); }
  /* 저장된 우리 집 되살리기: 옵션 먼저(옵션에 따라 가구 기본 자리가 바뀜) → 옮긴 자리·치운 가구·추가 가구 */
  let loaded = null; restoring = true;
  try { const d = KEY ? JSON.parse(localStorage.getItem(KEY) || 'null') : null; if (d && d.v === 2) { loaded = d;
    if (d.opts && o.sel && o.applyOptions) { for (const k in o.sel) o.sel[k] = k in d.opts ? d.opts[k] : null; o.applyOptions(); }
    for (const [i, p] of Object.entries(d.mv || {})) { const g = base[+i]; if (g) { g.position.x = p[0]; g.position.z = p[1]; g.rotation.y = p[2]; } }
    for (const i of d.del || []) { const g = base[i]; if (g) { g.visible = false; gone.push(g); const j = movables.indexOf(g); if (j >= 0) movables.splice(j, 1); } }
    for (const a of d.add || []) if (BY[a.k]) add(a.k, a.st, a.p, true);
    o.rebuildFurnColliders(); renderer.shadowMap.needsUpdate = true; o.queueBake(); } } catch (e) { console.warn('home load', e); }
  restoring = false; window.__homeSave = () => save(); /* 옵션을 바꿀 때마다(페이지의 applyOptions 끝에서) 저장 */

  /* ───── 화면: 왼쪽 인테리어 목록 + 아래 도구 버튼 ───── */
  const css = document.createElement('style'); css.textContent = `
#intPanel{left:max(16px,env(safe-area-inset-left,0px));top:var(--int-top,230px);bottom:calc(76px + env(safe-area-inset-bottom,0px));width:292px;display:flex;flex-direction:column;z-index:5;overflow:hidden}
#intPanel[hidden]{display:none}
#intPanel .ih{display:flex;align-items:center;gap:8px;padding:12px 12px 8px 14px;border-bottom:1px solid var(--line)}
#intPanel .ih h2{font:600 15px var(--display,var(--body));margin:0;flex:1}
#intPanel .ih button{border:0;background:transparent;color:var(--muted);font-size:14px;width:28px;height:28px;border-radius:8px;cursor:pointer}
.ihelp b{color:var(--ink)}
#homeToast{left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);padding:9px 14px;font-size:12.5px;color:var(--ink);z-index:7;transition:opacity .4s;max-width:calc(100vw - 32px)}
#intPanel .ihelp{font-size:11.5px;color:var(--muted);line-height:1.45;padding:8px 14px 4px}
#intList{overflow:auto;padding:4px 8px 10px;flex:1}
#intList h3{font:600 12px var(--body);color:var(--muted);margin:10px 6px 4px;letter-spacing:.02em}
.icard{display:flex;gap:10px;align-items:center;padding:7px 6px;border-radius:10px}
.icard:hover{background:var(--accent-soft)}
.icard img,.icard .ph{width:64px;height:48px;flex:none;border-radius:8px;background:#f1efe9;object-fit:contain}
.icard .it{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.icard b{font:600 13px var(--body);color:var(--ink)}
.icard small{font-size:10.5px;color:var(--muted);line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.icard .add{flex:none;border:0;background:var(--accent);color:var(--accent-ink,#fff);font:600 12px var(--body);padding:6px 10px;border-radius:8px;cursor:pointer}
.irow{display:flex;align-items:center;gap:6px;padding:5px 6px;font-size:12.5px;border-radius:8px}
.irow span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.irow button{border:1px solid var(--line);background:var(--panel-solid,#fff);color:var(--ink);font:500 11.5px var(--body);padding:3px 8px;border-radius:7px;cursor:pointer}
.ireset{margin:10px 6px 2px;width:calc(100% - 12px);border:1px solid var(--line);background:transparent;color:var(--muted);font:500 12px var(--body);padding:7px;border-radius:9px;cursor:pointer}
#intPanel button:focus-visible,.tool button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tool{flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 32px)}
.tool button{white-space:nowrap}
.tool #delBtn{color:#b42318;border-color:rgba(180,35,24,.35)}
.tool #intOpen{background:var(--accent);color:var(--accent-ink,#fff);border-color:var(--accent)}
@media (max-width:760px){
  #intPanel{left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));width:auto;top:calc(60px + env(safe-area-inset-top,0px));bottom:auto;max-height:calc(100% - 300px)}
}`;
  document.head.appendChild(css);
  const homeName = o.home ? o.home.replace(/^(\d+)-(T?\d+)$/i, '$1동 $2호') : '';
  const P = document.createElement('div'); P.id = 'intPanel'; P.className = 'panel'; P.hidden = true; P.setAttribute('role', 'region'); P.setAttribute('aria-label', '인테리어');
  P.innerHTML = `<div class="ih"><h2>인테리어</h2><button type="button" id="intClose" aria-label="인테리어 목록 닫기" title="닫기">✕</button></div>
  <div class="ihelp">[추가]를 누르면 알맞은 방에 놓여요. 놓인 가구는 눌러서 끌어 옮기고, 아래 도구로 회전·삭제해요.<br>${KEY ? `<b>${homeName}</b>의 옵션·가구 배치는 이 브라우저에 자동 저장돼 다음에 열면 그대로 나와요.` : '타입 둘러보기는 저장되지 않아요 — ‘우리 집 들어가기’로 들어오면 동·호별로 저장돼요.'}</div><div id="intList"></div>`;
  (document.getElementById('stage') || document.body).appendChild(P);
  const list = P.querySelector('#intList'), imgs = {};
  const groups = [...new Set(CAT.map(c => c.g))];
  function refresh() {
    let h = ''; for (const gname of groups) { h += `<h3>${gname}</h3>`; for (const C of CAT.filter(c => c.g === gname)) h += `<div class="icard"><img data-k="${C.k}" alt="" ${imgs[C.k] ? `src="${imgs[C.k]}"` : ''}><div class="it"><b>${C.name}</b><small title="${C.model} · ${C.size}">${C.model}<br>${C.size}</small></div><button class="add" type="button" data-add="${C.k}" aria-label="${C.name} 추가">추가</button></div>`; }
    if (added.length) { h += `<h3>추가한 가구 ${added.length}</h3>`; added.forEach((g, i) => { h += `<div class="irow"><span data-sel="a${i}" title="선택">${g.userData.name}</span><button type="button" data-del="a${i}">삭제</button></div>`; }); }
    if (gone.length) { h += `<h3>치운 기존 가구 ${gone.length}</h3>`; gone.forEach((g, i) => { h += `<div class="irow"><span>${g.userData.name}</span><button type="button" data-res="${i}">되돌리기</button></div>`; }); }
    h += `<button class="ireset" type="button" id="intReset">${KEY ? '처음 상태로(견본주택 옵션·가구로, 저장 지움)' : '처음 상태로(추가 가구 빼고, 치운 가구·자리 되돌림)'}</button>`;
    list.innerHTML = h;
  }
  list.addEventListener('click', e => { const b = e.target.closest('[data-add],[data-del],[data-res],[data-sel],#intReset'); if (!b) return;
    if (b.dataset.add) { add(b.dataset.add); if (innerWidth <= 760) P.hidden = true; }
    else if (b.dataset.del) remove(added[+b.dataset.del.slice(1)]);
    else if (b.dataset.res) restore(gone[+b.dataset.res]);
    else if (b.dataset.sel) o.select(added[+b.dataset.sel.slice(1)]);
    else if (b.id === 'intReset') { if (confirm(KEY ? homeName + '의 저장된 옵션·가구 배치를 지우고 견본주택 구성으로 되돌릴까요?' : '추가한 가구를 모두 빼고, 치운 가구와 옮긴 자리를 처음대로 되돌릴까요?')) resetAll(); } });
  P.querySelector('#intClose').addEventListener('click', () => { P.hidden = true; userClosed = true; });
  refresh();
  if (loaded) { const t = document.createElement('div'); t.id = 'homeToast'; t.className = 'panel'; t.setAttribute('role', 'status'); const n = loaded.add ? loaded.add.length : 0; t.textContent = `${homeName} — 저장해 둔 옵션·가구 배치를 불러왔어요` + (n ? ` (추가 가구 ${n}개)` : ''); (document.getElementById('stage') || document.body).appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 4500); }

  /* 미리보기 그림: 따로 작은 렌더러로 한 번만 */
  let thumbsDone = false;
  function thumbs() { if (thumbsDone) return; thumbsDone = true;
    try { const R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(160, 120); R.setPixelRatio(1); R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
      const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0xa89f90, 1.6)); const dl = new T.DirectionalLight(0xffffff, 2.4); dl.position.set(2, 4, 3); sc.add(dl); const cam = new T.PerspectiveCamera(28, 4 / 3, .05, 50);
      for (const C of CAT) { const g = C.build({ ext: false, flip: false, col: 0 }); sc.add(g); const b = new T.Box3().setFromObject(g), c = b.getCenter(new T.Vector3()), r = b.getSize(new T.Vector3()).length() / 2;
        cam.position.copy(c).add(new T.Vector3(.75, .55, 1.25).normalize().multiplyScalar(r / Math.sin(14 * Math.PI / 180) * .92)); cam.lookAt(c); R.render(sc, cam); imgs[C.k] = R.domElement.toDataURL('image/png'); sc.remove(g); disposeG(g); }
      R.dispose(); R.forceContextLoss(); } catch (e) { console.warn('thumbs', e); }
    refresh(); }

  /* 아래 도구 막대: 15° 회전·삭제·확장·좌우·색상·인테리어 열기 */
  const tool = document.getElementById('tool'), rotBtn = document.getElementById('rotBtn'), resetBtn = document.getElementById('resetBtn');
  const tb = (id, txt, title) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.textContent = txt; if (title) b.title = title; return b; };
  const r15 = tb('rot15Btn', '15° 회전', '시계 방향으로 15°'), del = tb('delBtn', '삭제', '선택한 가구 삭제(Delete 키)'), ext = tb('extBtn', '확장'), flp = tb('flipBtn', '좌우 바꾸기', '좌측형/우측형'), col = tb('colBtn', '색상'), opn = tb('intOpen', '인테리어');
  rotBtn.after(r15, del, ext, flp, col); tool.insertBefore(opn, tool.firstChild.nextSibling);
  const sel = () => o.getSelected();
  r15.addEventListener('click', () => { const g = sel(); if (!g) return; g.rotation.y -= Math.PI / 12; o.select(g); changed(); });
  del.addEventListener('click', () => { const g = sel(); if (g) remove(g); });
  ext.addEventListener('click', () => { const g = sel(); if (!g || !g.userData.cat) return; g.userData.st.ext = !g.userData.st.ext; rebuild(g); changed(); });
  flp.addEventListener('click', () => { const g = sel(); if (!g || !g.userData.cat) return; g.userData.st.flip = !g.userData.st.flip; rebuild(g); changed(); });
  col.addEventListener('click', () => { const g = sel(); if (!g || !g.userData.cat) return; const C = BY[g.userData.cat]; g.userData.st.col = ((g.userData.st.col || 0) + 1) % C.cols.length; rebuild(g); changed(); });
  opn.addEventListener('click', () => { P.hidden = !P.hidden; if (!P.hidden) { thumbs(); if (innerWidth <= 760) { const hc = document.getElementById('headClose'), hd = document.getElementById('head'); if (hc && hd && !hd.classList.contains('closed')) hc.click(); } } });
  rotBtn.addEventListener('click', () => setTimeout(() => changed(), 0)); resetBtn.addEventListener('click', () => setTimeout(() => changed(), 0));
  addEventListener('keydown', e => { if (o.getMode() !== 'doll' || !sel() || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(sel()); } });

  /* 끌어 옮길 때: 조리대 위 물건은 아래 면 높이를 따라가고, 렌지대 칸 위면 그 칸에 쏙 */
  const ray = new T.Raycaster(), DOWN = new T.Vector3(0, -1, 0), O = new T.Vector3();
  function dropY(g) { const C = BY[g.userData.cat]; if (!C || C.put !== 'top') return;
    for (const h of added) { const HC = BY[h.userData.cat]; if (!HC.slots || h === g) continue; const f = foot(h), lp = g.position.clone().sub(h.position).applyAxisAngle(new T.Vector3(0, 1, 0), -h.rotation.y);
      const sl = HC.slots[0], ff = foot(g); if (ff.w <= sl[3] && ff.h <= sl[4] && ff.d <= sl[5] && Math.abs(lp.x - f.cx) < f.w / 2 && Math.abs(lp.z - f.cz) < f.d / 2) { const p = slotWorld(h, HC.slots[0]); g.position.copy(p); g.rotation.y = h.rotation.y; return; } }
    O.set(g.position.x, CAM_H, g.position.z); ray.set(O, DOWN); ray.far = CAM_H + .1; let y = 0;
    for (const hit of ray.intersectObjects([fixed, furn], true)) { let mine = false; for (let p = hit.object; p; p = p.parent) if (p === g) { mine = true; break; } if (mine || !vis(hit.object) || !hit.face || hit.face.normal.y < .3) continue; if (hit.point.y > y) y = hit.point.y; break; }
    g.position.y = y > .05 ? y + .002 : 0; }
  canvas.addEventListener('pointermove', e => { if (!(e.buttons & 1) || o.getMode() !== 'doll') return; const g = sel(); if (g && g.userData.cat) dropY(g); });
  canvas.addEventListener('pointerup', () => { if (o.getMode() === 'doll' && sel()) setTimeout(() => changed(), 0); });

  /* 전체 보기일 때만 목록·버튼 — 도구 막대가 보이면 전체 보기 */
  let userClosed = false, lastSel = undefined;
  const placePanel = () => { const hd = document.getElementById('head'); const b = hd && !hd.classList.contains('closed') ? hd.getBoundingClientRect().bottom : 50; P.style.setProperty('--int-top', Math.round(b + 10) + 'px'); };
  const onMode = () => { const doll = !tool.hidden; if (!doll) P.hidden = true; else if (innerWidth > 760 && !userClosed) { placePanel(); P.hidden = false; thumbs(); } };
  new MutationObserver(onMode).observe(tool, { attributes: true, attributeFilter: ['hidden'] }); onMode();
  addEventListener('resize', () => { if (!P.hidden) placePanel(); });
  (function tick() { const g = sel() || null; if (g !== lastSel) { lastSel = g; const C = g && g.userData.cat ? BY[g.userData.cat] : null;
      r15.disabled = del.disabled = !g; ext.hidden = !(C && C.ext); flp.hidden = !(C && C.flip); col.hidden = !(C && C.cols);
      if (C && C.ext) ext.textContent = g.userData.st.ext ? '접기' : '확장'; if (C && C.cols) col.textContent = '색상: ' + C.cols[g.userData.st.col || 0]; }
    else if (g && g.userData.cat) { const C = BY[g.userData.cat]; if (C.ext) ext.textContent = g.userData.st.ext ? '접기' : '확장'; if (C.cols) col.textContent = '색상: ' + C.cols[g.userData.st.col || 0]; }
    requestAnimationFrame(tick); })();

  const api = { add, remove, restore, resetAll, get added() { return added; }, get gone() { return gone; }, CAT, heightMap, foot };
  window.__interior = api; return api;
}
