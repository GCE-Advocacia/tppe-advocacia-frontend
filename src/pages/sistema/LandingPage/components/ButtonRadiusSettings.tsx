import { useEffect, useId, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import styles from './ButtonRadiusSettings.module.css';

const PRESETS = [
  { label: 'Reto', value: '0px' },
  { label: 'Suave', value: '6px' },
  { label: 'Moderno', value: '12px' },
  { label: 'Pílula', value: '999px' },
];
const isPreset = (value: string) => PRESETS.some(preset => preset.value === value);

interface ButtonRadiusSettingsProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ButtonRadiusSettings({ value, onChange, disabled = false }: ButtonRadiusSettingsProps) {
  const id = useId();
  const [custom, setCustom] = useState(() => !isPreset(value));
  const lastValue = useRef(value);
  const pixels = Math.max(0, Math.min(24, Number.parseInt(value, 10) || 0));

  useEffect(() => {
    // Reset the mode for external changes (discard/reload), while allowing the
    // custom slider to pass through preset values such as 6px and 12px.
    if (lastValue.current !== value) {
      lastValue.current = value;
      setCustom(!isPreset(value));
    }
  }, [value]);

  function change(next: string, customMode: boolean) {
    lastValue.current = next;
    setCustom(customMode);
    onChange(next);
  }

  return (
    <div className={styles.settings} data-button-radius-settings>
      <p className={styles.description} id={`${id}-help`}>
        Escolha o formato dos botões da landing page, do sistema e do login.
        A mudança será aplicada ao salvar as alterações.
      </p>
      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.presets} role="group" aria-label="Presets de curvatura dos botões">
            {PRESETS.map(preset => (
              <button key={preset.value} type="button" className={styles.preset}
                aria-pressed={!custom && value === preset.value} disabled={disabled}
                aria-label={`${preset.label} (${preset.value})`}
                onClick={() => change(preset.value, false)}>
                <span className={styles.sample} style={{ borderRadius: preset.value }} aria-hidden="true" />
                <strong>{preset.label}</strong>
                <span className={styles.value}>{preset.value}</span>
              </button>
            ))}
          </div>
          <button type="button" className={styles.customButton}
            aria-pressed={custom} aria-expanded={custom} aria-controls={`${id}-custom`}
            disabled={disabled} onClick={() => change(`${pixels}px`, true)}>
            <Sparkles size={16} aria-hidden="true" /> Customizado
          </button>
          {custom && (
            <div className={styles.sliderPanel} id={`${id}-custom`}>
              <div className={styles.sliderLabel}>
                <label htmlFor={`${id}-range`}>Raio dos cantos</label>
                <output htmlFor={`${id}-range`} aria-live="polite">{pixels}px</output>
              </div>
              <input id={`${id}-range`} type="range" min="0" max="24" step="1"
                value={pixels} disabled={disabled} aria-describedby={`${id}-help`}
                aria-valuetext={`${pixels} pixels`}
                onChange={event => change(`${event.target.value}px`, true)} />
              <div className={styles.scale} aria-hidden="true"><span>0px</span><span>24px</span></div>
            </div>
          )}
        </div>
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Prévia do botão</span>
          <button type="button" className={styles.demoButton} style={{ borderRadius: value }}
            data-button-radius-preview aria-label="Botão de demonstração">
            Agendar consulta
          </button>
          <p>{custom ? `Personalizado · ${value}` : PRESETS.find(preset => preset.value === value)?.label}</p>
        </div>
      </div>
    </div>
  );
}
