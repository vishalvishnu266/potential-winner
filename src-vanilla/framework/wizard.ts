/**
 * Swipeable Wizard container.
 *
 *   const wiz = createWizard([StepA(), StepB(), StepC()]);
 *   wrap.add(wiz.container, wiz.stepperEl);
 *   wiz.goto(1);
 */

import { El, UIComponent } from './dom';

export interface WizardHandle {
  container: UIComponent<'div'>;
  stepperEl: UIComponent<'div'>;
  goto: (i: number) => void;
  next: () => void;
  prev: () => void;
  index: () => number;
  count: number;
}

export function createWizard(steps: UIComponent[]): WizardHandle {
  const track = El('div').cls('step-container');
  for (const s of steps) {
    const shell = El('div').cls('step');
    shell.el.appendChild(s.el);
    track.add(shell);
  }
  const container = El('div').style({ overflow: 'hidden', width: '100%' }).add(track);
  const stepper = El('div').cls('stepper');
  const dots: HTMLElement[] = [];
  for (let i = 0; i < steps.length; i++) {
    const d = El('span').cls('dot');
    if (i === 0) d.cls('active');
    dots.push(d.el);
    stepper.add(d);
  }
  let idx = 0;
  const goto = (i: number): void => {
    idx = Math.max(0, Math.min(steps.length - 1, i));
    track.style({ transform: `translateX(${-idx * 100}%)` });
    dots.forEach((d, j) => {
      d.classList.remove('active', 'done');
      if (j === idx) d.classList.add('active');
      else if (j < idx) d.classList.add('done');
    });
  };
  return {
    container,
    stepperEl: stepper,
    goto,
    next: () => goto(idx + 1),
    prev: () => goto(idx - 1),
    index: () => idx,
    count: steps.length,
  };
}
