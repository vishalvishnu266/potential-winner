import { HTMLAttributes, ReactNode } from 'react';

interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  children: ReactNode;
}

/**
 * A padded page section with an optional heading. Encapsulates the
 * `px-5 py-3` + `<h3 class="…">` pattern repeated on every page.
 */
export default function Section({
  title,
  children,
  className = '',
  ...rest
}: SectionProps) {
  return (
    <section className={`px-5 py-3 ${className}`.trim()} {...rest}>
      {title && (
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">{title}</h3>
      )}
      {children}
    </section>
  );
}
