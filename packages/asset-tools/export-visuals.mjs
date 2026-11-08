import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { log } from 'node:console';
const root = new URL('../../', import.meta.url);
const source = await readFile(new URL('assets-source/arenas/sunspire.svg', root), 'utf8');
const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
if (!defs) throw new Error('Sunspire source must contain shared SVG definitions');
const layers = [...source.matchAll(/<!-- layer:(\w+) -->([\s\S]*?)<!-- \/layer -->/g)];
const expected = ['sky','city','court','floor','foreground'];
if (layers.map(layer => layer[1]).join() !== expected.join()) throw new Error('Sunspire layer order/IDs do not match the renderer contract');
const out = new URL('apps/web/public/assets/arenas/sunspire/',root);
await mkdir(out,{recursive:true});
for (const [,id,content] of layers) {
  await writeFile(new URL(`${id}.svg`,out),`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">\n${defs}\n${content}\n</svg>\n`);
}
await writeFile(new URL('manifest.json',out),JSON.stringify({ version:1, source:'assets-source/arenas/sunspire.svg', width:1600, height:900, layers:expected },null,2)+'\n');
log(`Exported ${layers.length} original Sunspire layers to ${fileURLToPath(out)}`);
