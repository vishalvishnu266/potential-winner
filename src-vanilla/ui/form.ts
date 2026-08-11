/** Form family — named, typed, haptic-aware. */

import { El, UIComponent } from '../framework';
import { haptics } from '../services';

// ---------- Field wrapper ---------------------------------------------------

export interface FieldProps {
  label?: string;
  hint?: string;
  control: UIComponent;
}

export function Field(p: FieldProps): UIComponent<'div'> {
  const wrap = El('div').cls('col').style({ gap: '4px' });
  if (p.label) wrap.add(El('span').cls('field-label').text(p.label));
  wrap.add(p.control);
  if (p.hint) wrap.add(El('div').cls('small').text(p.hint));
  return wrap;
}

// ---------- Text inputs -----------------------------------------------------

export interface TextFieldProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  autoFocus?: boolean;
}

export function TextField(p: TextFieldProps): UIComponent<'input'> {
  const input = El('input').cls('input').type('text');
  if (p.placeholder) input.placeholder(p.placeholder);
  if (p.value !== undefined) input.value(p.value);
  if (p.inputMode) input.attr('inputmode', p.inputMode);
  if (p.autoFocus) input.attr('autofocus', true);
  if (p.onChange) {
    input.el.addEventListener('input', () => p.onChange!((input.el as HTMLInputElement).value));
  }
  return input;
}

export interface TextAreaProps {
  value?: string;
  placeholder?: string;
  rows?: number;
  onChange?: (value: string) => void;
}

export function TextArea(p: TextAreaProps): UIComponent<'textarea'> {
  const ta = El('textarea').cls('input textarea');
  if (p.placeholder) ta.attr('placeholder', p.placeholder);
  if (p.rows) ta.attr('rows', p.rows);
  if (p.value !== undefined) ta.value(p.value);
  if (p.onChange) {
    ta.el.addEventListener('input', () => p.onChange!((ta.el as HTMLTextAreaElement).value));
  }
  return ta;
}

// ---------- Numeric Stepper -------------------------------------------------

export interface StepperProps {
  value: number;
  min?: number;
  step?: number;
  prefix?: string;
  onChange: (value: number) => void;
}

export function Stepper(p: StepperProps): UIComponent<'div'> {
  const min = p.min ?? 0;
  const step = p.step ?? 1;
  const row = El('div').cls('row').style({ gap: 'var(--sp-2)' });
  const dec = El('button').cls('btn').style({ minWidth: '44px' }).text('−');
  const val = El('div').cls('title num').style({ flex: '1', textAlign: 'center' })
    .text((p.prefix ?? '') + p.value);
  const inc = El('button').cls('btn').style({ minWidth: '44px' }).text('+');
  let current = p.value;
  const push = (): void => { val.text((p.prefix ?? '') + current); p.onChange(current); };
  dec.onClick(() => { current = Math.max(min, current - step); push(); void haptics.selection(); });
  inc.onClick(() => { current += step;                     push(); void haptics.selection(); });
  row.add(dec, val, inc);
  return row;
}

// ---------- Chip preset row (e.g. budget presets) --------------------------

export interface PresetChipsProps<T> {
  options: T[];
  value?: T;
  format?: (v: T) => string;
  onSelect: (v: T) => void;
}

export function PresetChips<T>(p: PresetChipsProps<T>): UIComponent<'div'> {
  const row = El('div').cls('row wrap').style({ gap: 'var(--sp-2)' });
  const fmt = p.format ?? ((v: T) => String(v));
  for (const opt of p.options) {
    const c = El('button').cls('chip').text(fmt(opt))
      .onClick(() => { void haptics.selection(); p.onSelect(opt); });
    if (opt === p.value) c.cls('active');
    row.add(c);
  }
  return row;
}

// ---------- Segmented control ----------------------------------------------

export interface SegmentedOption<T> { value: T; label: string; }
export interface SegmentedControlProps<T> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  maxWidth?: string;
}

export function SegmentedControl<T>(p: SegmentedControlProps<T>): UIComponent<'div'> {
  const seg = El('div').cls('seg');
  if (p.maxWidth) seg.style({ maxWidth: p.maxWidth });
  for (const opt of p.options) {
    const b = El('button').text(opt.label).onClick(() => {
      if (opt.value === p.value) return;
      void haptics.selection();
      p.onChange(opt.value);
    });
    if (opt.value === p.value) b.cls('active');
    seg.add(b);
  }
  return seg;
}

// ---------- Chip row (filter chips) ----------------------------------------

export interface FilterChip<T> { value: T; label: string; }
export interface ChipRowProps<T> {
  options: FilterChip<T>[];
  value: T;
  onSelect: (v: T) => void;
}

export function ChipRow<T>(p: ChipRowProps<T>): UIComponent<'div'> {
  const row = El('div').cls('h-scroll').style({ marginTop: '-4px' });
  for (const opt of p.options) {
    const c = El('button').cls('chip').text(opt.label).onClick(() => {
      void haptics.selection();
      p.onSelect(opt.value);
    });
    if (opt.value === p.value) c.cls('active');
    row.add(c);
  }
  return row;
}
