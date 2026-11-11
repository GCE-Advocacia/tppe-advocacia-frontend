import ConteudoSections from '../components/ConteudoSections';
import type { LandingPageData } from '../types';

export interface LandingPageConteudoTabProps {
  data: LandingPageData;
  onChange: <K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => void;
}

export default function LandingPageConteudoTab({ data, onChange }: LandingPageConteudoTabProps) {
  return <ConteudoSections data={data} onChange={onChange} />;
}
