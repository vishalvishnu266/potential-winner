import { El, UIComponent } from '../framework';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { BigButton } from '../components/BigButton';
import { KeyValueRow } from '../components/KeyValueRow';
import { OtaController } from '../controllers';

export function AboutView(): UIComponent {
  const ota = OtaController.snapshot();
  return El('div').cls('col').add(
    PageHeader({ title: 'About', showBack: true }),
    El('main').cls('app-main').add(
      El('div').cls('card').add(
        Section({ title: 'OTA / build' }),
        KeyValueRow('Bundle', ota.version),
        KeyValueRow('Platform', ota.platform),
        KeyValueRow('Status', ota.statusMessage),
        El('div').style({ height: '12px' }),
        BigButton({
          title: 'Check for update',
          subtitle: 'Poll the OTA server now',
          icon: 'refresh',
          variant: 'primary',
          onClick: () => OtaController.checkNow(),
        }),
      ),
    ),
  );
}
