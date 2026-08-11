import { UIComponent } from '../framework';
import { Screen, NavHeader, Scroller } from '../ui';
import { EmptyState } from '../components/EmptyState';

export function PlaceholderView(title: string, hint: string): UIComponent {
  return Screen([
    NavHeader({ title, back: true }),
    Scroller({ children: [EmptyState('🛠️', title, hint)] }),
  ]);
}
