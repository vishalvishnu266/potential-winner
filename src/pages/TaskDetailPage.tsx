import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const kvRow = 'flex justify-between gap-3 border-b border-border py-2 text-[13px]';
const kvCode = 'break-all text-right text-muted';

export default function TaskDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = String(params.id ?? '');
  const ref = searchParams.get('ref') || '';
  const fullPath = location.pathname + location.search;

  return (
    <div className="min-h-full">
      <PageHeader title={`Task #${id}`} subtitle="Opened via deep link or navigation" />
      <section className="px-5 py-3">
        <div className={kvRow}><span>Task ID</span><code className={kvCode}>{id}</code></div>
        {ref && <div className={kvRow}><span>Ref (query param)</span><code className={kvCode}>{ref}</code></div>}
        <div className={kvRow}><span>Route path</span><code className={kvCode}>{fullPath}</code></div>
        <p className="mt-3 text-xs text-muted">
          Try opening <code>dailygig://task/{id}?ref=push</code> from adb or a
          note-taking app on the phone.
        </p>
        <button
          className="mt-4 cursor-pointer rounded-[10px] border border-border bg-surface px-4 py-3 font-semibold text-text"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </section>
    </div>
  );
}
