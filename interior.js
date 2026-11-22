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
    glassDark: std(0x1c2024, .12, .2), mirror: std(0xe6ecef, .03, 1), leather: std(0x6d4f3d, .5), leatherD: std(0x3d302a, .6), leatherL: std(0x8a6a55, .5),
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

  /* ───── 도형 도우미(단위 m, 바닥 y=0, 앞 = +z) ───── */
  const mk = (g, geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const bx = (g, w, h, d, x, y0, z, mat) => mk(g, new T.BoxGeometry(w, h, d), mat, x, y0 + h / 2, z);
  const rb = (g, w, h, d, r, x, y0, z, mat) => mk(g, new RBG(w, h, d, 3, Math.max(.001, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001))), mat, x, y0 + h / 2, z);
  const cy = (g, r, h, x, y0, z, mat, seg = 24, r2 = r) => mk(g, new T.CylinderGeometry(r, r2, h, seg), mat, x, y0 + h / 2, z);
  const endShape = (L, Dp, a) => { const x0 = -L / 2, x1 = L / 2 - a, b = Dp / 2, s = new T.Shape(); s.moveTo(x0, -b); s.lineTo(x1, -b); s.absellipse(x1, 0, a, b, -Math.PI / 2, Math.PI / 2, false); s.lineTo(x0, b); s.closePath(); return s; };
  const opG = (g, k, v, x, y, z, n) => { const p = new T.Group(); p.position.set(x, y, z); p.userData.op = { k, v, n }; g.add(p); return p; }; /* 열리는 묶음: k 's' = 앞(+z)으로 v m 미끄러짐(서랍) · 'h' = 경첩 축으로 v rad 회전(문) */
  const upEx = (shape, h) => { const g = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); return g; };

  /* ───── 제품 목록(사용자 제공 사양) ───── */
  const CAT = [
    { k: 'round1000', g: '식탁', name: '원형 식탁', model: '한샘 미나 내추럴 원형 4인 1000', size: '지름 998 · 높이 744 · 다리 간격 555', note: '상판 코튼화이트 · 고무나무 원목 다리 · 의자 미포함', put: 'free', room: ['식당', '주방'], clear: .45,
      build: () => { const g = new T.Group(); cy(g, .499, .025, 0, .719, 0, M.cotton, 72); cy(g, .17, .03, 0, .689, 0, M.natural, 32);
        for (const [x, z] of [[-.2775, -.2775], [.2775, -.2775], [-.2775, .2775], [.2775, .2775]]) cy(g, .025, .69, x, 0, z, M.natural, 20, .023); return g; } },
    { k: 'cielo1500', g: '식탁', name: '확장형 원목 식탁', model: '한샘 씨엘로 모디프 확장형 원목 식탁 1500', size: '확장 전 1100×1100 · 확장 후 1500×1100 · 높이 750', note: '원목 · 의자 미포함 · 선택 후 [확장] 버튼', put: 'free', room: ['식당', '주방'], clear: .45, ext: true,
      build: s => { const W = s.ext ? 1.5 : 1.1, D = 1.1, H = .75, g = new T.Group(); bx(g, W, .04, D, 0, H - .04, 0, M.oak);
        for (const x of (s.ext ? [-.2, .2] : [0])) bx(g, .004, .002, D - .004, x, H, 0, M.seam);
        const ai = .075; bx(g, W - 2 * ai, .08, .025, 0, H - .12, D / 2 - ai, M.oak); bx(g, W - 2 * ai, .08, .025, 0, H - .12, -(D / 2 - ai), M.oak); bx(g, .025, .08, D - 2 * ai, W / 2 - ai, H - .12, 0, M.oak); bx(g, .025, .08, D - 2 * ai, -(W / 2 - ai), H - .12, 0, M.oak);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, .065, H - .04, .065, sx * (W / 2 - .075), 0, sz * (D / 2 - .075), M.oak); return g; } },
    { k: 'mw23', g: '주방', name: '전자레인지', model: '삼성 세라믹 전자레인지 23L (MS23C3535AW)', size: '489 × 275 × 374 (가로×높이×깊이)', note: '화이트 · 조리대·렌지대 위에 놓임', put: 'top', room: ['주방', '식당'],
      build: () => { const g = new T.Group(), W = .489, H = .275, D = .374; rb(g, W, H - .008, D, .014, 0, .008, 0, M.applW);
        bx(g, W - .17, H - .075, .004, -.06, .04, D / 2 + .001, M.glassDark); bx(g, W - .15, .012, .003, -.06, H - .03, D / 2 + .001, M.white);
        bx(g, .1, H - .04, .003, W / 2 - .06, .02, D / 2 + .001, std(0xe8e8e5, .35)); bx(g, .055, .016, .003, W / 2 - .06, H - .07, D / 2 + .003, M.display);
        const d = mk(g, new T.CylinderGeometry(.019, .019, .012, 28), M.chrome, W / 2 - .06, .12, D / 2 + .007); d.rotation.x = Math.PI / 2;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, .012, .008, sx * (W / 2 - .04), 0, sz * (D / 2 - .04), M.black, 12); return g; } },
    { k: 'flat1400', g: '주방', name: '높은 렌지대 수납장', model: '플랫 높은 렌지대 수납장 1400 세트 (O80)', size: '1400 × 935 × 400 (폭×높이×깊이)', note: '가운데 칸에 전자레인지 · 슬라이드 선반 · 서랍', put: 'wall', room: ['주방', '식당'], slots: [[0, .518, -.01, .54, .395, .37]], /* x·y·z · 칸 폭·높이·깊이 */
      build: () => { const g = new T.Group(), W = 1.4, H = .935, D = .4; bx(g, W, .02, D, 0, H - .02, 0, M.oakL); bx(g, W - .04, .07, D - .06, 0, 0, -.02, M.greyD);
        for (const sx of [-1, 1]) bx(g, .018, H - .09, D, sx * (W / 2 - .009), .07, 0, M.white); bx(g, W - .036, H - .09, .012, 0, .07, -D / 2 + .006, M.white); bx(g, W - .036, .018, D - .012, 0, .07, .006, M.white);
        for (const x of [-.28, .28]) bx(g, .018, H - .09, D - .012, x, .07, .006, M.white);
        for (const x of [-.59, -.39]) { bx(g, .196, H - .1, .018, x, .075, D / 2 - .009, M.white); bx(g, .006, .16, .004, x + (x < -.5 ? .09 : -.09), .5, D / 2 + .001, M.greyD); }
        bx(g, .542, .018, D - .03, 0, .5, .003, M.oakL); bx(g, .52, .018, D - .045, 0, .285, .01, M.oakL); bx(g, .52, .035, .014, 0, .285, D / 2 - .03, M.white); bx(g, .542, .19, .018, 0, .078, D / 2 - .009, M.white); bx(g, .16, .006, .004, 0, .25, D / 2 + .001, M.greyD);
        for (const [y0, y1] of [[.075, .33], [.335, .59], [.595, .91]]) { bx(g, .4, y1 - y0 - .005, .018, .49, y0, D / 2 - .009, M.white); bx(g, .16, .006, .004, .49, y1 - .03, D / 2 + .001, M.greyD); } return g; } },
    { k: 'frua1400', g: '주방', name: '홈바 렌지대(반타원)', model: '프루아 1400 템바보드 반타원 렌지대 수납장 아일랜드 홈바 식탁 (NDD171C)', size: '상판 600×1400 · 하단 390×1185 · 높이 888', note: '화이트 · 앞면 템바보드 · 선택 후 [좌우 바꾸기]로 좌측형/우측형', put: 'free', room: ['식당', '주방'], clear: .35, flip: true,
      build: () => { const g = new T.Group(), H = .888; const base = mk(g, upEx(endShape(1.185, .39, .3), H - .03), [M.white, M.tamb], 0, 0, -.105);
        mk(g, upEx(endShape(1.4, .6, .36), .03), M.white, 0, H - .03, 0); bx(g, .78, .3, .004, -.17, .1, -.3 - .002, std(0xd9d6cf, .7)); bx(g, .78, .3, .004, -.17, .46, -.3 - .002, std(0xd9d6cf, .7)); base.castShadow = true; return g; } },
    { k: 'muse600', g: '주방', name: '스몰 렌지대', model: '가이온 뮤즈 600 스몰 렌지대', size: '600 × 400 × 785 (폭×깊이×높이)', note: '위 칸 전자레인지 · 선택 후 [색상]으로 6가지 색', put: 'wall', room: ['주방', '식당'], cols: MUSE.map(c => c[0]), slots: [[0, .448, -.01, .56, .315, .37]],
      build: s => { const [, B, F, S] = MUSE[s.col || 0], g = new T.Group(), W = .6, D = .4, H = .785; bx(g, W, .02, D, 0, H - .02, 0, S); bx(g, W - .04, .04, D - .05, 0, 0, -.015, M.greyD);
        for (const sx of [-1, 1]) bx(g, .018, H - .06, D, sx * (W / 2 - .009), .04, 0, B); bx(g, W - .036, H - .06, .012, 0, .04, -D / 2 + .006, B);
        bx(g, W - .036, .018, D - .012, 0, .43, .006, S); bx(g, W - .05, .018, D - .045, 0, .24, .01, S); bx(g, W - .05, .04, .015, 0, .24, D / 2 - .03, F);
        bx(g, W - .036, .018, D - .012, 0, .222, .006, B); bx(g, W - .006, .175, .018, 0, .045, D / 2 - .009, F); bx(g, .14, .006, .004, 0, .19, D / 2 + .001, M.greyD); return g; } },
    { k: 'dw6', g: '주방', name: '식기세척기(카운터탑)', model: '삼성 비스포크 식기세척기 카운터탑 6인용', size: '555 × 480 × 500 (폭×높이×깊이)', note: '화이트 · 조리대 위에 놓임', put: 'top', room: ['주방', '식당'],
      build: () => { const g = new T.Group(), W = .555, H = .48, D = .5; rb(g, W, H - .01, D, .016, 0, .01, 0, M.applW); bx(g, W - .02, H - .07, .006, 0, .02, D / 2 + .002, std(0xf6f6f4, .25));
        bx(g, W - .03, .034, .004, 0, H - .056, D / 2 + .004, M.grey); bx(g, .06, .012, .003, W / 2 - .07, H - .045, D / 2 + .007, M.display); bx(g, .26, .012, .005, 0, H - .095, D / 2 + .005, M.black);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, .012, .01, sx * (W / 2 - .04), 0, sz * (D / 2 - .04), M.black, 12); return g; } },
    { k: 'king', g: '침실', name: '킹사이즈 침대', model: '킹사이즈 침대 1600 × 2000', size: '매트리스 1600 × 2000', note: '안방(침실1)에 놓임 · 헤드보드를 벽에', put: 'wall', room: ['침실1', '안방'],
      build: () => { const g = new T.Group(); rb(g, 1.66, .3, 2.06, .03, 0, 0, 0, M.fabric); rb(g, 1.6, .24, 2, .05, 0, .3, 0, M.linen);
        rb(g, 1.7, .07, 1.5, .03, 0, .52, .27, M.duvet); for (const sx of [-1, 1]) rb(g, .03, .24, 1.5, .012, sx * .835, .33, .27, M.duvet); rb(g, 1.7, .22, .03, .012, 0, .35, 1.03, M.duvet);
        for (const x of [-.4, .4]) rb(g, .62, .14, .4, .065, x, .53, -.72, M.pillow); rb(g, 1.72, 1.02, .1, .035, 0, 0, -1.08, M.chanFab).material = M.chanFab; return g; } },
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
        rb(g, 1.1, .045, 1.08, .02, .42, H + .19, -.02, M.skThrow); rb(g, .04, .3, 1.08, .015, .985, H - .08, -.02, M.skThrow); /* 발 쪽 니트 담요(끝으로 늘어짐) */
        rb(g, .42, .13, .62, .06, -.74, H + .2, -.06, M.pillow); { const c = rb(g, .12, .42, .42, .05, -.93, H + .2, -.02, M.pillow); c.rotation.z = -.18; }
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
        return g; } },
    { k: 'cindy', g: '침실', name: '확장형 화장대(거울)', model: '한샘 신디 서랍형 원목 확장형 화장대', size: '폭 800~1350 · 높이 1340 · 깊이 400', note: '원목 · 서랍 · 거울 포함 · 선택 후 [확장]', put: 'wall', room: ['침실1', '안방'], ext: true,
      build: s => { const g = new T.Group(), W = .8, D = .4, Ht = .75; bx(g, W, .028, D, 0, Ht - .028, 0, M.natural); bx(g, W - .04, .14, D - .04, 0, Ht - .168, 0, M.natural);
        for (const x of [-.19, .19]) { bx(g, .36, .11, .008, x, Ht - .155, D / 2 - .016, M.oakL); cy(g, .012, .012, x, Ht - .105, D / 2 - .006, M.chrome, 12).rotation.x = Math.PI / 2; }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, .038, Ht - .028, .038, sx * (W / 2 - .03), 0, sz * (D / 2 - .03), M.natural);
        bx(g, .52, .59, .024, 0, Ht, -D / 2 + .05, M.natural); bx(g, .46, .53, .004, 0, Ht + .03, -D / 2 + .064, M.mirror);
        if (s.ext) { bx(g, .55, .028, D, W / 2 + .275, Ht - .028, 0, M.natural); for (const sz of [-1, 1]) bx(g, .038, Ht - .028, .038, W / 2 + .52, 0, sz * (D / 2 - .03), M.natural); } return g; } },
    { k: 'styler', g: '드레스룸', name: '스타일러', model: '의류관리기(스타일러)', size: '600 × 620 × 1965 (폭×깊이×높이)', note: '옷방(드레스룸)에 놓임', put: 'wall', room: ['드레스', '옷방'],
      build: () => { const g = new T.Group(), W = .6, D = .62, H = 1.965; bx(g, W - .03, .06, D - .06, 0, 0, -.02, M.black); rb(g, W, H - .06, D - .03, .01, 0, .06, -.015, M.applW);
        rb(g, W - .006, H - .08, .025, .008, 0, .07, D / 2 - .0125, M.cream); bx(g, .012, .9, .006, W / 2 - .04, .62, D / 2 + .003, M.grey); bx(g, .12, .022, .004, 0, H - .15, D / 2 + .002, M.display); return g; } },
    { k: 'arte', g: '거실', name: '안마의자', model: 'LG 힐링미 오브제컬렉션 아르테 (MH20BR)', size: '753 × 1007 × 1127 (폭×길이×높이)', note: '코지 브라운 · 뒤로 젖힐 공간 약 30cm 띄움', put: 'wall', room: ['거실'], gap: .3,
      build: () => { const g = new T.Group(), W = .753; bx(g, .56, .14, .62, 0, 0, -.05, M.leatherD);
        const arm = new T.Shape(); arm.moveTo(-.44, .14); arm.lineTo(.3, .14); arm.lineTo(.3, .5); arm.quadraticCurveTo(.3, .66, .16, .66); arm.lineTo(-.44, .66); arm.closePath();
        for (const sx of [-1, 1]) { const ag = new T.ExtrudeGeometry(arm, { depth: .15, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 3, curveSegments: 10 }); ag.rotateY(-Math.PI / 2); ag.translate(.075, 0, 0); mk(g, ag, M.leather, sx * (W / 2 - .1), 0, 0); }
        rb(g, .43, .12, .55, .05, 0, .38, 0, M.leatherL); const back = rb(g, .62, .78, .22, .08, 0, .37, -.36, M.leather); back.rotation.x = -.33;
        const head = rb(g, .4, .18, .12, .05, 0, .93, -.34, M.leatherL); head.rotation.x = -.33; for (const sx of [-1, 1]) { const wg = rb(g, .07, .7, .26, .03, sx * .33, .43, -.39, M.leatherD); wg.rotation.x = -.33; }
        for (const sx of [-1, 1]) { const l = rb(g, .2, .55, .17, .06, sx * .112, .0, .36, M.leather); l.position.y = .27; l.rotation.x = -.35; } return g; } },
    { k: 'robo500', g: '거실', name: '로봇청소기 수납장', model: '벨리카가구 픽스 E0 로봇청소기 다용도 수납장 500 (협탁 겸용)', size: '480 × 810 × 565 (폭×높이×깊이)', note: '아래 칸에 로봇청소기 · 협탁으로도', put: 'wall', room: ['거실', '침실1'],
      build: () => { const g = new T.Group(), W = .48, H = .81, D = .565; bx(g, W, .02, D, 0, H - .02, 0, M.white); for (const sx of [-1, 1]) bx(g, .018, H - .02, D, sx * (W / 2 - .009), 0, 0, M.white); bx(g, W - .036, H - .02, .012, 0, 0, -D / 2 + .006, M.white);
        for (const y of [0, .245, .62]) bx(g, W - .036, .018, D - .012, 0, y, .006, M.white); bx(g, W - .006, .16, .018, 0, .638, D / 2 - .009, M.white); bx(g, .14, .008, .005, 0, .76, D / 2 + .002, M.greyD);
        bx(g, W - .006, .35, .018, 0, .265, D / 2 - .009, M.white); bx(g, .006, .14, .005, W / 2 - .05, .38, D / 2 + .002, M.greyD);
        cy(g, .165, .085, 0, .02, .03, M.robot, 40); cy(g, .045, .02, 0, .105, -.03, M.robotTop, 24); cy(g, .167, .02, 0, .03, .03, M.greyD, 40); return g; } },
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
          let face = 0; if (hm.at(...P2(t, 0)) > WALL) { face = null; for (let k = 0; k <= .3; k += .01) if (hm.at(...P2(t, k)) < .06) { face = k; break; } if (face === null) continue; }
          else { for (let k = 0; k >= -.15; k -= .01) if (hm.at(...P2(t, k)) > WALL) { face = k + .01; break; } }
          const off = wl + sgn * (face + gap + f.d / 2), cx = ax === 0 ? t : off, cz = ax === 0 ? off : t;
          const occ = cells(hm, cx + fx * .05, cz + fz * .05, f.w - .03, f.d + .08, r).filter(v => v > .06).length; /* 앞 10cm 여유 포함 */
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
