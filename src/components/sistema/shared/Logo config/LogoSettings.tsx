import { useRef } from 'react';
import { RotateCcw, Upload } from 'lucide-react';
import { LOGO_ACCEPT, LOGO_FIELDS, DEFAULT_LOGO_FIELDS } from '../../../../services/officeConfigService';
import type { LogoSettings as LogoPreferences, LogoSlot } from '../../../../services/officeConfigService';
import type { BrandingDraft } from './useBrandingDraft';
import styles from './LogoSettings.module.css';

interface AssetProps {
  slot: LogoSlot;
  title: string;
  backgrounds: ('light' | 'dark')[];
  draft: BrandingDraft;
  disabled: boolean;
}

function LogoAsset({ slot, title, backgrounds, draft, disabled }: AssetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const asset = draft.assets[slot];
  const file = asset?.kind === 'upload' ? asset.file : null;
  const preview = asset?.kind === 'upload' ? asset.preview : null;
  const savedDefault = draft.config?.[DEFAULT_LOGO_FIELDS[slot]] || null;
  const current = asset?.kind === 'reset' ? (asset.factory ? null : savedDefault) : draft.config?.[LOGO_FIELDS[slot]];
  const isDefault = !asset && !!current && current === savedDefault;
  const favicon = slot === 'favicon';
  const preparing = asset?.kind === 'upload' && asset.status === 'loading';
  const error = draft.errors[slot];

  function selectFile(file: File) {
    if (!disabled) void draft.select(slot, file);
  }

  return (
    <section className={styles.asset} aria-labelledby={`${slot}-title`} data-logo-slot={slot} aria-busy={preparing}>
      <h4 id={`${slot}-title`} className={styles.assetTitle}>{title}</h4>
      <div className={styles.layout}>
        <div className={styles.details}>
          <div className={styles.dropzone} data-image-upload
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); const selected = event.dataTransfer.files[0]; if (selected) selectFile(selected); }}>
            <Upload size={22} aria-hidden="true" />
            <p>Arraste uma imagem aqui ou escolha um arquivo.</p>
            <button type="button" className={styles.selectButton} disabled={disabled} onClick={() => inputRef.current?.click()}>
              {current || file ? 'Substituir imagem' : 'Selecionar imagem'}
            </button>
            <input ref={inputRef} type="file" accept={LOGO_ACCEPT} hidden disabled={disabled}
              aria-label={`Arquivo: ${title}`} aria-describedby="branding-upload-help"
              onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; if (selected) selectFile(selected); }} />
          </div>
          {file && <p className={styles.filename}>{file.name}</p>}
          {preparing && <p role="status" className={styles.hint}>Preparando imagem...</p>}
          {asset && <p className={styles.hint}>{asset.kind === 'reset' ? 'Restauração do padrão pendente.' : asset.kind === 'default' ? 'Novo padrão pendente.' : 'Imagem ainda não salva.'}</p>}
          {(file || current) && asset?.kind !== 'reset' && !isDefault && (
            <label className={styles.checkboxLabel}>
              <input type="checkbox" disabled={disabled}
                checked={asset?.kind === 'default' || (asset?.kind === 'upload' && asset.makeDefault)}
                onChange={event => draft.makeDefault(slot, event.target.checked)} />
              Usar esta imagem como padrão
            </label>
          )}
          {isDefault && <p className={styles.hint}>Esta é a imagem padrão.</p>}
          <div className={styles.actions}>
            {(current || file) && (
              <button type="button" className={styles.resetButton} disabled={disabled} onClick={() => draft.restore(slot)}>
                <RotateCcw size={16} />
                {favicon ? 'Restaurar ícone padrão' : 'Restaurar logo padrão'}
              </button>
            )}
            {savedDefault && (
              <button type="button" className={styles.resetButton} disabled={disabled} onClick={() => draft.restore(slot, true)}>Restaurar padrão original</button>
            )}
            {asset && <button type="button" className={styles.cancelButton} disabled={disabled} onClick={() => draft.undo(slot)}>Desfazer imagem</button>}
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div>
        <div className={styles.previews}>
          {backgrounds.map(background => {
            const fallback = favicon ? '/favicon.svg' : background === 'light' ? '/logo-dark.png' : '/logo.png';
            const source = preview || current || fallback;
            return (
              <div key={background}>
                <div className={`${styles.preview} ${background === 'dark' ? styles.dark : styles.light}`} data-image-preview>
                  <img key={source} src={source} className={favicon ? styles.faviconPreview : styles.previewImage}
                    alt={file ? 'Prévia da nova imagem' : title}
                    onError={event => {
                      if (preview && file) draft.previewFailed(slot, file);
                      else if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
                    }} />
                </div>
                <p className={styles.previewLabel}>{favicon ? 'Ícone na aba do navegador' : `Fundo ${background === 'light' ? 'claro' : 'escuro'}`}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function LogoSettings({ draft, saving }: { draft: BrandingDraft; saving: boolean }) {
  const sameThemes = draft.preferences.logo_same_for_themes;
  const sameSystem = draft.preferences.system_uses_landing_logo;
  const sameSystemThemes = draft.preferences.system_logo_same_for_themes;
  const disabled = saving || draft.loading || !draft.config;

  function preference(key: keyof LogoPreferences, value: boolean, label: string) {
    return <label className={styles.checkboxLabel}>
      <input type="checkbox" checked={value} disabled={disabled} onChange={event => draft.changePreference(key, event.target.checked)} />
      {label}
    </label>;
  }

  const assetProps = { disabled, draft };
  return (
    <div className={styles.settings}>
      <p id="branding-upload-help" className={styles.description}>
        Envie imagens PNG, JPG, WebP ou SVG de até 5 MB.
      </p>
      <div className={styles.options}>
        {preference('system_uses_landing_logo', sameSystem, 'Usar as logos da landing page no sistema')}
        {preference('logo_same_for_themes', sameThemes, 'Usar a mesma logo nos fundos claro e escuro da landing page')}
      </div>
      <LogoAsset {...assetProps} slot="landing-light" title={sameThemes ? 'Logo da landing page' : 'Landing page — fundo claro'} backgrounds={sameThemes ? ['light', 'dark'] : ['light']} />
      <div hidden={sameThemes}>
        <LogoAsset {...assetProps} slot="landing-dark" title="Landing page — fundo escuro" backgrounds={['dark']} />
      </div>
      <div hidden={sameSystem} className={styles.systemGroup}>
        <div className={styles.options}>
          {preference('system_logo_same_for_themes', sameSystemThemes, 'Usar a mesma logo nos fundos claro e escuro do sistema')}
        </div>
        <LogoAsset {...assetProps} slot="system-light" title={sameSystemThemes ? 'Logo do sistema' : 'Sistema — fundo claro'} backgrounds={sameSystemThemes ? ['light', 'dark'] : ['light']} />
        <div hidden={sameSystemThemes}>
          <LogoAsset {...assetProps} slot="system-dark" title="Sistema — fundo escuro" backgrounds={['dark']} />
        </div>
      </div>
      <LogoAsset {...assetProps} slot="favicon" title="Ícone da aba do navegador (favicon)" backgrounds={['light']} />
    </div>
  );
}
