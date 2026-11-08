import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Contract tests for the character art pipeline (docs/character-production-spec.md).
// The manifest is the single source of truth; runtime files in public/ must
// mirror source bytes exactly or these tests fail the build.

interface AssetEntry {
  characterId: string;
  kind: 'portrait' | 'pose' | 'expression' | 'effect' | 'construction' | 'concept';
  name: string;
  source: string;
  export: string;
  dimensions: [number, number];
  animation: string | null;
  license: string;
  status: string;
}
interface CharacterManifest {
  id: string;
  name: string;
  title: string;
  spec: string;
  completion: Record<string, string>;
  assets: AssetEntry[];
}
interface RootManifest {
  version: number;
  license: string;
  note: string;
  anchorStandards: Record<string, { canvas: number[]; anchor: number[] }>;
  lighting: string;
  characters: CharacterManifest[];
}

const read = (p: string) => readFileSync(p, 'utf8');
const manifest: RootManifest = JSON.parse(read('assets-source/characters/manifest.json'));

const svgAttrs = (svg: string) => {
  const root = svg.match(/<svg[^>]*>/)![0];
  const num = (name: string) => Number(root.match(new RegExp(`\\b${name}="(\\d+)"`))![1]);
  return {
    width: num('width'),
    height: num('height'),
    anchor: root.match(/\bdata-anchor="([\d.]+,[\d.]+)"/)?.[1] ?? null,
    pose: root.match(/\bdata-pose="([^"]+)"/)?.[1] ?? null,
    frame: root.match(/\bdata-frame="([^"]+)"/)?.[1] ?? null,
    asset: root.match(/\bdata-asset="([^"]+)"/)?.[1] ?? null,
  };
};

describe('character art pipeline', () => {
  it('declares the full four-character roster with license and lighting standards', () => {
    expect(manifest.version).toBe(1);
    expect(manifest.characters.map((c) => c.id)).toEqual(['kaien', 'mira', 'orun', 'selka']);
    expect(manifest.license.toLowerCase()).toContain('original');
    expect(manifest.lighting.toLowerCase()).toContain('upper-left');
  });

  it('gives every asset a complete manifest entry backed by a real file', () => {
    for (const char of manifest.characters) {
      expect(char.assets.length).toBeGreaterThanOrEqual(20);
      for (const asset of char.assets) {
        for (const key of ['characterId', 'kind', 'name', 'source', 'export', 'dimensions', 'animation', 'license', 'status'] as const) {
          expect(asset, `${char.id} ${asset.name ?? '?'}`).toHaveProperty(key);
        }
        expect(asset.characterId).toBe(char.id);
        expect(asset.license.toLowerCase()).toContain('original');
        // source path resolves inside the importable asset tree
        read(`assets-source/${asset.source}`);
      }
    }
  });

  it('embeds matching dimensions and anchors in every source SVG', () => {
    for (const char of manifest.characters) {
      for (const asset of char.assets) {
        const svg = read(`assets-source/${asset.source}`);
        const attrs = svgAttrs(svg);
        expect([attrs.width, attrs.height], `${asset.source}`).toEqual(asset.dimensions);
        const standard = manifest.anchorStandards[asset.kind];
        if (standard) {
          expect(attrs.anchor, `${asset.source} anchor`).toBe(standard.anchor.map(String).join(','));
          expect(attrs.asset).not.toBeNull();
        }
        if (asset.kind === 'pose') {
          expect(attrs.pose).toBe(asset.animation);
          if (asset.name.includes('frame')) expect(Number(attrs.frame)).toBeGreaterThan(0);
          else expect(attrs.frame).toBeNull();
        }
      }
    }
  });

  it('exports runtime files byte-identical to their sources with a frames index', () => {
    for (const char of manifest.characters) {
      for (const asset of char.assets) {
        const exported = read(`apps/web/public/${asset.export}`);
        expect(`${asset.export}: ${exported}`).toEqual(`${asset.export}: ${read(`assets-source/${asset.source}`)}`);
      }
      const frames = JSON.parse(read(`apps/web/public/assets/characters/${char.id}/frames.json`));
      expect(frames.canvas).toEqual([512, 640]);
      expect(frames.anchor.map(String).join(',')).toBe('256,560');
      const animations = [...new Set(char.assets.filter((a) => a.kind === 'pose').map((a) => a.animation!))];
      expect(Object.keys(frames.frames).sort()).toEqual(animations.sort());
      expect(animations.sort()).toEqual(['dash', 'defeat', 'guard', 'heavy-attack', 'hit-reaction', 'idle', 'jump', 'light-attack', 'run', 'skill', 'ultimate', 'victory', 'walk']);
      for (const files of Object.values(frames.frames) as string[][]) {
        for (const f of files) {
          expect(readFileSync(`apps/web/public/assets/characters/${char.id}/animations/${f}`)).toBeTruthy();
        }
      }
      if (char.assets.some((a) => a.kind === 'portrait')) {
        expect(frames.portrait).toMatch(new RegExp(`^${char.id}-portrait\\.svg$`));
      }
    }
  });

  it('mirrors validation metadata per character (portraits shipped or pending)', () => {
    for (const char of manifest.characters) {
      const hasPortrait = char.assets.some((a) => a.kind === 'portrait');
      if (hasPortrait) {
        expect(char.completion.portrait).not.toBe('pending');
        const svg = read(`assets-source/${char.assets.find((a) => a.kind === 'portrait')!.source}`);
        expect(svgAttrs(svg).anchor).toBe('150,400');
      } else {
        expect(char.completion.portrait).toBe('pending');
      }
      expect(char.completion.poses).toBe('development');
    }
  });

  it('keeps silhouette sheets readable without leaking character color', () => {
    for (const char of manifest.characters) {
      const svg = read(`assets-source/${char.assets.find((a) => a.kind === 'concept')!.source}`);
      expect(svg).toContain('silhouette directions');
      expect(svg).toContain('#4a4433');
    }
  });
});
