interface Props {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="bg-surface px-5 pb-3 pt-5 pt-safe-top">
      <h1 className="m-0 text-2xl font-bold text-text">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}
