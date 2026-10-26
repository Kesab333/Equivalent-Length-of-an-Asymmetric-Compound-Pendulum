/* Simple pendulum, including the finite spherical bob correction from the source experiment. */
import { BasePendulumModel, IRTimer, G, DEG, GEO, fixedError } from './pendulum-model.js';
import { clamp } from './utils.js';

export class SimplePendulum {
  constructor(config) {
    this.parameters = Object.fromEntries(config.variables.map(v => [v.name, v.value]));
    this.defs = Object.fromEntries(config.variables.map(v => [v.name, v]));
    this.timer = new IRTimer(); this.press = {id: 0, action: ''};
    this.eps = fixedError(.12345, .0012); this.gamma = .008;
    this.Ls = this.parameters.Ls; this.gateY = .9; this.gateTween = null;
    this.readings = []; this.history = []; this.free = false; this.anim = null; this.pinOut = 0;
    this.onSync = null; this.onMessage = null;
    this.computePhysics(); this.reset(); this.alignGate(true);
  }
  sync(name, value) { this.onSync?.(name, value); }
  notify(text, kind = '') { this.onMessage?.(text, kind); }
  computePhysics() {
    const length = this.Ls + this.eps;
    this.k = G * length / (length ** 2 + .4 * GEO.bobRadius ** 2);
  }
  reset() {
    this.time = this.simTime = 0; this.theta = this.omega = 0;
    this.dragging = this.holding = this.braking = this.paused = false;
    this.timer.reset(); this.computeOutputs();
  }
  isAtRest() { return !this.dragging && Math.abs(this.theta) < .001 && Math.abs(this.omega) < .001; }
  setParameter(name, value) {
    if (!Number.isFinite(Number(value))) return this.parameters[name];
    const def = this.defs[name];
    let next = Number(value); if (def) next = clamp(next, def.min, def.max);
    if (name === 'N') next = Math.round(next);
    if (name === 'Ls') {
      next = Number(next.toFixed(3)); this.stopPendulum(true); this.timer.reset();
      this.Ls = next; this.computePhysics(); this.gateY = Math.min(this.gateY, this.gateMax()); this.alignGate(false);
    }
    if (name === 'angle') {
      this.theta = next * DEG; this.omega = 0; this.holding = next !== 0;
      this.dragging = this.braking = this.paused = false;
      if (this.timer.state === 'running' || this.timer.done) this.timer.reset();
    }
    if (name === 'N') this.timer.setN(next);
    if (name === 'gateY') { this.moveGate(next); return this.gateY; }
    this.parameters[name] = next; this.computeOutputs(); return next;
  }
  start() {
    this.theta = this.holding ? this.theta : this.parameters.angle * DEG;
    this.omega = 0; this.holding = this.dragging = this.braking = this.paused = false;
    this.computeOutputs();
  }
  stopPendulum() { this.theta = this.omega = 0; this.holding = this.dragging = this.braking = this.paused = false; this.computeOutputs(); }
  toggleRun() { this.paused = !this.paused; this.computeOutputs(); }
  grabBar(theta) {
    this.theta = clamp(theta, -GEO.maxDragAngle, GEO.maxDragAngle); this.omega = 0;
    this.dragging = true; this.holding = this.braking = this.paused = false;
    this.parameters.angle = Math.abs(this.theta / DEG); this.sync('angle', this.parameters.angle);
    return true;
  }
  letGoBar() { this.dragging = false; this.omega = 0; this.computeOutputs(); }
  blockedAt(th) {
    const ry = this.beamY - GEO.simplePivotY;
    const u = -ry * Math.cos(th), v = ry * Math.sin(th);
    return (u - this.Ls) ** 2 + v ** 2 <= GEO.bobRadius ** 2;
  }
  get beamY() { return this.gateY + .03; }
  gateMax() { return GEO.simplePivotY - this.Ls - GEO.bobRadius - GEO.gateClear; }
  gateTarget() { return GEO.simplePivotY - this.Ls - .03; }
  alignGate(instant = false) {
    const target = clamp(this.gateTarget(), GEO.gateMin, this.gateMax());
    if (instant) { this.gateY = target; this.gateTween = null; }
    else this.gateTween = {t: 0, y0: this.gateY, y1: target};
  }
  moveGate(y) { this.gateTween = null; this.gateY = clamp(y, GEO.gateMin, this.gateMax()); this.computeOutputs(); }
  timerPress(action) {
    this.press = {id: this.press.id + 1, action};
    if (action === 'start') this.timer.start();
    if (action === 'reset') this.timer.reset();
    if (action === 'nplus' || action === 'nminus') this.setParameter('N', this.parameters.N + (action === 'nplus' ? 1 : -1));
    this.computeOutputs();
  }
  update(dt) {
    if (this.gateTween) {
      const a = this.gateTween; a.t += dt; const q = Math.min(1, a.t / .7), e = q * q * (3 - 2 * q);
      this.gateY = a.y0 + (Math.min(a.y1, this.gateMax()) - a.y0) * e;
      if (q === 1) this.gateTween = null;
    }
    if (!this.paused) {
      const duration = Math.min(dt, .05) * this.parameters.speed;
      const n = Math.max(1, Math.ceil(duration / .0005)), h = duration / n;
      for (let i = 0; i < n; i++) {
        if (!this.dragging && !this.holding) {
          const old = this.theta;
          if (BasePendulumModel.prototype.stepBar.call(this, h)) {
            const blocked = this.blockedAt(this.theta);
            if (!this.gateBlocked && blocked) {
              let lo = 0, hi = 1;
              for (let j = 0; j < 8; j++) { const mid = (lo + hi) / 2; if (this.blockedAt(old + (this.theta - old) * mid)) hi = mid; else lo = mid; }
              this.timer.event(this.simTime + hi * h);
            }
            this.gateBlocked = blocked;
          }
        }
        this.simTime += h;
      }
      this.time = this.simTime; this.timer.tick(this.simTime);
    }
    this.computeOutputs();
  }
  computeOutputs() {
    this.gateBlocked = this.blockedAt(this.theta); this.gateAligned = this.blockedAt(0);
    const tm = this.timer;
    this.values = {
      L: this.Ls, Ls: this.Ls, m: .2, l: this.Ls, theta: this.theta, omega: this.omega, angle: this.theta / DEG,
      free: false, busy: false, pinOut: 0, holding: this.holding || this.dragging,
      swinging: !this.holding && !this.dragging && !this.isAtRest(),
      gateY: this.gateY, gateAligned: this.gateAligned, gateBlocked: this.gateBlocked,
      timerState: tm.state, timerValue: tm.value, timerN: tm.N, timerCount: tm.count, press: this.press,
      theoryPeriod: 2 * Math.PI / Math.sqrt(this.k)
    };
  }
  get state() {
    return {time: this.time, running: !this.paused && this.values.swinging, paused: this.paused,
      canStart: !this.values.swinging && !this.dragging && this.parameters.angle > 0, canPause: this.values.swinging || this.paused,
      complete: this.timer.done, parameters: {...this.parameters}, values: this.values, readings: [], history: []};
  }
}
