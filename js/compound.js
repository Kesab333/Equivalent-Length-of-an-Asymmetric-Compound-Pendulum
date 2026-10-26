/* Asymmetric bar + sliding disc. Distances s are measured from the bar top. */
import { BasePendulumModel, G, GEO, fixedError } from './pendulum-model.js';
import { clamp } from './utils.js';

export class CompoundPendulum extends BasePendulumModel {
  constructor(config) {
    super(config);
    this.sP = this.nearestHole(this.sCG - config.variables.find(v => v.name === 'l').value);
    this.sPvis = this.sP; this.l = this.sCG - this.sP;
    this.syncHoleControls(this.sP); this.computePhysics(); this.reset(); this.alignGate(true);
    this.requestedPivotL = config.variables.find(v => v.name === 'l').value;
  }
  holeList() {
    const holes = [], pitch = GEO.holePitch;
    for (let k = Math.floor((this.L - .0125 + 1e-9) / pitch); k >= 1; k--) holes.push(Number((this.L - k * pitch).toFixed(6)));
    return holes;
  }
  lMax() { return this.sCG - this.holeList()[0]; }
  lMin() { return this.sCG - this.holeList().at(-1); }
  snapL(l) { return this.sCG - this.nearestHole(this.sCG - l); }
  sOfL(l) { return this.sCG - l; }
  syncHoleControls(hole) {
    this.parameters.slide = Number(hole.toFixed(6));
    this.parameters.l = Number((this.sCG - hole).toFixed(6));
    this.sync('slide', this.parameters.slide); this.sync('l', this.parameters.l);
  }
  computePhysics() {
    const { m, discM, x0 } = this.parameters, L = this.L, sd = L - x0;
    const M = m + discM;
    this.sCG = (m * L / 2 + discM * sd) / M;
    this.c = L - this.sCG; this.M = M;
    this.Icg = m * (L * L + GEO.barWidth ** 2) / 12 + m * (L / 2 - this.sCG) ** 2
      + .5 * discM * GEO.discRadius ** 2 + discM * (sd - this.sCG) ** 2;
    const nominal = this.sCG - this.sP;
    this.hh = Math.abs(nominal) < 1e-8 ? 0 : nominal - fixedError(this.sP, .0004);
    this.Ip = this.Icg + M * this.hh ** 2;
    this.k = M * G * this.hh / this.Ip; this.gamma = .012;
  }
  discBounds() {
    return { min: .075, max: Math.min(.45, this.L - .075), step: GEO.holePitch };
  }
  cgAt(x0) {
    const {m, discM} = this.parameters;
    return (m * this.L / 2 + discM * x0) / (m + discM);
  }
  setParameter(name, value) {
    if (!Number.isFinite(Number(value))) return this.parameters[name];
    if (name === 'l' || name === 'slide') {
      const hole = name === 'l' ? this.sCG - Number(value) : Number(value);
      super.setParameter('slide', hole);
      this.requestedPivotL = this.parameters.l;
      return this.parameters[name];
    }
    if (!['L', 'm', 'discM', 'x0', 'c'].includes(name)) {
      const applied = super.setParameter(name, value);
      if (name === 'l' || name === 'slide') this.requestedPivotL = this.parameters.l;
      return applied;
    }
    if (this.free || this.anim) {
      this.notify('Insert the pivot pin and finish re-hanging before changing the disc or bar.', 'warn');
      return name === 'c' ? this.c : this.parameters[name];
    }
    const requestedName = name, requestedL = this.requestedPivotL ?? this.l, def = this.defs[name];
    let next = Number(value);
    if (def && name !== 'c') next = clamp(next, def.min, def.max);
    this.stopPendulum(true); this.timer.reset();
    if (name === 'c') {
      const {m, discM} = this.parameters;
      next = (next * (m + discM) - m * this.L / 2) / discM;
      name = 'x0';
    }
    if (name === 'L') next = Number((Math.round(next / .01) * .01).toFixed(2));
    if (name === 'x0') {
      const b = this.discBounds(); next = clamp(Math.round(next / b.step) * b.step, b.min, b.max);
    }
    this.parameters[name] = next;
    this.L = this.parameters.L;
    const bounds = this.discBounds(); this.parameters.x0 = clamp(this.parameters.x0, bounds.min, bounds.max);
    this.computePhysics();
    this.sP = this.nearestHole(this.sCG - requestedL); this.sPvis = this.sP; this.l = this.sCG - this.sP;
    this.syncHoleControls(this.sP); this.computePhysics(); this.clearGateForBar(); this.alignGate(false);
    this.parameters.c = this.c;
    for (const key of ['L', 'm', 'discM', 'x0', 'c']) this.sync(key, this.parameters[key]);
    this.computeOutputs();
    return requestedName === 'c' ? this.c : this.parameters[name];
  }
  computeOutputs() {
    super.computeOutputs();
    Object.assign(this.values, { c: this.c, sCG: this.sCG, x0: this.parameters.x0, discM: this.parameters.discM, discRadius: GEO.discRadius, totalMass: this.M });
  }
  holeAligned() { return Math.abs(this.sPvis - this.nearestHole(this.sPvis)) < .0015; }
  commitHang() {
    this.free = false; this.sP = this.nearestHole(this.sPvis); this.sPvis = this.sP;
    this.l = this.sCG - this.sP; this.requestedPivotL = this.l;
    this.syncHoleControls(this.sP); this.computePhysics(); this.stopPendulum(true);
    this.timer.reset(); this.alignGate(false);
  }
  blockedAt(th, gx = 0, by = this.beamY) {
    if (super.blockedAt(th, gx, by)) return true;
    const ry = by - GEO.pivotY, s = Math.sin(th), c = Math.cos(th);
    const u = gx * s - ry * c, v = gx * c + ry * s;
    return (u - (this.L - this.parameters.x0 - this.sP)) ** 2 + v * v <= GEO.discRadius ** 2;
  }
}
