import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const kvRow = 'flex justify-between gap-3 border-b border-border py-2 text-[13px]';
const kvCode = 'break-all text-right text-muted';

export default function RideDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = String(params.id ?? '');
  const fullPath = location.pathname + location.search;

  return (
    <div className="min-h-full">
      <PageHeader title={`Ride #${id}`} subtitle="Opened via deep link or navigation" />
      <section className="px-5 py-3">
        <div className={kvRow}><span>Ride ID</span><code className={kvCode}>{id}</code></div>
        <div className={kvRow}><span>Route path</span><code className={kvCode}>{fullPath}</code></div>
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
