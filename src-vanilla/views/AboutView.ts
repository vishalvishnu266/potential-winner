import { UIComponent } from '../framework';
import { Screen, NavHeader, Scroller, SectionTitle, KeyValueList, BigActionButton } from '../ui';
import { OtaController } from '../controllers';

export function AboutView(): UIComponent {
  const ota = OtaController.snapshot();
  return Screen([
    NavHeader({ title: 'About', back: true }),
    Scroller({
      children: [
        SectionTitle('OTA / build'),
        KeyValueList({
          rows: [
            { k: 'Bundle', v: ota.version },
            { k: 'Platform', v: ota.platform },
            { k: 'Status', v: ota.statusMessage },
          ],
        }),
        BigActionButton({
          icon: 'refresh',
          title: 'Check for update',
          subtitle: 'Poll the OTA server now',
          variant: 'primary',
          onClick: () => OtaController.checkNow(),
        }),
      ],
    }),
  ]);
}
