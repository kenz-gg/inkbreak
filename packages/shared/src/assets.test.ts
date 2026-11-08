import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { KAIEN } from './characters/kaien.js';
import { MIRA } from './characters/mira.js';
describe('development asset and move pipeline',()=>{
  it('exports a complete, current five-stratum arena manifest',()=>{
    const base='apps/web/public/assets/arenas/sunspire/';
    const manifest=JSON.parse(readFileSync(base+'manifest.json','utf8')) as {source:string;width:number;height:number;layers:string[]};
    expect(manifest.layers).toEqual(['sky','city','court','floor','foreground']);
    expect([manifest.width,manifest.height]).toEqual([1600,900]);
    const source=readFileSync(manifest.source,'utf8');
    for(const layer of manifest.layers) {
      const svg=readFileSync(base+layer+'.svg','utf8');
      expect(svg).toContain(`id="${layer}-layer"`);
      const content=source.split(`<!-- layer:${layer} -->`)[1]?.split('<!-- /layer -->')[0];
      expect(content).toBeTruthy(); expect(svg).toContain(content);
    }
  });
  it.each(['characters/kaien/portraits/kaien-portrait.svg', 'characters/mira/portraits/mira-portrait.svg', 'arenas/sunspire.svg'])('%s exists with SVG dimensions', file => {
    const path = `assets-source/${file}`; expect(existsSync(path)).toBe(true);
    const svg = readFileSync(path, 'utf8'); expect(svg).toContain('viewBox='); expect(svg).toContain('</svg>');
  });
  it('attack timings are valid and cancel graph has no cycles',()=>{
    for(const c of [KAIEN,MIRA]) {
      const attacks=Object.values(c.attacks);
      const visit=(id:string,path:string[])=>{
        expect(path).not.toContain(id);
        const def=attacks.find(a=>a.id===id); expect(def).toBeDefined();
        def?.cancels?.attackIds.forEach(next=>visit(next,[...path,id]));
      };
      for(const a of attacks) { expect(a.startup).toBeGreaterThan(0); expect(a.active).toBeGreaterThan(0); expect(a.recovery).toBeGreaterThan(0); visit(a.id,[]); }
    }
  });
});
