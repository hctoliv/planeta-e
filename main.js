(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesk = () => matchMedia('(min-width: 901px)').matches;
  const hasGSAP = !!window.gsap;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !RM) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const loop = t => { lenis.raf(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }
  const goTo = target => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  };

  /* ---------- header + menu ---------- */
  const hd = $('#hd'), burger = $('#burger'), nav = $('#nav');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeModal(); } });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    setMenu(false);
    closeModal();
    goTo(id);
  }));

  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    hd.classList.toggle('is-solid', y > 40);
    const menuOpen = document.body.classList.contains('menu-open');
    hd.classList.toggle('is-hidden', !menuOpen && y > lastY + 4 && y > innerHeight * .8);
    if (y < lastY - 4) hd.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });

  const navLinks = $$('.hd__nav a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['sobre', 'servicos', 'cases', 'aovivo', 'contato'].forEach(id => $('#' + id) && io.observe($('#' + id)));

  /* ---------- relógio do HUD e órbita desde set/2009 ---------- */
  const START = new Date(2009, 8, 1, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const now = new Date();
    $('#hudClock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} BRT`;
    let y = now.getFullYear() - START.getFullYear();
    let m = now.getMonth() - START.getMonth();
    let d = now.getDate() - START.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    $('#ocY').textContent = y; $('#ocM').textContent = m; $('#ocD').textContent = d;
    $('#ocT').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };
  tick(); setInterval(tick, 1000);
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- o planeta (WebGL) ---------- */
  const sky = $('#sky');
  const planet = { s: 0, mx: 0, my: 0, tx: 0, ty: 0, on: true };
  (function initPlanet() {
    const gl = sky.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) { sky.remove(); return; }
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision highp float;
uniform vec2 R;uniform float T;uniform float S;uniform vec2 M;
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 col=vec3(.012,.010,.014);
  vec3 F=vec3(.843,.286,.129);
  // nebulosa
  float neb=fbm(vec3(uv*1.6+M*.03,T*.01));
  col+=vec3(.20,.06,.05)*pow(neb,3.)*.9;
  // estrelas
  for(int k=0;k<3;k++){float fk=float(k);
    vec2 g=(uv+M*(.01+fk*.012))*(70.+fk*55.)+fk*31.;vec2 id=floor(g);vec2 f=fract(g)-.5;
    float r=h(vec3(id,fk*7.+1.));
    if(r>.955){vec2 o=vec2(h(vec3(id,fk+3.)),h(vec3(id,fk+5.)))-.5;float d=length(f-o*.7);
      float tw=.55+.45*sin(T*(1.+r*3.)+r*80.);col+=mix(vec3(1.,.85,.75),vec3(.8,.85,1.),h(vec3(id,9.)))*smoothstep(.09,0.,d)*tw*(.45+fk*.3);}}
  // planeta
  float Rad=mix(1.05,4.2,S*S);
  vec2 c=vec2(.18*(1.-S)+M.x*.02,mix(-1.38,-.15,S)+M.y*.015);
  vec2 q=(uv-c)/Rad;float d2=dot(q,q);float dd=sqrt(d2);
  vec3 L=normalize(vec3(-.35,.8,.35));
  if(d2<1.){
    vec3 N=vec3(q,sqrt(1.-d2));
    float a=T*.025;vec3 P=N;P.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*P.xz;
    float f=fbm(P*2.6);
    float b=fbm(vec3(P.y*7.+f*2.5,P.x*1.2,P.z*1.2));
    vec3 base=mix(vec3(.045,.035,.04),vec3(.20,.10,.075),b);
    base=mix(base,vec3(.42,.16,.07),smoothstep(.55,.78,f)*.7);
    float dif=max(dot(N,L),0.);
    vec3 lit=base*(.05+1.25*dif);
    float cr=smoothstep(.035,.0,abs(fbm(P*5.+3.)-.5));
    lit+=F*cr*(1.-smoothstep(-.1,.25,dot(N,L)))*.55;
    float fr=pow(1.-N.z,2.5);
    lit+=F*fr*(.25+1.3*smoothstep(-.3,.6,dot(N,L)));
    lit+=vec3(1.,.6,.4)*pow(fr,6.)*smoothstep(0.,.7,dot(N,L))*.8;
    col=lit;
  }
  float out_=max(dd-1.,0.)*Rad;
  float side=smoothstep(-.9,.9,dot(normalize(vec3(q,.0001)),L));
  col+=F*exp(-out_*9.)*(.25+.9*side)*step(1.,d2)*.9;
  col+=F*exp(-out_*2.2)*.12*step(1.,d2);
  col+=F*S*S*.35;
  col=pow(col,vec3(.92));
  gl_FragColor=vec4(col,1.);
}`;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
    } catch (e) { console.warn(e); sky.remove(); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'R'), uT = gl.getUniformLocation(prog, 'T'),
      uS = gl.getUniformLocation(prog, 'S'), uM = gl.getUniformLocation(prog, 'M');
    const size = () => {
      const scale = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.5) * (innerWidth > 1800 ? .8 : 1);
      sky.width = Math.round(sky.clientWidth * scale);
      sky.height = Math.round(sky.clientHeight * scale);
      gl.viewport(0, 0, sky.width, sky.height);
    };
    size(); addEventListener('resize', size);
    addEventListener('pointermove', e => {
      planet.tx = (e.clientX / innerWidth - .5) * 2;
      planet.ty = -(e.clientY / innerHeight - .5) * 2;
    }, { passive: true });
    new IntersectionObserver(([e]) => { planet.on = e.isIntersecting; if (planet.on) requestAnimationFrame(draw); }).observe($('#hero'));
    const t0 = performance.now();
    function draw(now) {
      if (!planet.on) return;
      planet.mx += (planet.tx - planet.mx) * .04;
      planet.my += (planet.ty - planet.my) * .04;
      gl.uniform2f(uR, sky.width, sky.height);
      gl.uniform1f(uT, RM ? 20 : (now - t0) / 1000 + 20);
      gl.uniform1f(uS, planet.s);
      gl.uniform2f(uM, planet.mx, planet.my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  })();

  /* ---------- cases ---------- */
  const CASES = [
    ['bruno-lobo', 'DJ Bruno Lobo', 'musica', 'Produção artística'],
    ['banana-gun', 'Banana Gun', 'musica', '1ª banda virtual do país'],
    ['jobim', 'Tons sobre Jobim', 'musica', 'Parceria'],
    ['tears', 'Tears for Fears Experience', 'musica', 'Parceria'],
    ['claus-vanessa', 'Claus e Vanessa', 'musica', 'Produção'],
    ['delta-k', 'Delta K', 'musica', 'Produção'],
    ['clima', 'Clima de Montanha', 'musica', 'Produção'],
    ['emocoes', 'Projeto Emoções (navio)', 'musica', 'Produção de cast'],
    ['loucos', 'Loucos por Rir', 'humor', 'Criação e produção'],
    ['riso-fest', 'Riso Fest', 'humor', 'Criação e produção'],
    ['mallandro', 'Sérgio Mallandro', 'humor', 'Produção'],
    ['papagaio', 'Papagaio Falante', 'humor', 'Produção'],
    ['camarote-arena', 'Camarote Arena Corinthians', 'marcas', 'Produção da inauguração'],
    ['camarote-f1', 'Camarote F1', 'marcas', 'Produção'],
    ['cartao-todos', 'Cartão de Todos Corinthians', 'marcas', 'Intermediação'],
    ['hapvida', 'Hapvida Corinthians', 'marcas', 'Intermediação'],
    ['interligacao', 'Interligação de marcas no Corinthians', 'marcas', 'Intermediação'],
    ['bitci', 'Bitci', 'marcas', 'Agência parceira da criptomoeda turca'],
    ['realizando', 'Realizando imaginações', 'criacao', 'Planeta E'],
    ['producao', 'Produção artística', 'criacao', 'Do conceito à entrega'],
  ];
  const CAT = { musica: 'Música', humor: 'Humor', marcas: 'Marcas e esporte', criacao: 'Criação' };
  const grid = $('#casesGrid');
  grid.innerHTML = CASES.map(([k, t, c, r], i) => `
    <li class="case" data-c="${c}">
      <button type="button" data-i="${i}" aria-label="${t}: ${r}">
        <div class="case__img"><img src="img/${k}.jpg" alt="" loading="lazy" width="500" height="500"></div>
        <span class="case__n">${pad(i + 1)}</span>
        <div class="case__meta"><span>${r}</span><b>${t}</b></div>
      </button>
    </li>`).join('');
  $$('.filters button').forEach(b => {
    const f = b.dataset.f;
    b.querySelector('sup').textContent = f === 'all' ? CASES.length : CASES.filter(c => c[2] === f).length;
    b.addEventListener('click', () => {
      $$('.filters button').forEach(x => x.classList.toggle('is-on', x === b));
      const items = $$('.case', grid);
      const first = new Map(items.map(el => [el, el.getBoundingClientRect()]));
      items.forEach(el => el.classList.toggle('is-hide', f !== 'all' && el.dataset.c !== f));
      if (hasGSAP && !RM) items.filter(el => !el.classList.contains('is-hide')).forEach((el, i) => {
        const a = first.get(el), z = el.getBoundingClientRect();
        if (a.width) gsap.fromTo(el, { x: a.left - z.left, y: a.top - z.top }, { x: 0, y: 0, duration: .6, ease: 'power3.out' });
        else gsap.fromTo(el, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .5, delay: i * .03, ease: 'power3.out' });
      });
      ScrollTrigger && ScrollTrigger.refresh();
    });
  });
  if (matchMedia('(hover:hover)').matches && !RM) {
    grid.addEventListener('pointermove', e => {
      const b = e.target.closest('.case button'); if (!b) return;
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      b.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
    });
    grid.addEventListener('pointerout', e => {
      const b = e.target.closest('.case button');
      if (b && !b.contains(e.relatedTarget)) b.style.transform = '';
    });
  }

  /* modal */
  const modal = $('#modal');
  let lastFocus = null;
  grid.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    const [k, t, c, r] = CASES[+b.dataset.i];
    $('#mImg').src = `img/${k}.jpg`; $('#mImg').alt = t;
    $('#mCat').textContent = CAT[c]; $('#mT').textContent = t; $('#mRole').textContent = r;
    lastFocus = b;
    modal.hidden = false;
    lenis && lenis.stop();
    $('.modal__x').focus();
  });
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    lenis && lenis.start();
    lastFocus && lastFocus.focus();
  }
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  $('#mGo').addEventListener('click', () => {
    const t = $('#mT').textContent;
    $('#sig textarea').value = `Vi o case ${t} no site e quero algo nessa linha.`;
  });

  /* ---------- serviços: órbita ---------- */
  const SVC = [
    ['Produção de shows', 'Execução completa, da pré-produção à última luz do palco.'],
    ['Gerenciamento de carreira', 'Gestão estratégica para transformar talentos em marcas fortes.'],
    ['Planejamento de imagem', 'Posicionamento pensado na individualidade de cada artista.'],
    ['Marketing digital', 'Conectando o artista ao seu público de forma autêntica e impactante.'],
    ['Curadoria de repertório', 'Um olhar sensível às tendências sem perder a identidade.'],
    ['Intermediação de contratos', 'Negociação com ética e transparência, de artistas a grandes marcas.'],
    ['Estratégias de crescimento', 'Planos de curto, médio e longo prazo.'],
    ['Eventos e camarotes', 'Camarote Arena Corinthians, Camarote F1, festivais e lançamentos.'],
  ];
  const sats = $('#sats'), list = $$('#svcList li');
  sats.innerHTML = SVC.map((s, i) => `<i class="sat" data-i="${i}" title="${s[0]}"></i>`).join('');
  const satEls = $$('.sat', sats);
  let cur = 0, userPicked = false, rot = 0, orbitVisible = false;
  const pick = i => {
    cur = i;
    list.forEach((li, j) => li.classList.toggle('is-on', j === i));
    satEls.forEach((s, j) => s.classList.toggle('is-on', j === i));
    $('#ocardT').textContent = SVC[i][0];
    $('#ocardP').textContent = SVC[i][1];
  };
  pick(0);
  list.forEach((li, i) => {
    li.querySelector('button').addEventListener('click', () => { userPicked = true; pick(i); });
    li.addEventListener('mouseenter', () => { userPicked = true; pick(i); });
  });
  satEls.forEach((s, i) => s.addEventListener('click', () => { userPicked = true; pick(i); }));
  new IntersectionObserver(([e]) => { orbitVisible = e.isIntersecting; if (orbitVisible) requestAnimationFrame(spin); }).observe($('#orbit'));
  setInterval(() => { if (orbitVisible && !userPicked) pick((cur + 1) % SVC.length); }, 3200);
  const orbitEl = $('#orbit');
  function spin() {
    if (!orbitVisible) return;
    if (!RM) rot += .0018;
    const w = orbitEl.clientWidth, rr = w * .36;
    satEls.forEach((s, i) => {
      const a = rot + i / SVC.length * Math.PI * 2;
      s.style.transform = `translate(${Math.cos(a) * rr}px, ${Math.sin(a) * rr * .98}px)`;
    });
    requestAnimationFrame(spin);
  }

  /* ---------- vídeos: carregar perto, tocar quando visível ---------- */
  const lazyVids = $$('video[data-src]');
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: '200px 300px' });
  lazyVids.forEach(v => vio.observe(v));
  const landVid = $('.land__video');
  new IntersectionObserver(([e]) => e.isIntersecting ? landVid.play().catch(() => {}) : landVid.pause()).observe(landVid);

  $$('.reel').forEach(r => r.addEventListener('click', () => {
    const v = r.querySelector('video');
    const on = !r.classList.contains('is-snd');
    $$('.reel').forEach(o => { o.classList.remove('is-snd'); o.querySelector('video').muted = true; });
    if (on) {
      if (!v.src) v.src = v.dataset.src;
      v.muted = false; v.currentTime = 0; v.play().catch(() => {});
      r.classList.add('is-snd');
    }
  }));

  /* ---------- formulário → WhatsApp ---------- */
  $('#sig').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, nome = f.nome.value.trim();
    const fld = f.nome.closest('.fld');
    if (!nome) { fld.classList.add('is-bad'); $('#sigErr').textContent = 'Diga seu nome para a gente saber com quem fala.'; f.nome.focus(); return; }
    fld.classList.remove('is-bad'); $('#sigErr').textContent = '';
    const tipo = f.tipo.value, data = f.data.value.trim(), msg = f.msg.value.trim();
    const txt = [`Olá, Planeta E! Sou ${nome}.`, `Projeto: ${tipo}.`, data && `Data prevista: ${data}.`, msg].filter(Boolean).join('\n');
    window.open('https://wa.me/5511993810372?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  });

  /* ---------- palavras do lead ---------- */
  const lead = $('#aboutLead');
  lead.innerHTML = lead.textContent.split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = $$('.w', lead);

  /* ---------- marquee ---------- */
  const rows = $$('.marq').map(m => {
    const row = m.querySelector('.marq__row');
    row.innerHTML += row.innerHTML;
    $$('img', row).forEach((img, i) => { if (i >= row.children.length / 2) img.alt = ''; });
    return { row, dir: +m.dataset.dir, x: 0 };
  });
  let vel = 0;
  if (lenis) lenis.on('scroll', e => { vel = e.velocity || 0; });
  const marqLoop = () => {
    rows.forEach(r => {
      const half = r.row.scrollWidth / 2;
      if (!half) return;
      r.x += r.dir * (RM ? 0 : .45 + Math.min(Math.abs(vel), 40) * .25);
      if (r.x <= -half) r.x += half;
      if (r.x > 0) r.x -= half;
      r.row.style.transform = `translate3d(${r.x}px,0,0)`;
    });
    vel *= .92;
    requestAnimationFrame(marqLoop);
  };
  rows.forEach(r => { if (r.dir > 0) r.x = -1; });
  requestAnimationFrame(marqLoop);

  /* ---------- boot + animações ---------- */
  const boot = $('#boot');
  const seen = (() => { try { return sessionStorage.getItem('pe-boot'); } catch (e) { return null; } })();
  const startSite = () => {
    boot.classList.add('is-out');
    setTimeout(() => boot.remove(), 1000);
    if (hasGSAP && !RM) {
      gsap.from('.hero__title .ln>span', { yPercent: 110, duration: 1.1, stagger: .09, ease: 'power4.out', delay: .25 });
      gsap.from('.hero .eyebrow, .hero__sub, .hero__actions, .hero__hud', { opacity: 0, y: 20, duration: .9, stagger: .08, delay: .7, ease: 'power3.out' });
    }
  };
  if (RM || seen) { boot.style.display = 'none'; startSite(); }
  else {
    try { sessionStorage.setItem('pe-boot', '1'); } catch (e) {}
    const c = $('#bootCount'); let n = 3;
    const iv = setInterval(() => { n--; if (n > 0) c.textContent = n; else { clearInterval(iv); c.textContent = '0'; setTimeout(startSite, 220); } }, 600);
  }

  if (!hasGSAP) { $$('.rv').forEach(el => el.classList.remove('rv')); words.forEach(w => w.classList.add('on')); return; }

  // hero → mergulho no planeta
  ScrollTrigger.create({
    trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: s => { planet.s = s.progress; }
  });
  if (!RM) gsap.to('.hero__inner', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '70% top', scrub: true } });

  // pouso: janela circular abre para o palco
  if (!RM) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#land', start: 'top top', end: 'bottom bottom', scrub: .6 } });
    tl.fromTo('.land__window', { clipPath: 'circle(9% at 50% 62%)' }, { clipPath: 'circle(75% at 50% 50%)', ease: 'power2.inOut', duration: 1 })
      .fromTo('.land__video', { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .from('.land__title span', { yPercent: 60, opacity: 0, stagger: .15, duration: .5 }, .35)
      .from('.land__copy .eyebrow', { opacity: 0, duration: .3 }, .3)
      .to('.land__copy', { opacity: 0, y: -40, duration: .3 }, 1.2);
  }

  // lead aceso palavra a palavra
  ScrollTrigger.create({
    trigger: lead, start: 'top 80%', end: 'bottom 45%', scrub: true,
    onUpdate: s => { const k = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < k)); }
  });

  // reveals
  const rv = ['.about__head', '.orbitclock', '.about__cols p', '.about__mission', '.svc__text > *', '.cases__head', '.arch__head', '.contact__text > *', '.sig', '.ft__grid'];
  rv.forEach(sel => $$(sel).forEach(el => el.classList.add('rv')));
  ScrollTrigger.batch('.rv', {
    start: 'top 88%',
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, stagger: .08, ease: 'power3.out', overwrite: true }),
  });
  ScrollTrigger.batch('.case', {
    start: 'top 92%',
    onEnter: b => gsap.from(b, { opacity: 0, y: 50, duration: .8, stagger: .05, ease: 'power3.out' }),
    once: true,
  });

  // orbitclock: contagem sobe
  ScrollTrigger.create({
    trigger: '.orbitclock', start: 'top 85%', once: true,
    onEnter: () => { const el = $('#ocY'); const to = +el.textContent; const o = { v: 0 }; gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }); }
  });

  // ao vivo: trilha horizontal fixada (desktop)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('#liveTrack');
    const dist = () => track.scrollWidth - (innerWidth - $('.live__head').offsetWidth);
    const tw = gsap.to(track, {
      x: () => -Math.max(0, dist()), ease: 'none',
      scrollTrigger: {
        trigger: '#aovivo', start: 'top top', end: () => '+=' + Math.max(innerHeight, dist()), pin: '.live__pin', scrub: .5, invalidateOnRefresh: true,
        onUpdate: s => { $('#liveBar').style.transform = `scaleX(${s.progress})`; }
      }
    });
    return () => tw.kill();
  });

  // banana gun: parallax e título
  if (!RM) {
    gsap.fromTo('.bg__video', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#banana', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.bg__title', { yPercent: 40, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: '#banana', start: 'top 60%', end: 'top 10%', scrub: true } });
    gsap.from('.ft__big', { yPercent: 50, ease: 'none', scrollTrigger: { trigger: '.ft', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
