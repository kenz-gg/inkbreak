import './style.css';
import './ui/visual.css';
import { KAIEN, MIRA, Match, FighterAI, dummyInput, type Difficulty, type DummyBehavior, type EventLog, type MatchSnapshot } from '@inkbreak/shared';
import type Phaser from 'phaser';
import type { ArenaBridge } from './game/scenes/arena';
import { Controls } from './game/input/controls';
import { Sound } from './game/audio/sound';
import { loadSave, saveData } from './persistence/save';
import { ARCADE_ROUTE, advanceArcade } from '@inkbreak/shared';
import { bindingActions, defaultBindings, keyLabel, validBinding } from './config/bindings';
import kaienPortrait from '../../../assets-source/characters/kaien/portraits/kaien-portrait.svg?url';
import miraPortrait from '../../../assets-source/characters/mira/portraits/mira-portrait.svg?url';

type Mode = 'versus' | 'training' | 'local' | 'arcade';
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root missing');
const root = app;
const save = loadSave();
const sound = new Sound(save.settings.volume);
const characters = [KAIEN, MIRA];
const portraits = [kaienPortrait, miraPortrait];
let selected = KAIEN;
let opponent = MIRA;
let mode: Mode = 'versus';
let difficulty: Difficulty = 'normal';
let game: Phaser.Game | null = null;
let controls: Controls | null = null;
let bridge: ArenaBridge | null = null;
let dummy: DummyBehavior = 'stand';
let resultShown = false;
let lastHud = '';
let generation = 0;
let arcadeStage = 0;

function configureArcade(): void {
  const bout = ARCADE_ROUTE[arcadeStage] ?? ARCADE_ROUTE[0]!;
  opponent = characters.find(c=>c.id === bout.opponent) ?? MIRA;
  difficulty = bout.difficulty;
}

function button(label: string, id: string, extra = ''): string { return `<button id="${id}" ${extra}>${label}</button>`; }
function controlLegend(): string {
  return bindingActions.map(action=>`<span><kbd>${keyLabel(save.settings.bindings[0][action])}</kbd> ${action==='up' ? 'Jump' : action[0]!.toUpperCase()+action.slice(1)}</span>`).join('')+'<span><kbd>Esc</kbd> Pause</span>';
}
function click(id: string, callback: () => void): void { document.getElementById(id)?.addEventListener('click', callback); }
function screen(content: string): void {
  document.documentElement.dataset.reducedMotion = String(save.settings.reducedMotion);
  root.innerHTML = `<div class="shell"><header><a href="#" id="brand" aria-label="INKBREAK home"><span class="crest">✦</span> INKBREAK<span class="brand-sub">THE FOLDED WORLD</span></a><span class="edition">PLAYABLE FOLIO <b>01</b></span></header>${content}<footer><span>ORIGINAL WORLD. UNWRITTEN RIVALRIES.</span><span>DEVELOPMENT EDITION · 0.1</span></footer></div>`;
  click('brand', () => { stopGame(); home(); });
}
function home(): void {
  screen(`<main class="home"><div class="hero-copy"><p class="eyebrow"><span></span> THE GRAND CONVERGENCE</p><h1>Every battle<br>leaves a <em>mark.</em></h1><p class="intro">Worlds fold. Rivals rise.<br>Step into the arena and write your own legend.</p><div class="menu">${button('<span><small>01 / ENTER THE ARENA</small>Play versus AI</span><b>↗</b>', 'play', 'class="primary"')}${button('<span><small>02 / FIND YOUR FLOW</small>Training</span><b>↗</b>', 'training')}${button('<span><small>03 / SETTLE THE SCORE</small>Local versus</span><b>↗</b>', 'local')}<button disabled title="Scheduled after the first playable milestone"><span><small>COMING IN A LATER FOLIO</small>Online & arcade</span><b>◇</b></button></div><div class="subnav">${button('The fighters', 'characters')}${button('Settings', 'settings')}<span>${save.matches} matches · ${save.wins} wins</span></div></div><aside class="hero-art"><div class="orbit"></div><img class="hero-mira" src="${miraPortrait}" alt="Mira, the Paper Dancer"/><img class="hero-kaien" src="${kaienPortrait}" alt="Kaien, the Ember Wanderer"/><div class="folio-caption"><span>FOLIO I</span><strong>Sunspire Court</strong><p>Where the last light meets the first challenger.</p></div></aside></main>`);
  const coming = root.querySelector<HTMLButtonElement>('.menu button:disabled')!;
  coming.innerHTML = '<span><small>COMING IN A LATER FOLIO</small>Online 1v1</span><b>◇</b>';
  coming.insertAdjacentHTML('beforebegin',button(`<span><small>04 / THREE-BOUT CIRCUIT</small>${save.arcade ? 'Resume arcade' : 'Arcade'}</span><b>↗</b>`,'arcade'));
  root.querySelector('.subnav span')?.append(` · ${save.circuits} circuits`);
  click('arcade',()=>{ if(save.arcade) selected=characters.find(c=>c.id===save.arcade?.fighter) ?? KAIEN; selection('arcade'); });
  click('play', () => selection('versus')); click('training', () => selection('training')); click('local', () => selection('local'));
  click('settings', settingsScreen); click('characters', roster);
}
function roster(): void {
  screen(`<main class="page"><p class="eyebrow">THE CHALLENGERS</p><h1>Two worlds.<br><em>One arena.</em></h1><div class="dossiers">${characters.map((c,i) => `<article><img src="${portraits[i]}" alt="${c.name}"/><div><h2>${c.name}</h2><p class="eyebrow">${c.title}</p><p>${c.archetype} · ${c.stats.maxHealth} vitality</p><p>${c.id === 'kaien' ? 'Close the distance with Ember Step. Chain two lights, then finish with a heavy or skill.' : 'Control the middle distance with paper projectiles. Use your long heavy to punish careless approaches.'}</p><dl>${Object.values(c.attacks).map(a => `<dt>${a.name}</dt><dd>${a.startup} / ${a.active} / ${a.recovery} frames · ${a.projectile?.damage ?? a.damage} damage</dd>`).join('')}</dl></div></article>`).join('')}</div><p class="muted">Orun and Selka are planned. Additional signature skills and the final animation sets are in development.</p>${button('← Back to menu','back')}</main>`);
  click('back', home);
}
function selection(nextMode: Mode): void {
  mode = nextMode;
  if (mode === 'arcade') {
    arcadeStage = save.arcade?.fighter === selected.id ? save.arcade.stage : 0;
    configureArcade();
  }
  screen(`<main class="page select-page"><div class="section-head"><div><p class="eyebrow">${mode === 'training' ? 'THE PRACTICE FOLIO' : mode === 'local' ? 'SHARED SCREEN · TWO PLAYERS' : 'SINGLEPLAYER · FIRST TO TWO'}</p><h1>Choose your <em>fighter.</em></h1></div>${button('← Back', 'back', 'class="quiet"')}</div><div class="selection-grid">${characters.map((c,i) => `<button class="fighter-card ${selected.id === c.id ? 'selected' : ''}" data-fighter="${i}" aria-pressed="${selected.id === c.id}"><span class="card-number">0${i+1} / ${c.archetype.toUpperCase()}</span><img src="${portraits[i]}" alt=""/><span class="fighter-info"><strong>${c.name}</strong><span>${c.title}</span><i>${c.id === 'kaien' ? 'FAST PRESSURE / EMBER STEP' : 'RANGE CONTROL / PAPER BLOOM'}</i></span><span class="select-mark">✦</span></button>`).join('')}<aside class="match-card"><p class="eyebrow">YOUR NEXT CHAPTER</p><div class="arena-preview"></div><h2>Sunspire Court</h2><p>Sandstone. Silk. The quiet before the clash.</p><label>${mode === 'local' ? 'Player two' : 'Opponent'}<select id="opponent">${characters.map(c => `<option value="${c.id}" ${opponent.id === c.id ? 'selected' : ''}>${c.name} · ${c.archetype}</option>`).join('')}</select></label>${mode === 'versus' ? `<label>Difficulty<select id="difficulty"><option ${difficulty === 'easy' ? 'selected' : ''}>easy</option><option ${difficulty === 'normal' ? 'selected' : ''}>normal</option><option ${difficulty === 'hard' ? 'selected' : ''}>hard</option></select></label>` : ''}<p class="rules">${mode === 'training' ? 'Unlimited time · Configurable dummy · Frame data' : '75-second rounds · First to two wins · No arena hazards'}</p>${button('Enter the arena <span>→</span>', 'start', 'class="primary"')}</aside></div><div class="controls-guide"><span><kbd>A</kbd><kbd>D</kbd> Move</span><span><kbd>W</kbd> Jump</span><span><kbd>J</kbd> Light</span><span><kbd>K</kbd> Heavy</span><span><kbd>L</kbd> Skill</span><span><kbd>U</kbd> Guard</span><span><kbd>I</kbd> Ultimate</span><span><kbd>Shift</kbd> Dash</span></div>${mode === 'local' ? '<p class="muted">Player two: arrows move/jump · Numpad 1 light, 2 heavy, 3 skill, 4 guard, 5 ultimate, 0 dash. A numeric keypad is required.</p>' : ''}</main>`);
  root.querySelector('.controls-guide')!.innerHTML=controlLegend();
  if (mode === 'arcade') {
    (document.getElementById('opponent') as HTMLSelectElement).disabled = true;
    const description = document.createElement('p'); description.className = 'eyebrow';
    description.textContent = `BOUT ${arcadeStage+1} / ${ARCADE_ROUTE.length} · ${ARCADE_ROUTE[arcadeStage]?.title} · ${difficulty}`;
    document.querySelector('.match-card')?.prepend(description);
  }
  click('back', home);
  root.querySelectorAll<HTMLButtonElement>('[data-fighter]').forEach(card => card.addEventListener('click', () => {
    selected = characters[Number(card.dataset.fighter)] ?? KAIEN; selection(mode);
  }));
  document.querySelector('#opponent')?.addEventListener('change', e => { opponent = characters.find(c => c.id === (e.target as HTMLSelectElement).value) ?? MIRA; });
  document.querySelector('#difficulty')?.addEventListener('change', e => { difficulty = (e.target as HTMLSelectElement).value as Difficulty; });
  click('start', () => { sound.unlock(); void startMatch(); });
}
function settingsScreen(): void {
  screen(`<main class="page settings"><p class="eyebrow">MAKE YOURSELF AT HOME</p><h1>Your <em>folio.</em></h1><div class="settings-grid"><label>Presentation quality<select id="quality">${['low','medium','high'].map(q=>`<option ${save.settings.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select><small>Low: 30 FPS presentation, fewer particles. Combat always runs at 60 Hz.</small></label><label>Sound effects<input id="volume" type="range" min="0" max="1" step="0.05" value="${save.settings.volume}"/><small>Original synthesized combat cues. Zero mutes audio.</small></label><label class="check"><input id="motion" type="checkbox" ${save.settings.reducedMotion ? 'checked' : ''}/>Reduced motion / no screen shake</label><label class="check"><input id="touch-setting" type="checkbox" ${save.settings.touch ? 'checked' : ''}/>Always show touch controls</label><label>Touch button scale<input id="touch-scale" type="range" min="0.7" max="1.4" step="0.1" value="${save.settings.touchScale}"/></label></div><p id="save-status" role="status"></p>${button('Save & return', 'save-settings', 'class="primary"')}</main>`);
  const remapping = document.createElement('section'); remapping.className = 'remapping';
  remapping.innerHTML = `<h2>Make your own moves.</h2><p class="muted">Select an action, then press a key. Escape cancels. Bindings must be unique across both players.</p><div class="settings-grid">${([0,1] as const).map(side=>`<fieldset><legend>PLAYER ${side+1}</legend>${bindingActions.map(action=>`<button class="binding" data-side="${side}" data-binding="${action}"><span>${action === 'up' ? 'Jump' : action}</span><kbd>${keyLabel(save.settings.bindings[side][action])}</kbd></button>`).join('')}</fieldset>`).join('')}</div>${button('Restore default keys','default-keys','class="quiet"')}<p id="binding-status" role="status" class="muted"></p>`;
  document.getElementById('save-settings')?.before(remapping);
  remapping.querySelectorAll<HTMLButtonElement>('[data-binding]').forEach(btn=>btn.addEventListener('click',()=>{
    const side = Number(btn.dataset.side) as 0|1;
    const action = btn.dataset.binding as typeof bindingActions[number];
    btn.querySelector('kbd')!.textContent = 'Press a key…';
    btn.addEventListener('keydown',e=>{
      e.preventDefault(); e.stopPropagation();
      const status=document.getElementById('binding-status')!;
      if(e.code!=='Escape') {
        const duplicate=save.settings.bindings.some((player,i)=>Object.entries(player).some(([a,code])=>code===e.code && (i!==side || a!==action)));
        if(!validBinding(e.code)) status.textContent='Choose a letter, number, arrow, punctuation, Space or Shift key.';
        else if(duplicate) status.textContent='That key already belongs to another action. Choose a different key.';
        else { save.settings.bindings[side][action]=e.code; status.textContent=`Player ${side+1} ${action} bound to ${keyLabel(e.code)}.`; }
      }
      btn.querySelector('kbd')!.textContent=keyLabel(save.settings.bindings[side][action]);
    },{once:true});
  }));
  click('default-keys',()=>{save.settings.bindings=defaultBindings();settingsScreen();});
  click('save-settings', () => {
    const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
    save.settings.quality = value('quality') as typeof save.settings.quality;
    save.settings.volume = Number(value('volume')); sound.volume = save.settings.volume;
    save.settings.reducedMotion = (document.getElementById('motion') as HTMLInputElement).checked;
    save.settings.touch = (document.getElementById('touch-setting') as HTMLInputElement).checked;
    save.settings.touchScale = Number(value('touch-scale'));
    if (saveData(save)) home();
    else document.getElementById('save-status')!.textContent = 'Settings applied for this session. Browser storage is unavailable.';
  });
}

function stopGame(): void {
  generation++; controls?.destroy(); controls = null; game?.destroy(true); game = null; bridge = null;
}
async function startMatch(): Promise<void> {
  stopGame(); const token = generation;
  resultShown = false; lastHud = '';
  if (mode === 'arcade') {
    configureArcade();
    save.arcade={fighter:selected.id === 'mira' ? 'mira' : 'kaien',stage:arcadeStage};
    saveData(save);
  }
  const match = new Match([selected,opponent], { training: mode === 'training', timerEnabled: mode !== 'training' });
  const ai = new FighterAI(difficulty);
  screen(`<main class="battle"><div class="battle-top"><span><b>SUNSPIRE COURT</b> / ${mode.toUpperCase()}</span><div>${button('Pause', 'pause')}${button('Menu','menu')}</div></div><div class="stage ${save.settings.touch ? 'show-touch' : ''}" style="--touch-scale:${save.settings.touchScale}"><div id="canvas-host"></div><div id="hud"><div id="left-hud"></div><div class="timer"><b id="timer">75</b><span id="round">ROUND 1</span></div><div id="right-hud"></div></div><div id="announcement" aria-live="polite"></div><div id="combo"></div><div id="overlay"></div><div class="touch-controls"><div class="touch-move">${touchButton('left','◀')}${touchButton('right','▶')}${touchButton('up','↑')}<span>${touchButton('dash','DASH')}</span></div><div class="touch-actions">${touchButton('guard','GUARD')}${touchButton('light','LIGHT')}${touchButton('heavy','HEAVY')}${touchButton('skill','SKILL')}${touchButton('ultimate','ULT')}</div></div></div><div class="battle-bottom"><div class="controls-guide"><span><kbd>A D</kbd> Move</span><span><kbd>W</kbd> Jump</span><span><kbd>J K</kbd> Attack</span><span><kbd>L</kbd> Skill</span><span><kbd>U</kbd> Guard</span><span><kbd>I</kbd> Ultimate</span><span><kbd>Esc</kbd> Pause</span></div>${button('Hitboxes / diagnostics','debug','class="quiet"')}</div>${mode === 'training' ? `<div class="training-bar"><label>Dummy<select id="dummy">${['stand','guard','jump','attack','counter','random'].map(d => `<option ${dummy === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label class="check"><input id="infinite" type="checkbox"/>Infinite meter</label>${button('Reset positions','reset')}<span id="frame-data">Frame data</span><span id="input-history"></span></div>` : ''}<div id="diagnostics" hidden></div><p class="orientation">For more room to fight, rotate your device to landscape.</p></main>`);
  root.querySelector('.controls-guide')!.innerHTML=controlLegend();
  if (navigator.maxTouchPoints > 0) document.querySelector('.stage')?.classList.add('show-touch');
  const loading = document.createElement('div'); loading.id='arena-loading'; loading.setAttribute('role','status');
  loading.textContent='Opening the Sunspire folio…'; document.querySelector('.stage')?.append(loading);
  controls = new Controls(togglePause,save.settings.bindings); controls.bindTouch(root);
  bridge = {
    match, paused: false, settings: save.settings, debug: false, fps: 0, particles: 0, visualQuality: save.settings.quality,
    input: () => [controls!.read(0), mode === 'local' ? controls!.read(1) : mode === 'training' ? dummyInput(match,dummy,ai) : ai.step(match,1)],
    onTick: onTick,
    onError: showError,
    onLoading: progress => {
      if (progress === null) loading.remove();
      else loading.textContent=`Illustrating Sunspire Court · ${Math.round(progress*100)}%`;
    },
  };
  click('pause',togglePause); click('menu', () => { if (bridge && !bridge.paused) togglePause(); });
  click('debug', () => { if (bridge) { bridge.debug = !bridge.debug; document.getElementById('diagnostics')!.hidden = !bridge.debug; } });
  click('reset', () => { match.resetPositions(); controls?.clear(); });
  document.getElementById('dummy')?.addEventListener('change', e => { dummy = (e.target as HTMLSelectElement).value as DummyBehavior; });
  document.getElementById('infinite')?.addEventListener('change', e => { match.infiniteMeter = (e.target as HTMLInputElement).checked; });
  try {
    const { createGame } = await import('./game/scenes/arena');
    if (token !== generation || !bridge) return;
    game = createGame(document.getElementById('canvas-host')!, bridge);
    onTick([]);
  } catch (error) { showError(error instanceof Error ? error.message : 'Unable to start the arena.'); }
}
function touchButton(action: string, label: string): string { return `<button data-action="${action}" aria-label="${action === 'up' ? 'Jump' : action}">${label}</button>`; }
function onTick(events: EventLog[]): void {
  if (!bridge) return;
  for (const e of events) sound.play(e);
  const m = bridge.match;
  // HUD updates at 20 Hz; the simulation and input capture remain fixed 60 Hz.
  if (m.tick % 3 !== 0 && events.length === 0) return;
  const status = `${m.phase}:${m.roundNumber}:${m.timerFrames}:${m.fighters.map(f=>`${f.health},${f.meter},${f.skillCooldown},${f.comboCount}`).join(':')}`;
  if (status !== lastHud) {
    lastHud = status;
    for (const f of m.fighters) {
      document.getElementById(f.side === 0 ? 'left-hud' : 'right-hud')!.dataset.character=f.char.id;
      document.getElementById(f.side === 0 ? 'left-hud' : 'right-hud')!.innerHTML = `<div class="fighter-label"><b>${f.char.name}</b><span>${f.side === 0 ? 'PLAYER 1' : mode === 'local' ? 'PLAYER 2' : mode === 'training' ? 'DUMMY' : difficulty.toUpperCase() + ' AI'} <i>${'◆'.repeat(m.wins[f.side])}${'◇'.repeat(Math.max(0,2-m.wins[f.side]))}</i></span></div><div class="health" role="meter" aria-label="${f.char.name} health" aria-valuemin="0" aria-valuemax="${f.maxHealth}" aria-valuenow="${f.health}"><div style="width:${f.health/f.maxHealth*100}%"></div><span>${f.health} / ${f.maxHealth}</span></div><div class="meter"><div style="width:${f.meter}%"></div></div><div class="meter-label"><span>${f.meter >= 100 ? 'ULTIMATE READY' : Math.floor(f.meter) + '% INK'}</span><span>${f.skillCooldown > 0 ? 'SKILL ' + (f.skillCooldown/60).toFixed(1) + 's' : 'SKILL READY'}</span></div>`;
    }
    document.getElementById('timer')!.textContent = mode === 'training' ? '∞' : String(Math.ceil(m.timerFrames/60)).padStart(2,'0');
    document.getElementById('round')!.textContent = `ROUND ${m.roundNumber}`;
    document.getElementById('announcement')!.textContent = m.phase === 'intro' ? `ROUND ${m.roundNumber}` : m.phase === 'roundOver' ? m.winner === 'draw' ? 'DRAW' : `${m.fighters[m.winner ?? 0].char.name.toUpperCase()} TAKES THE ROUND` : '';
    const combo = m.fighters.find(f => f.comboCount > 1);
    document.getElementById('combo')!.textContent = combo ? `${combo.comboCount} HITS / ${combo.comboDamage} DAMAGE` : '';
  }
  if (mode === 'training') {
    const f = m.fighters[0], a = f.attack;
    document.getElementById('frame-data')!.textContent = a ? `${a.name} · ${f.attackPhase} ${f.attackFrame} · ${a.startup}/${a.active}/${a.recovery}` : `State: ${f.vstate}`;
    const input = controls?.latest[0];
    const pressed = Object.entries(input ?? {}).filter(([,v])=>v).map(([k])=>k).join(' + ');
    if (pressed) document.getElementById('input-history')!.textContent = `Last input: ${pressed}`;
  }
  if (bridge.debug && m.tick % 15 === 0) document.getElementById('diagnostics')!.textContent = `${bridge.fps.toFixed(1)} FPS · ${(1000/Math.max(1,bridge.fps)).toFixed(1)} ms · tick ${m.tick} · ${2+m.projectiles.length} entities · ${bridge.particles} particles · FX ${bridge.visualQuality}`;
  if (m.phase === 'matchOver' && !resultShown) showResult();
}
function togglePause(): void {
  if (!bridge || resultShown) return;
  bridge.paused = !bridge.paused; controls?.clear();
  const overlay = document.getElementById('overlay')!;
  overlay.innerHTML = bridge.paused ? `<section class="modal"><p class="eyebrow">A MOMENT BETWEEN PAGES</p><h2>Paused</h2>${button('Resume fight','resume','class="primary"')}${button('Restart match','restart')}${button('Return to menu','exit')}</section>` : '';
  click('resume',togglePause); click('restart',()=>void startMatch()); click('exit',()=>{stopGame();home();});
}
function showResult(): void {
  if (!bridge) return;
  resultShown = true; controls?.clear();
  const m = bridge.match, won = m.matchWinner === 0;
  if (mode === 'versus' || mode === 'arcade') {
    save.matches++; if (won) save.wins++;
    if (mode === 'arcade' && save.arcade) {
      save.arcade=advanceArcade(save.arcade,won);
      if (!save.arcade && won) save.circuits++;
    }
    saveData(save);
  }
  const title = m.matchWinner === null ? 'A story unfinished.' : mode === 'local' ? `Player ${m.matchWinner+1} wins.` : won ? 'Your mark is made.' : 'A lesson in ink.';
  document.getElementById('overlay')!.innerHTML = `<section class="modal result"><p class="eyebrow">${m.matchWinner === null ? 'DRAW' : mode === 'local' ? 'MATCH COMPLETE' : won ? 'VICTORY' : 'DEFEAT'}</p><h2>${title}</h2><p>${selected.name} ${m.wins[0]} — ${m.wins[1]} ${opponent.name}</p>${button('Restart match','restart','class="primary"')}${button('Choose fighters','reselect')}${button('Return to menu','exit')}</section>`;
  if (mode === 'arcade' && won) {
    const finished = save.arcade === null;
    document.querySelector('.result h2')!.textContent = finished ? 'The circuit is yours.' : 'Another page turned.';
    document.getElementById('restart')?.remove();
    document.getElementById('reselect')?.insertAdjacentHTML('beforebegin',button(finished ? 'Start a new circuit' : 'Next bout →','next-bout','class="primary"'));
    click('next-bout',()=>{stopGame();selection('arcade');});
  }
  click('restart',()=>void startMatch()); click('reselect',()=>{stopGame();selection(mode);}); click('exit',()=>{stopGame();home();});
}
function showError(message: string): void {
  if (bridge) bridge.paused = true;
  const overlay = document.getElementById('overlay') ?? root;
  overlay.innerHTML = '<section class="modal"><h2>The page could not turn.</h2><p id="error-detail"></p><button id="error-home">Return to menu</button></section>';
  document.getElementById('error-detail')!.textContent = message;
  click('error-home',()=>{stopGame();home();});
}
document.addEventListener('visibilitychange',()=>{ if (document.hidden && bridge && !bridge.paused && !resultShown) togglePause(); });
window.addEventListener('blur',()=>{ if (bridge && !bridge.paused && !resultShown) togglePause(); });
window.addEventListener('error',e=>showError(e.message));
// Development-only, read-only observations for browser regression tests. No combat mutation API.
declare global { interface Window { __inkbreak?: { snapshot: () => MatchSnapshot | null; paused: () => boolean; visuals: () => unknown } } }
if (import.meta.env.DEV) window.__inkbreak = {
  snapshot: () => bridge?.match.snapshot() ?? null,
  paused: () => bridge?.paused ?? false,
  visuals: () => {
    const scene = game?.scene.scenes[0];
    return { sceneStatus:scene?.sys.settings.status, loadProgress:scene?.load.progress,
      inflight:scene?.load.inflight.size, frame:game?.loop.frame,
      zoom:scene?.cameras.main?.zoom, scrollX:scene?.cameras.main?.scrollX,
      tier:bridge?.visualQuality, particles:bridge?.particles };
  },
};
home();
