export const bindingActions = ['left','right','up','light','heavy','skill','guard','ultimate','dash'] as const;
export type BindingAction = typeof bindingActions[number];
export type Bindings = Record<BindingAction,string>;
export const DEFAULT_BINDINGS: [Bindings,Bindings] = [
  { left:'KeyA',right:'KeyD',up:'KeyW',light:'KeyJ',heavy:'KeyK',skill:'KeyL',guard:'KeyU',ultimate:'KeyI',dash:'ShiftLeft' },
  { left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',light:'Numpad1',heavy:'Numpad2',skill:'Numpad3',guard:'Numpad4',ultimate:'Numpad5',dash:'Numpad0' },
];
export function defaultBindings(): [Bindings,Bindings] { return [{...DEFAULT_BINDINGS[0]},{...DEFAULT_BINDINGS[1]}]; }
export function keyLabel(code:string):string { return code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Arrow/,'').replace(/^Numpad/,'Num ').replace('ShiftLeft','L Shift').replace('ShiftRight','R Shift'); }
export function validBinding(code:unknown):code is string {
  return typeof code==='string' && /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Right|Up|Down)|Shift(Left|Right)|Space|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight)$/.test(code);
}
