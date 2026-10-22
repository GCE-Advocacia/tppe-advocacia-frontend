import { ImageIcon } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import CoresSection from '../components/CoresSection';
import LogoSettings from '../../../../components/sistema/shared/Logo config/LogoSettings';
import type { LandingPageData } from '../types';
import type { PersonalizacaoThemesController } from '../hooks/usePersonalizacaoThemes';
import type { OfficeConfigAPI } from '../../../../services/officeConfigService';
import type useBrandingDraft from '../../../../components/sistema/shared/Logo config/useBrandingDraft';

export interface IdentidadeVisualTabProps {
  data: LandingPageData;
  themes: PersonalizacaoThemesController;
  branding: ReturnType<typeof useBrandingDraft>;
  saving: boolean;
  applyConfig?: (cfg: OfficeConfigAPI) => void;
  onQuotaExceeded?: (msg: string) => void;
}

export default function IdentidadeVisualTab({
  data,
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

      {/* ── 2º Card: Paleta de Cores e Temas ── */}
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
