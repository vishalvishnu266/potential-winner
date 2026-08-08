import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValueRow from '../components/KeyValueRow';
import Button from '../components/Button';

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
      <Section>
        <KeyValueRow label="Task ID" value={id} />
        {ref && <KeyValueRow label="Ref (query param)" value={ref} />}
        <KeyValueRow label="Route path" value={fullPath} />
        <p className="mt-3 text-xs text-muted">
          Try opening <code>dailygig://task/{id}?ref=push</code> from adb or a
          note-taking app on the phone.
        </p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </Section>
    </div>
  );
}
