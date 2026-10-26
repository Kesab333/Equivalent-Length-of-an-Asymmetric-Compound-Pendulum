/* Coordinates the two instruments and stores paired experimental observations. */
import { CompoundPendulum } from './compound.js';
import { SimplePendulum } from './simple.js';
import { GEO, G_NOM } from './pendulum-model.js';
export { GEO, G, G_NOM, DEG } from './pendulum-model.js';

export function calcFromReading(r) {
  const Ta = r?.ta > 0 && r.N > 0 ? r.ta / r.N : null;
  const Ts = r?.ts > 0 && r.N > 0 ? r.ts / r.N : null;
  return {Ta, Ts, leq: Ta ? G_NOM * Ta ** 2 / (4 * Math.PI ** 2) : null,
    err: Ta && Ts ? Math.abs(Ta - Ts) / Ts * 100 : null};
}
export class ExperimentModel {
  constructor(config) {
    this.compound = new CompoundPendulum(config); this.simple = new SimplePendulum(config);
    this.active = 'compound'; this.readings = []; this.readingRevision = 0;
    this.toggles = Object.fromEntries(config.toggles.map(t => [t.id, t.checked !== false]));
    this.onSync = this.onMessage = null;
    for (const [id, child] of [['compound', this.compound], ['simple', this.simple]]) {
      child.onSync = (name, value) => {
        if (['angle', 'gateY', 'N'].includes(name) && this.active !== id) return;
        this.onSync?.(name, value);
      };
      child.onMessage = (text, kind) => this.notify(text, kind);
    }
    this.compound.parameters.c = this.compound.c;
  }
  get current() { return this[this.active]; }
  get parameters() { return {...this.compound.parameters, Ls: this.simple.Ls, angle: this.current.parameters.angle, N: this.current.parameters.N, speed: this.current.parameters.speed}; }
  get values() { return {...this.current.values, active: this.active, c: this.compound.c}; }
  get state() {
    return {...this.current.state, parameters: this.parameters, values: this.values, toggles: {...this.toggles},
      active: this.active, readings: this.readings, readingRevision: this.readingRevision,
      notice: this.notice?.until > performance.now() ? this.notice.text : null};
  }
  setActive(id) {
    if (!['compound', 'simple'].includes(id) || this.active === id) return;
    this.current.stopPendulum(true); this.current.computeOutputs();
    this.active = id; this.current.timer.reset(); this.current.computeOutputs();
    for (const key of ['angle', 'N', 'speed']) this.onSync?.(key, this.current.parameters[key]);
    this.onSync?.('gateY', this.current.gateY);
  }
  setParameter(name, value) {
    if (['N', 'speed'].includes(name)) {
      const applied = this.current.setParameter(name, value);
      this[this.active === 'simple' ? 'compound' : 'simple'].setParameter(name, applied);
      return applied;
    }
    if (name === 'angle' || name === 'gateY') return this.current.setParameter(name, value);
    if (name === 'Ls') { this.setActive('simple'); return this.simple.setParameter(name, value); }
    this.setActive('compound'); return this.compound.setParameter(name, value);
  }
  update(dt) { this.compound.update(dt); this.simple.update(dt); }
  start() { this.current.start(); this.current.computeOutputs(); }
  toggleRun() { this.current.toggleRun(); }
  reset() { this.current.reset(); }
  stopPendulum(instant = true) { this.current.stopPendulum(instant); this.current.computeOutputs(); }
  timerPress(action) {
    this.current.timerPress(action);
    if (action === 'nplus' || action === 'nminus') {
      const N = this.current.parameters.N;
      this[this.active === 'simple' ? 'compound' : 'simple'].setParameter('N', N);
      this.onSync?.('N', N);
    }
  }
  alignGate(instant) { this.current.alignGate(instant); }
  moveGate(y) { this.current.moveGate(y); }
  get gateY() { return this.current.gateY; }
  gateMax() { return this.current.gateMax(); }
  get free() { return this.compound.free; }
  get anim() { return this.compound.anim; }
  get theta() { return this.current.theta; }
  setPin(value) { return this.compound.setPin(value); }
  get pinOut() { return this.compound.pinOut; }
  get sPvis() { return this.compound.sPvis; }
  get lift() { return this.compound.lift; }
  pinTo(value) { this.compound.pinTo(value); }
  slideBar(value) { this.compound.slideBar(value); }
  settleBar() { this.compound.settleBar(); }
  grabBar(theta) { return this.current.grabBar(theta); }
  letGoBar() { this.current.letGoBar(); }
  holeList() { return this.compound.holeList(); }
  lMin() { return this.compound.lMin(); }
  lMax() { return this.compound.lMax(); }
  setToggle(id, enabled) { this.toggles[id] = enabled; }
  notify(text, kind) {
    this.notice = {text, until: performance.now() + 2600};
    this.onMessage?.(text, kind);
  }
  recordReading() {
    const p = this.current;
    if (!p.timer.done) { this.notify('Arm the timer, release the selected pendulum and wait for HOLD.', 'warn'); return false; }
    if (this.active === 'compound') {
      this.readings.push({time: performance.now(), c: p.c, l: p.l, L: p.L, m: p.parameters.m,
        discM: p.parameters.discM, x0: p.parameters.x0, N: p.timer.N, ta: p.timer.value});
    } else {
      const pending = this.readings.slice().reverse().find(r => r.ta != null && r.ts == null && r.N === p.timer.N);
      if (pending) { pending.Ls = p.Ls; pending.ts = p.timer.value; }
      else this.readings.push({time: performance.now(), N: p.timer.N, Ls: p.Ls, ts: p.timer.value});
    }
    if (this.readings.length > 20) this.readings.shift();
    this.readingRevision++; this.notify('Reading saved in Observation.', 'ok'); return true;
  }
  clearReadings() { this.readings.length = 0; this.readingRevision++; }
  deleteLastReading() { this.readings.pop(); this.readingRevision++; }
  setEquivalentLength() {
    const row = this.readings.slice().reverse().find(r => r.ta > 0);
    if (!row) { this.notify('Record a compound-pendulum trial first.', 'warn'); return false; }
    const length = calcFromReading(row).leq;
    if (length < this.simple.defs.Ls.min || length > this.simple.defs.Ls.max) {
      this.notify('The equivalent length is outside the simple pendulum adjustment range.', 'warn'); return false;
    }
    const applied = this.setParameter('Ls', length); this.onSync?.('Ls', applied); return true;
  }
  controlBounds() {
    const b = this.compound.discBounds(), c = this.compound;
    return { x0: b, c: {min: c.cgAt(b.min), max: c.cgAt(b.max), step: b.step * c.parameters.discM / c.M} };
  }
}
