/**
 * App shell — persistent chrome that lives across route changes.
 *
 * Layout:
 *   <div.app-root>
 *     <div id="content-slot"></div>   ← routed view goes here
 *     <TabBar />                      ← persistent
 *     <OtaOverlay />                  ← persistent, self-updating
 *   </div>
 */

import { El } from './framework';
import { TabBar } from './components/TabBar';
import { OtaOverlay } from './views/OtaOverlay';
import { i18n } from './i18n';

export function buildShell(): { rootEl: HTMLElement; slot: HTMLElement; onRoute: (path: string) => void } {
  const root = El('div').cls('app-root');
  const slot = El('div').style({ flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' });

  const t = i18n.t.tab;
  const bar = TabBar({ home: t.home, work: t.work, post: t.post, local: t.local, me: t.me });

  root.add(slot, bar.root, OtaOverlay());

  return { rootEl: root.el, slot: slot.el, onRoute: bar.updateActive };
}
