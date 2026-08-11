import { El, UIComponent } from '../framework';

export function Skeleton(height = 16, width: string = '100%'): UIComponent<'div'> {
  return El('div').cls('skeleton').style({ height: `${height}px`, width });
}

export function SkeletonList(rows = 4): UIComponent<'div'> {
  const wrap = El('div').cls('col');
  for (let i = 0; i < rows; i++) {
    wrap.add(
      El('div').cls('card').add(
        Skeleton(16, '60%'),
        El('div').style({ height: '8px' }),
        Skeleton(12, '90%'),
      ),
    );
  }
  return wrap;
}
