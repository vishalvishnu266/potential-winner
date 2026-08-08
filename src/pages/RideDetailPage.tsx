import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValueRow from '../components/KeyValueRow';
import Button from '../components/Button';

export default function RideDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = String(params.id ?? '');
  const fullPath = location.pathname + location.search;

  return (
    <div className="min-h-full">
      <PageHeader title={`Ride #${id}`} subtitle="Opened via deep link or navigation" />
      <Section>
        <KeyValueRow label="Ride ID" value={id} />
        <KeyValueRow label="Route path" value={fullPath} />
        <Button className="mt-4" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </Section>
    </div>
  );
}
