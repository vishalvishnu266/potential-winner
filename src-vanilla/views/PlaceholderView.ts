/**
 * PlaceholderView — used for tabs whose real screens land in iteration B/C.
 * Keeps the app fully navigable + testable on device today.
 */

import { El, UIComponent } from '../framework';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function PlaceholderView(title: string, hint: string): UIComponent {
  return El('div').cls('col').add(
    PageHeader({ title }),
    El('main').cls('app-main').add(EmptyState('🛠️', title, hint)),
  );
}
