import { ImageIcon, RectangleHorizontal } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import CoresSection from '../components/CoresSection';
import ButtonRadiusSettings from '../components/ButtonRadiusSettings';
import LogoSettings from '../../../../components/sistema/shared/Logo config/LogoSettings';
import type { LandingPageData } from '../types';
import type { PersonalizacaoThemesController } from '../hooks/usePersonalizacaoThemes';
import type { OfficeConfigAPI } from '../../../../services/officeConfigService';
import type useBrandingDraft from '../../../../components/sistema/shared/Logo config/useBrandingDraft';

export interface IdentidadeVisualTabProps {
  data: LandingPageData;
  onChange: <K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => void;
  themes: PersonalizacaoThemesController;
  branding: ReturnType<typeof useBrandingDraft>;
  saving: boolean;
  applyConfig?: (cfg: OfficeConfigAPI) => void;
  onQuotaExceeded?: (msg: string) => void;
}

export default function IdentidadeVisualTab({
  data,
  onChange,
  themes,
  branding,
  saving,
  applyConfig,
  onQuotaExceeded,
}: IdentidadeVisualTabProps) {
  return (
    <>
      {/* ── 1º Card: Logos e ícone do navegador ── */}
      <SectionCard icon={<ImageIcon size={20} />} title="Logos e ícone do navegador">
        <LogoSettings draft={branding} saving={saving} />
      </SectionCard>

      <SectionCard icon={<RectangleHorizontal size={20} />} title="Curvatura dos botões">
        <ButtonRadiusSettings
          value={data.buttonRadius}
          onChange={value => onChange('buttonRadius', value)}
          disabled={saving}
        />
      </SectionCard>

      <CoresSection
        data={data}
        themes={themes}
        brandingSave={branding.save}
        applyConfig={applyConfig}
        onQuotaExceeded={onQuotaExceeded}
      />
    </>
  );
}
