/* Experiment 10: equivalent simple pendulum for an asymmetric compound pendulum. */
import { calcFromReading, GEO, DEG, G_NOM } from './physics.js';
const fixed = (v, d = 3) => Number.isFinite(v) ? v.toFixed(d) : '—';
const last = s => s.readings.at(-1);
const derived = (s, key) => calcFromReading(last(s))[key] ?? '—';
export const LAB = {
  title: 'Equivalent Length of an Asymmetric Compound Pendulum',
  logo: 'images/nitk.webp', footer: 'Copyright © SOLVE The Virtual Lab @ NITK Surathkal',
  sections: [
    {id:'diagram',title:'Diagram',icon:'images/diagram.svg',accent:'#3b82f6',interactive:false},
    {id:'formula',title:'Formula',icon:'images/formula.svg',accent:'#8b5cf6',interactive:false},
    {id:'simulation',title:'Simulation',icon:'images/simulation.svg',accent:'#0d9488',interactive:true},
    {id:'observation',title:'Observation',icon:'images/observation.svg',accent:'#f59e0b',interactive:false},
    {id:'calculation',title:'Calculation',icon:'images/calculation.svg',accent:'#6366f1',interactive:false},
    {id:'results',title:'Results',icon:'images/results.svg',accent:'#f43f5e',interactive:false}
  ],
  diagram: {
    image:'images/Compound Pendulum Diagram.png',
    alt:'Compound pendulum: pivot O, centre of gravity G, angular displacement and forces',
    caption:'Compound-pendulum principle. A sliding disc changes G; a simple pendulum of length l_eq has the same small-angle period.'
  },
  labels: {start:'Release pendulum',pause:'Pause',resume:'Resume',reset:'Reset'},
  apparatus: [{id:'compound',label:'Asymmetric compound pendulum'},{id:'simple',label:'Simple pendulum'}],
  extraButtons: [
    {id:'arm',label:'Timer START',run:m=>m.timerPress('start')},
    {id:'treset',label:'Timer RESET',run:m=>m.timerPress('reset')},
    {id:'stop',label:'Stop pendulum',run:m=>m.stopPendulum(true)},
    {id:'align',label:'Auto-align gate',run:m=>m.alignGate(false)},
    {id:'record',label:'Record reading',run:m=>m.recordReading()},
    {id:'match',label:'Set Ls = equivalent length',run:m=>m.setEquivalentLength()},
    {id:'delete',label:'Delete last row',run:m=>m.deleteLastReading()},
    {id:'clear',label:'Clear readings',run:m=>m.clearReadings()}
  ],
  toggles:[{id:'beam',label:'IR beam',checked:true}],
  variables:[
    {name:'L',label:'Bar length, L',min:1,max:1.5,step:.01,value:1.5,unit:'m'},
    {name:'m',label:'Bar mass, m',min:.3,max:2,step:.01,value:1.2,unit:'kg'},
    {name:'discM',label:'Disc mass, M',min:.3,max:2.5,step:.01,value:1.3,unit:'kg'},
    {name:'c',label:'Set CG from bottom, c',min:.399,max:.594,step:.001,value:.503,unit:'m',snap:true,decimals:4},
    {name:'x0',label:'Disc centre from bottom, x₀',min:.075,max:.45,step:.025,value:.275,unit:'m',snap:true},
    {name:'l',label:'Pivot to CG, l (+ above CG)',min:-.5,max:1.4,step:.025,value:.5,unit:'m',snap:true},
    {name:'slide',label:'Slide bar: pivot hole from top',min:.025,max:1.475,step:.025,value:.5,unit:'m',snap:true},
    {name:'Ls',label:'Simple length to bob centre, Ls',min:.2,max:1.9,step:.001,value:1,unit:'m'},
    {name:'N',label:'Oscillations timed, N',min:1,max:20,step:1,value:10,unit:''},
    {name:'angle',label:'Set release angle, θ₀',min:0,max:GEO.maxDragAngle/DEG,step:.5,value:4,unit:'°'},
    {name:'gateY',label:'IR gate height above floor',min:.18,max:2.1,step:.001,value:.333,unit:'m'},
    {name:'pin',label:'Compound pivot pin (0 = in, 1 = out)',min:0,max:1,step:.01,value:0,unit:''},
    {name:'speed',label:'Simulation speed',min:1,max:20,step:1,value:5,unit:'×'}
  ],
  statusText:s=>{
    const v=s.values, name=s.active==='simple'?'Simple':'Compound';
    if(s.notice)return s.notice;
    if(v.busy)return 'Re-hanging the compound pendulum…';
    if(v.free)return 'Pin out — slide to a marked hole';
    if(s.active==='compound'&&v.l<=0)return 'Choose a pivot hole above the combined CG';
    if(s.paused)return name+' paused';
    if(v.holding)return name+' angle set — press Release';
    if(v.timerState==='done')return `${name}: t = ${fixed(v.timerValue)} s — record reading`;
    if(v.timerState==='running')return `${name}: timing ${v.timerCount} / ${v.timerN}`;
    if(v.timerState==='armed')return name+' timer armed — release pendulum';
    return name+(s.running?' swinging':' ready');
  },
  observationText:s=>'Time the asymmetric compound pendulum, record t_a, set Ls to its calculated equivalent length, then record t_s with the same N. '+
    'The simple reading fills the newest unpaired compound row with the same oscillation count. '+
    (s.readings.length?`${s.readings.length} trial row(s) saved.`:'No readings recorded yet.'),
  readingsTable:{
    title:'Paired observations: asymmetric compound and equivalent simple pendulum',
    emptyText:'Record a compound trial first, then a simple trial at the equivalent length.',
    columns:[
      {key:'c',label:'CG from bottom, c (m)',format:v=>fixed(v)},
      {key:'l',label:'l (m)',format:v=>fixed(v)},
      {key:'N',label:'N',format:v=>fixed(v,0)},
      {key:'ta',label:'t<sub>a</sub> (s)',format:v=>fixed(v)},
      {key:'Ls',label:'L<sub>s</sub> (m)',format:v=>fixed(v)},
      {key:'ts',label:'t<sub>s</sub> (s)',format:v=>fixed(v)},
      {key:'Ta',label:'T<sub>a</sub> (s)',format:(_,r)=>fixed(calcFromReading(r).Ta,4)},
      {key:'leq',label:'l<sub>eq</sub> (m)',format:(_,r)=>fixed(calcFromReading(r).leq,3)},
      {key:'Ts',label:'T<sub>s</sub> (s)',format:(_,r)=>fixed(calcFromReading(r).Ts,4)},
      {key:'err',label:'% Error',format:(_,r)=>fixed(calcFromReading(r).err,2)}
    ]
  },
  results:[
    {label:'Compound period, Ta',unit:'s',decimals:4,get:s=>derived(s,'Ta')},
    {label:'Equivalent length, l_eq',unit:'m',decimals:3,get:s=>derived(s,'leq')},
    {label:'Measured simple length, Ls',unit:'m',decimals:3,get:s=>last(s)?.Ls??'—'},
    {label:'Simple period, Ts',unit:'s',decimals:4,get:s=>derived(s,'Ts')},
    {label:'Period difference',unit:'%',decimals:2,get:s=>derived(s,'err')},
    {label:'CG from bottom, c',unit:'m',decimals:4,get:s=>last(s)?.c??'—'},
    {label:'Completed pairs',unit:'',decimals:0,get:s=>s.readings.filter(r=>r.ta&&r.ts).length}
  ],
  resultsBar:{label:'Agreement of periods',unit:'%',decimals:1,get:s=>{const e=calcFromReading(last(s)).err;return e==null?0:Math.max(0,100-e)},full:()=>100},
  formulas:[
    {id:'period',name:'Equivalent length from measured compound period',
      usage:'Find the simple pendulum length that matches the measured compound period $T_a=t_a/N$.',
      latex:'l_{eq}=\\frac{gT_a^2}{4\\pi^2}',
      variables:[{symbol:'l_{eq}',desc:'Equivalent simple pendulum length (m)'},{symbol:'T_a',desc:'Asymmetric compound period (s)'},{symbol:'g',desc:'Nominal gravity, 9.8 m/s²'}]},
    {id:'cg',name:'Combined centre of gravity',usage:'Move the disc along the bar to change the combined centre of gravity. Distances c and x₀ are measured from the bottom.',
      latex:'c=\\frac{mL/2+Mx_0}{m+M}',
      variables:[{symbol:'m, M',desc:'Bar mass and disc mass (kg)'},{symbol:'L',desc:'Bar length (m)'},{symbol:'x_0',desc:'Disc centre from the bottom (m)'},{symbol:'c',desc:'Combined CG from the bottom (m)'}]},
    {id:'compound',name:'Compound pendulum period',usage:'For small angular displacement about a pivot above the combined CG.',
      latex:'T_a=2\\pi\\sqrt{\\frac{I_O}{(m+M)gl}}',
      variables:[{symbol:'I_O',desc:'Combined moment of inertia about the pivot (kg m²)'},{symbol:'l',desc:'Pivot-to-combined-CG distance (m)'},{symbol:'m+M',desc:'Total mass (kg)'}]},
    {id:'simple',name:'Simple pendulum period',usage:'Measure Ls from the suspension point to the centre of the bob. This is the small-angle, point-bob approximation.',
      latex:'T_s=2\\pi\\sqrt{\\frac{L_s}{g}}',
      variables:[{symbol:'L_s',desc:'Suspension-to-bob-centre length (m)'},{symbol:'T_s=t_s/N',desc:'Measured simple-pendulum period (s)'}]},
    {id:'error',name:'Percentage difference in periods',usage:'Compare the two measured periods, using the simple period as the reference.',
      latex:'\\%\\,\\mathrm{error}=\\frac{|T_a-T_s|}{T_s}\\times100',
      variables:[{symbol:'T_a',desc:'Compound period (s)'},{symbol:'T_s',desc:'Simple period (s)'}]}
  ],
  calculation:{
    inputs:[
      {id:'L',label:'Bar length L (m)',value:1.5,step:.01,min:.01},
      {id:'m',label:'Bar mass m (kg)',value:1.2,step:.01,min:.01},
      {id:'M',label:'Disc mass M (kg)',value:1.3,step:.01,min:.01},
      {id:'x0',label:'Disc from bottom x₀ (m)',value:.275,step:.025,min:0},
      {id:'N',label:'Oscillations N',value:10,step:1,min:1},
      {id:'ta',label:'Compound time t_a (s)',value:17.9,step:.001,min:.001},
      {id:'ts',label:'Simple time t_s (s)',value:17.9,step:.001,min:.001}
    ],
    steps:[
      {key:'c',title:'Step 1: Combined centre of gravity',latex:'c=\\frac{mL/2+Mx_0}{m+M}',substitute:v=>`\\frac{${v.m}\\times${v.L}/2+${v.M}\\times${v.x0}}{${v.m}+${v.M}}`,compute:v=>(v.m*v.L/2+v.M*v.x0)/(v.m+v.M),unit:'m',digits:4},
      {key:'Ta',title:'Step 2: Compound period',latex:'T_a=t_a/N',substitute:v=>`${v.ta}/${v.N}`,compute:v=>v.ta/v.N,unit:'s',digits:4},
      {key:'leq',title:'Step 3: Equivalent simple length',latex:'l_{eq}=\\frac{gT_a^2}{4\\pi^2}',substitute:(v,r)=>`\\frac{${G_NOM}\\times${r.Ta.toFixed(4)}^2}{4\\pi^2}`,compute:(v,r)=>G_NOM*r.Ta**2/(4*Math.PI**2),unit:'m',digits:3},
      {key:'Ts',title:'Step 4: Simple period',latex:'T_s=t_s/N',substitute:v=>`${v.ts}/${v.N}`,compute:v=>v.ts/v.N,unit:'s',digits:4},
      {key:'err',title:'Step 5: Period difference',latex:'\\%\\,\\mathrm{error}=\\frac{|T_a-T_s|}{T_s}\\times100',substitute:(v,r)=>`\\frac{|${r.Ta.toFixed(4)}-${r.Ts.toFixed(4)}|}{${r.Ts.toFixed(4)}}\\times100`,compute:(v,r)=>Math.abs(r.Ta-r.Ts)/r.Ts*100,unit:'%',digits:2}
    ]
  },
  sideInfo:{
    diagram:{title:'Diagram terms',items:[
      {label:'$O,\\ G$',text:'Pivot and combined centre of gravity.'},
      {label:'$l,\\theta$',text:'Pivot-to-CG distance and angle from vertical.'},
      {label:'$mg$',text:'Weight; here use total mass $m+M$.'},
      {label:'$mg\\sin\\theta$',text:'Tangential restoring force.'},
      {label:'$mg\\cos\\theta$',text:'Force component along $OG$.'},
      {label:'$k_g$',text:'Radius of gyration: $I_G=(m+M)k_g^2$.'},
      {label:'$L_s=l_{eq}$',text:'Simple and compound periods match.'},
      {label:'SHM',text:'Small-angle limit: $\\sin\\theta\\approx\\theta$.'}
    ]},
    formula:{title:'Reference',items:[{label:'$g$',text:'$9.8\\,\\mathrm{m/s^2}$ for calculations.'},{label:'Disc radius',text:'$0.07\\,\\mathrm m$.'},{label:'Hole pitch',text:'$0.025\\,\\mathrm m$.'}]},
    observation:{title:'Paired readings',items:[{label:'First',text:'Record the compound trial.'},{label:'Then',text:'Set $L_s=l_{eq}$ and record the simple trial with the same $N$.'},{label:'Tip',text:'Keep both release angles at or below $5^\\circ$.'}]},
    results:{title:'Interpretation',items:[{label:'Source',text:'The latest saved observation row.'},{label:'Error',text:'$100|T_a-T_s|/T_s$; blank until both times are saved.'}]}
  },
  helpTitle:'Procedure & Operating Guide',helpSubtitle:'Choose a section or apparatus topic',
  help:[
    {id:'simulation',question:'Simulation procedure',title:'Measure an equivalent pendulum',subtitle:'Compound first, then simple',steps:[
      {title:'Set up the asymmetric bar',desc:'In Variables, move the disc with x₀ or Set CG from bottom. Defaults match the supplied experiment: L = 1.5 m, m = 1.2 kg, disc mass M = 1.3 kg, disc radius 0.07 m. Sliding the disc updates the actual combined CG.'},
      {title:'Choose a pivot',desc:'Slide bar or l chooses the nearest drilled hole; the slider and number box show the applied value. You can also stop the bar, pull the pin out, drag the bar vertically and push the pin back in. All holes are reachable; oscillation requires the pivot above the combined CG.'},
      {title:'Time the compound pendulum',desc:'Select Asymmetric compound pendulum under Measure with. Set a small angle (up to 5° for measurements) and N. Auto-align the gate, press Timer START, then Release pendulum. Wait for HOLD and Record reading.'},
      {title:'Match the simple length',desc:'Press Set Ls = equivalent length. This uses the newest recorded compound time and switches measurement to Simple pendulum. Ls is rounded to 1 mm and measured to the bob centre.'},
      {title:'Time the simple pendulum',desc:'Keep the same N and use a similarly small angle. Arm the timer, release, wait for HOLD and record. The simple time completes the newest unpaired compound row with the same N.'}
    ],tip:'A large angle is available for exploring motion; use small angles when comparing the small-angle formulas.'},
    {id:'apparatus',question:'Dragging and Variables',title:'Operate the apparatus',subtitle:'Every adjustment has a numeric control',steps:[
      {title:'Move the disc',desc:'Drag the copper disc vertically while the bar is stopped. Its centre snaps to 2.5 cm positions from the bottom; x₀ and the combined CG input show the actual values. Changing bar mass, disc mass or length also updates the combined CG.'},
      {title:'Move the bar',desc:'Pull the pivot pin out before manually sliding the bar. Release it near a marked hole; it snaps to the closest one. The gate retreats when needed. Use Slide bar for automatic re-hanging with the pin inserted.'},
      {title:'Set angle and length',desc:'Changing Set release angle visibly holds the selected pendulum until Release is pressed. Drag the bar or bob sideways to release by hand. The live θ readout is the actual angle. Change Ls to move the simple bob; geometry changes reset the affected timer.'},
      {title:'Gate, timer and view',desc:'Drag the IR gate vertically or edit its height. It follows the selected instrument. Timer buttons work on the bench and in Controls; N is in Variables. View offers whole bench, pivot, gate, timer and simple pendulum. Speed changes playback only.'},
      {title:'Stop or pause',desc:'Pause freezes the selected motion. Stop and Reset restore its actual angle to zero; Reset clears its timer but retains saved observations.'}
    ]},
    {id:'diagram',question:'Diagram',title:'Read the diagram',subtitle:'The shared compound-pendulum principle',steps:[
      {title:'Identify O and G',desc:'O is the pivot; G is the combined CG of the bar and disc. The diagram is schematic. Changing the disc position changes G and the measured period.'},
      {title:'Read the key',desc:'The short LaTeX key explains angle, restoring force, radius of gyration and equivalent length. The matching simple pendulum has Ls = l_eq.'}
    ]},
    {id:'formula',question:'Formula',title:'Choose a formula',steps:[
      {title:'Select an equation',desc:'Use the dropdown for equivalent length, combined CG, compound period, simple period or period error. Each equation lists its symbols and units.'},
      {title:'Keep the convention',desc:'c and x₀ are measured from the bottom; Slide bar is measured from the top. l is pivot to combined CG. Ls is suspension to bob centre.'}
    ]},
    {id:'observation',question:'Observation',title:'Save paired measurements',steps:[
      {title:'Record compound then simple',desc:'Record a completed compound timing. Set Ls to its equivalent length, measure the simple pendulum and Record reading. With matching N it fills the newest pending compound row.'},
      {title:'Review the row',desc:'The table includes c, l, N, t_a, Ls, t_s, T_a, l_eq, T_s and percentage error. Missing data stay blank until measured. Calculated columns are always visible.'},
      {title:'Manage readings',desc:'Delete last row removes the newest trial; Clear readings empties the table. Measurements are kept while changing sections and using Reset.'}
    ]},
    {id:'calculation',question:'Calculation',title:'Calculate from one trial',steps:[
      {title:'Copy measured values',desc:'Enter the masses, bar length, disc position, N and both timer readings from one observation row. These calculation inputs are separate from the live simulation.'},
      {title:'Follow the working',desc:'The steps calculate combined CG, T_a, equivalent length, T_s and percentage difference. Use metres, kilograms and seconds.'}
    ]},
    {id:'results',question:'Results',title:'Compare the periods',steps:[
      {title:'Read the newest trial',desc:'Results uses the latest saved row, showing both periods, equivalent length, measured Ls, period difference and count of complete pairs.'},
      {title:'Understand agreement',desc:'The agreement bar is 100 minus percentage error. Small deviations reflect timer precision, finite bob size, small geometry errors and finite release angle. A compound-only row has no period comparison yet.'}
    ]},
    {id:'dashboard',question:'Dashboard and navigation',title:'Navigate the experiment',steps:[
      {title:'Use the previews',desc:'The dashboard shows the live apparatus, the main equivalent-length formula, and section previews. Select a card or navigation icon to open it.'},
      {title:'Return and inspect',desc:'Close returns to the dashboard. Section changes restore the camera overview without clearing observations. Use View presets and the fullscreen buttons to inspect the apparatus.'}
    ]}
  ]
};
