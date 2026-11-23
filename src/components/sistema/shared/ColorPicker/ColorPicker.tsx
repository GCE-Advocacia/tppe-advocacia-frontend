import * as React from "react";
import { Pipette } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SliderPrimitive from "@radix-ui/react-slider";

import styles from "./ColorPicker.module.css";

const ROOT_NAME = "ColorPicker";
const TRIGGER_NAME = "ColorPickerTrigger";
const CONTENT_NAME = "ColorPickerContent";
const AREA_NAME = "ColorPickerArea";
const HUE_SLIDER_NAME = "ColorPickerHueSlider";
const ALPHA_SLIDER_NAME = "ColorPickerAlphaSlider";
const SWATCH_NAME = "ColorPickerSwatch";
const EYE_DROPPER_NAME = "ColorPickerEyeDropper";
const FORMAT_SELECT_NAME = "ColorPickerFormatSelect";
const INPUT_NAME = "ColorPickerInput";

export const colorFormats = ["hex", "rgb", "hsl", "hsb"] as const;
export type ColorFormat = (typeof colorFormats)[number];

export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSVColorValue {
  h: number;
  s: number;
  v: number;
  a: number;
}

// ── Color conversion helpers ──────────────────────────────────────
export function hexToRgb(hex: string, alpha?: number): ColorValue {
  let cleanHex = (hex || "#000000").trim().replace(/^#/, "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(cleanHex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
        a: alpha ?? (result[4] ? Number.parseInt(result[4], 16) / 255 : 1),
      }
    : { r: 0, g: 0, b: 0, a: alpha ?? 1 };
}

export function rgbToHex(color: ColorValue): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    const hex = clamped.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  const alpha = color.a < 1 ? toHex(color.a * 255) : '';
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${alpha}`.toUpperCase();
}

export function rgbToHsv(color: ColorValue): HSVColorValue {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / diff) % 6;
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : diff / max;
  const v = max;

  return {
    h,
    s: Math.round(s * 100),
    v: Math.round(v * 100),
    a: color.a,
  };
}

export function hsvToRgb(hsv: HSVColorValue): ColorValue {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0;
  let g = 0;
  let b = 0;

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsv.a,
  };
}

export function rgbToHsl(color: ColorValue) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;

  const l = sum / 2;
  let h = 0;
  let s = 0;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    if (max === r) {
      h = (g - b) / diff + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / diff + 2;
    } else if (max === b) {
      h = (r - g) / diff + 4;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(
  hsl: { h: number; s: number; l: number },
  alpha = 1,
): ColorValue {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 1 / 6 && h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 2 / 6 && h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 3 / 6 && h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 4 / 6 && h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 5 / 6 && h <= 1) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: alpha,
  };
}

export function parseColorString(value: string): ColorValue | null {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/);
  if (hexMatch) {
    return hexToRgb(`#${hexMatch[1]}`);
  }
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgbMatch) {
    const clamp255 = (n: number) => Math.max(0, Math.min(255, n));
    const clampAlpha = (n: number) => Math.max(0, Math.min(1, n));
    return {
      r: clamp255(Number.parseInt(rgbMatch[1] ?? "0", 10)),
      g: clamp255(Number.parseInt(rgbMatch[2] ?? "0", 10)),
      b: clamp255(Number.parseInt(rgbMatch[3] ?? "0", 10)),
      a: rgbMatch[4] ? clampAlpha(Number.parseFloat(rgbMatch[4])) : 1,
    };
  }
  return null;
}

export function colorToString(
  color: ColorValue,
  format: ColorFormat = "hex",
): string {
  switch (format) {
    case "hex":
      return rgbToHex(color);
    case "rgb":
      return color.a < 1
        ? `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
        : `rgb(${color.r}, ${color.g}, ${color.b})`;
    case "hsl": {
      const hsl = rgbToHsl(color);
      return color.a < 1
        ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${color.a})`
        : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    case "hsb": {
      const hsv = rgbToHsv(color);
      return color.a < 1
        ? `hsba(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${color.a})`
        : `hsb(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
    }
    default:
      return rgbToHex(color);
  }
}

// ── Context ───────────────────────────────────────────────────────
export interface ColorPickerContextValue {
  color: ColorValue;
  setColor: (value: ColorValue) => void;
  hsv: HSVColorValue;
  setHsv: (value: HSVColorValue) => void;
  format: ColorFormat;
  setFormat: (value: ColorFormat) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  disabled: boolean;
  inline: boolean;
}

const ColorPickerContext = React.createContext<ColorPickerContextValue | null>(null);

export function useColorPickerContext(consumerName: string): ColorPickerContextValue {
  const context = React.useContext(ColorPickerContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

export function useStore<U>(selector: (state: ColorPickerContextValue) => U): U {
  const context = useColorPickerContext("useStore");
  return selector(context);
}

// ── ColorPicker (Root) ────────────────────────────────────────────
export interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  format?: ColorFormat;
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  inline?: boolean;
  children?: React.ReactNode;
}

export function ColorPicker(props: ColorPickerProps) {
  const {
    value: valueProp,
    defaultValue = "#000000",
    onValueChange,
    format: formatProp,
    defaultFormat = "hex",
    onFormatChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
    inline = false,
    children,
  } = props;

  const [formatState, setFormatState] = React.useState<ColorFormat>(formatProp ?? defaultFormat);
  const [openState, setOpenState] = React.useState<boolean>(openProp ?? defaultOpen);

  const initialParsed = React.useMemo(() => hexToRgb(valueProp ?? defaultValue), []);
  const [colorState, setColorState] = React.useState<ColorValue>(initialParsed);
  const [hsvState, setHsvState] = React.useState<HSVColorValue>(() => rgbToHsv(initialParsed));

  // Sincroniza valueProp vindo de fora
  React.useEffect(() => {
    if (valueProp !== undefined) {
      const parsed = hexToRgb(valueProp);
      if (rgbToHex(parsed) !== rgbToHex(colorState)) {
        setColorState(parsed);
        setHsvState(rgbToHsv(parsed));
      }
    }
  }, [valueProp]);

  // Sincroniza openProp
  React.useEffect(() => {
    if (openProp !== undefined) {
      setOpenState(openProp);
    }
  }, [openProp]);

  const setOpen = React.useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  const setFormat = React.useCallback((nextFormat: ColorFormat) => {
    setFormatState(nextFormat);
    onFormatChange?.(nextFormat);
  }, [onFormatChange]);

  const setColor = React.useCallback((nextColor: ColorValue) => {
    setColorState(nextColor);
    setHsvState(rgbToHsv(nextColor));
    if (onValueChange) {
      // The format selector changes editing controls; persisted values remain HEX.
      onValueChange(rgbToHex(nextColor));
    }
  }, [formatState, onValueChange]);

  const setHsv = React.useCallback((nextHsv: HSVColorValue) => {
    const nextColor = hsvToRgb(nextHsv);
    setHsvState(nextHsv);
    setColorState(nextColor);
    if (onValueChange) {
      onValueChange(rgbToHex(nextColor));
    }
  }, [formatState, onValueChange]);

  const contextValue = React.useMemo<ColorPickerContextValue>(() => ({
    color: colorState,
    setColor,
    hsv: hsvState,
    setHsv,
    format: formatState,
    setFormat,
    open: openState,
    setOpen,
    disabled,
    inline,
  }), [colorState, setColor, hsvState, setHsv, formatState, setFormat, openState, setOpen, disabled, inline]);

  if (inline) {
    return (
      <ColorPickerContext.Provider value={contextValue}>
        <div data-slot="color-picker-root">{children}</div>
      </ColorPickerContext.Provider>
    );
  }

  return (
    <ColorPickerContext.Provider value={contextValue}>
      <PopoverPrimitive.Root open={openState} onOpenChange={setOpen}>
        <div data-slot="color-picker-root">{children}</div>
      </PopoverPrimitive.Root>
    </ColorPickerContext.Provider>
  );
}

// ── ColorPickerTrigger ────────────────────────────────────────────
export interface ColorPickerTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
  asChild?: boolean;
}

export function ColorPickerTrigger(props: ColorPickerTriggerProps) {
  const { asChild = false, disabled, children, ...triggerProps } = props;
  const context = useColorPickerContext(TRIGGER_NAME);
  const isDisabled = disabled || context.disabled;

  return (
    <PopoverPrimitive.Trigger
      asChild={asChild}
      disabled={isDisabled}
      {...triggerProps}
    >
      {children}
    </PopoverPrimitive.Trigger>
  );
}

// ── ColorPickerContent ────────────────────────────────────────────
export interface ColorPickerContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  className?: string;
  children?: React.ReactNode;
}

export function ColorPickerContent(props: ColorPickerContentProps) {
  const {
    className = "",
    children,
    sideOffset = 6,
    align = "start",
    ...contentProps
  } = props;
  const context = useColorPickerContext(CONTENT_NAME);

  if (context.inline) {
    return (
      <div
        data-slot="color-picker-content"
        className={`${styles.content} ${className}`.trim()}
      >
        {children}
      </div>
    );
  }

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="color-picker-content"
        sideOffset={sideOffset}
        align={align}
        className={`${styles.content} ${className}`.trim()}
        {...contentProps}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

// ── ColorPickerArea ───────────────────────────────────────────────
export interface ColorPickerAreaProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ColorPickerArea(props: ColorPickerAreaProps) {
  const { className = "", ...areaProps } = props;
  const context = useColorPickerContext(AREA_NAME);
  const { hsv, setHsv, disabled } = context;

  const isDraggingRef = React.useRef(false);
  const areaRef = React.useRef<HTMLDivElement>(null);

  const updateColorFromPosition = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!areaRef.current) return;
      const rect = areaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(
        0,
        Math.min(1, 1 - (clientY - rect.top) / rect.height),
      );

      const newHsv: HSVColorValue = {
        h: hsv.h,
        s: Math.round(x * 100),
        v: Math.round(y * 100),
        a: hsv.a ?? 1,
      };

      setHsv(newHsv);
    },
    [hsv, setHsv],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      isDraggingRef.current = true;
      areaRef.current?.setPointerCapture(event.pointerId);
      updateColorFromPosition(event.clientX, event.clientY);
    },
    [disabled, updateColorFromPosition],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        updateColorFromPosition(event.clientX, event.clientY);
      }
    },
    [updateColorFromPosition],
  );

  const onPointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = false;
      try {
        areaRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        // já liberado
      }
    },
    [],
  );

  const hue = hsv.h;
  const backgroundHue = hsvToRgb({ h: hue, s: 100, v: 100, a: 1 });

  return (
    <div
      ref={areaRef}
      data-slot="color-picker-area"
      className={`${styles.area} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      {...areaProps}
    >
      <div className={styles.areaLayers}>
        <div
          className={styles.areaHueBase}
          style={{
            backgroundColor: `rgb(${backgroundHue.r}, ${backgroundHue.g}, ${backgroundHue.b})`,
          }}
        />
        <div className={styles.areaWhiteGradient} />
        <div className={styles.areaBlackGradient} />
      </div>
      <div
        className={styles.areaThumb}
        style={{
          left: `${hsv.s}%`,
          top: `${100 - hsv.v}%`,
        }}
      />
    </div>
  );
}

// ── ColorPickerHueSlider ──────────────────────────────────────────
export interface ColorPickerHueSliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {}

export function ColorPickerHueSlider(props: ColorPickerHueSliderProps) {
  const { className = "", ...sliderProps } = props;
  const { hsv, setHsv, disabled } = useColorPickerContext(HUE_SLIDER_NAME);

  const onValueChange = React.useCallback(
    (values: number[]) => {
      setHsv({
        ...hsv,
        h: values[0] ?? 0,
      });
    },
    [hsv, setHsv],
  );

  return (
    <SliderPrimitive.Root
      data-slot="color-picker-hue-slider"
      max={360}
      step={1}
      value={[hsv.h]}
      onValueChange={onValueChange}
      disabled={disabled}
      className={`${styles.sliderRoot} ${className}`.trim()}
      {...sliderProps}
    >
      <SliderPrimitive.Track className={styles.hueTrack}>
        <SliderPrimitive.Range className={styles.sliderRange} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={styles.sliderThumb} />
    </SliderPrimitive.Root>
  );
}

// ── ColorPickerAlphaSlider ────────────────────────────────────────
export interface ColorPickerAlphaSliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {}

export function ColorPickerAlphaSlider(props: ColorPickerAlphaSliderProps) {
  const { className = "", ...sliderProps } = props;
  const { color, setColor, disabled } = useColorPickerContext(ALPHA_SLIDER_NAME);

  const onValueChange = React.useCallback(
    (values: number[]) => {
      const alpha = (values[0] ?? 100) / 100;
      setColor({ ...color, a: alpha });
    },
    [color, setColor],
  );

  const gradientColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

  return (
    <SliderPrimitive.Root
      data-slot="color-picker-alpha-slider"
      max={100}
      step={1}
      value={[Math.round((color.a ?? 1) * 100)]}
      onValueChange={onValueChange}
      disabled={disabled}
      className={`${styles.sliderRoot} ${className}`.trim()}
      {...sliderProps}
    >
      <SliderPrimitive.Track className={styles.alphaTrack}>
        <div
          className={styles.alphaColorOverlay}
          style={{
            background: `linear-gradient(to right, transparent, ${gradientColor})`,
          }}
        />
        <SliderPrimitive.Range className={styles.sliderRange} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={styles.sliderThumb} />
    </SliderPrimitive.Root>
  );
}

// ── ColorPickerSwatch ─────────────────────────────────────────────
export interface ColorPickerSwatchProps
  extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}

export function ColorPickerSwatch(props: ColorPickerSwatchProps) {
  const { className = "", style, color: colorProp, ...swatchProps } = props;
  const { color, format } = useColorPickerContext(SWATCH_NAME);

  const colorString = colorProp || (color
    ? `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
    : "#000000");

  return (
    <div
      role="img"
      aria-label={`Cor selecionada: ${color ? colorToString(color, format) : "nenhuma"}`}
      data-slot="color-picker-swatch"
      className={`${styles.swatch} ${className}`.trim()}
      style={{
        backgroundColor: colorString,
        ...style,
      }}
      {...swatchProps}
    />
  );
}

// ── ColorPickerEyeDropper ─────────────────────────────────────────
export interface ColorPickerEyeDropperProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function ColorPickerEyeDropper(props: ColorPickerEyeDropperProps) {
  const { className = "", children, disabled, ...buttonProps } = props;
  const { color, setColor, disabled: contextDisabled } = useColorPickerContext(EYE_DROPPER_NAME);

  const isDisabled = disabled || contextDisabled;

  const onEyeDropper = React.useCallback(async () => {
    if (typeof window === "undefined" || !("EyeDropper" in window)) return;
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const result = await eyeDropper.open();
      if (result.sRGBHex) {
        const currentAlpha = color?.a ?? 1;
        const newColor = hexToRgb(result.sRGBHex, currentAlpha);
        setColor(newColor);
      }
    } catch {
      // cancelado
    }
  }, [color, setColor]);

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
  if (!hasEyeDropper) return null;

  return (
    <button
      type="button"
      data-slot="color-picker-eye-dropper"
      title="Conta-gotas (capturar cor)"
      className={`${styles.eyeDropperBtn} ${className}`.trim()}
      onClick={onEyeDropper}
      disabled={isDisabled}
      {...buttonProps}
    >
      {children ?? <Pipette size={15} />}
    </button>
  );
}

// ── ColorPickerFormatSelect ───────────────────────────────────────
export interface ColorPickerFormatSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function ColorPickerFormatSelect(props: ColorPickerFormatSelectProps) {
  const { className = "", disabled, ...selectProps } = props;
  const { format, setFormat, disabled: contextDisabled } = useColorPickerContext(FORMAT_SELECT_NAME);

  const isDisabled = disabled || contextDisabled;

  return (
    <select
      data-slot="color-picker-format-select"
      className={`${styles.formatSelect} ${className}`.trim()}
      value={format}
      disabled={isDisabled}
      onChange={(e) => setFormat(e.target.value as ColorFormat)}
      {...selectProps}
    >
      {colorFormats.map((f) => (
        <option key={f} value={f}>
          {f.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

// ── NumericChannelInput (local draft buffer for smooth editing) ───
interface NumericChannelInputProps {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onCommit: (next: number) => void;
}

function NumericChannelInput({
  value,
  min,
  max,
  disabled,
  className,
  style,
  onCommit,
}: NumericChannelInputProps) {
  const [draft, setDraft] = React.useState(() => String(value));
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const commitDraft = React.useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setDraft(String(value));
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onCommit(clamped);
    setDraft(String(clamped));
  }, [draft, max, min, onCommit, value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      className={className}
      style={style}
      value={draft}
      disabled={disabled}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        commitDraft();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commitDraft();
        }
      }}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (next.trim() === "") return;
        const parsed = Number.parseInt(next, 10);
        if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
          onCommit(parsed);
        }
      }}
    />
  );
}

// ── ColorPickerInput ──────────────────────────────────────────────
export interface ColorPickerInputProps {
  withoutAlpha?: boolean;
  className?: string;
}

export function ColorPickerInput({ withoutAlpha = false, className = "" }: ColorPickerInputProps) {
  const { color, setColor, hsv, setHsv, format, disabled } = useColorPickerContext(INPUT_NAME);
  const canonicalHex = rgbToHex(color);
  const [hexDraft, setHexDraft] = React.useState(canonicalHex);
  const hexFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!hexFocusedRef.current) {
      setHexDraft(canonicalHex);
    }
  }, [canonicalHex]);

  const commitHexDraft = React.useCallback((raw: string) => {
    const parsed = parseColorString(raw);
    if (parsed) {
      const clean = raw.trim().replace(/^#/, "");
      const nextColor = clean.length === 8 ? parsed : { ...parsed, a: 1 };
      setColor(nextColor);
      setHexDraft(rgbToHex(nextColor));
    } else {
      setHexDraft(rgbToHex(color));
    }
  }, [color, setColor]);

  if (format === "hex") {
    return (
      <div className={styles.inputGroupWrapper}>
        <input
          type="text"
          maxLength={12}
          className={`${styles.formatInput} ${withoutAlpha ? styles.inputIsolated : styles.inputFirst} ${className}`.trim()}
          value={hexDraft}
          disabled={disabled}
          onFocus={() => {
            hexFocusedRef.current = true;
          }}
          onBlur={() => {
            hexFocusedRef.current = false;
            commitHexDraft(hexDraft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitHexDraft(hexDraft);
            }
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setHexDraft(raw);
            const clean = raw.trim().replace(/^#/, "");
            if (/^[a-fA-F0-9]{6}$/.test(clean)) {
              setColor(hexToRgb(`#${clean}`, 1));
            } else if (/^[a-fA-F0-9]{8}$/.test(clean)) {
              setColor(hexToRgb(`#${clean}`));
            }
          }}
        />
        {!withoutAlpha && (
          <NumericChannelInput
            key="hex-a"
            min={0}
            max={100}
            className={`${styles.formatInput} ${styles.inputLast}`}
            style={{ width: 44, textAlign: "center" }}
            value={Math.round((color.a ?? 1) * 100)}
            disabled={disabled}
            onCommit={(val) => setColor({ ...color, a: val / 100 })}
          />
        )}
      </div>
    );
  }

  if (format === "rgb") {
    return (
      <div className={styles.inputGroupWrapper}>
        <NumericChannelInput
          key="rgb-r"
          min={0}
          max={255}
          className={`${styles.formatInput} ${styles.inputFirst}`}
          value={Math.round(color.r)}
          disabled={disabled}
          onCommit={(val) => setColor({ ...color, r: val })}
        />
        <NumericChannelInput
          key="rgb-g"
          min={0}
          max={255}
          className={`${styles.formatInput} ${styles.inputMiddle}`}
          value={Math.round(color.g)}
          disabled={disabled}
          onCommit={(val) => setColor({ ...color, g: val })}
        />
        <NumericChannelInput
          key="rgb-b"
          min={0}
          max={255}
          className={`${styles.formatInput} ${withoutAlpha ? styles.inputLast : styles.inputMiddle}`}
          value={Math.round(color.b)}
          disabled={disabled}
          onCommit={(val) => setColor({ ...color, b: val })}
        />
        {!withoutAlpha && (
          <NumericChannelInput
            key="rgb-a"
            min={0}
            max={100}
            className={`${styles.formatInput} ${styles.inputLast}`}
            style={{ width: 42, textAlign: "center" }}
            value={Math.round((color.a ?? 1) * 100)}
            disabled={disabled}
            onCommit={(val) => setColor({ ...color, a: val / 100 })}
          />
        )}
      </div>
    );
  }

  if (format === "hsl") {
    const hsl = rgbToHsl(color);
    return (
      <div className={styles.inputGroupWrapper}>
        <NumericChannelInput
          key="hsl-h"
          min={0}
          max={360}
          className={`${styles.formatInput} ${styles.inputFirst}`}
          value={hsl.h}
          disabled={disabled}
          onCommit={(val) => setColor(hslToRgb({ ...hsl, h: val }, color.a))}
        />
        <NumericChannelInput
          key="hsl-s"
          min={0}
          max={100}
          className={`${styles.formatInput} ${styles.inputMiddle}`}
          value={hsl.s}
          disabled={disabled}
          onCommit={(val) => setColor(hslToRgb({ ...hsl, s: val }, color.a))}
        />
        <NumericChannelInput
          key="hsl-l"
          min={0}
          max={100}
          className={`${styles.formatInput} ${withoutAlpha ? styles.inputLast : styles.inputMiddle}`}
          value={hsl.l}
          disabled={disabled}
          onCommit={(val) => setColor(hslToRgb({ ...hsl, l: val }, color.a))}
        />
        {!withoutAlpha && (
          <NumericChannelInput
            key="hsl-a"
            min={0}
            max={100}
            className={`${styles.formatInput} ${styles.inputLast}`}
            style={{ width: 42, textAlign: "center" }}
            value={Math.round((color.a ?? 1) * 100)}
            disabled={disabled}
            onCommit={(val) => setColor({ ...color, a: val / 100 })}
          />
        )}
      </div>
    );
  }

  // hsb
  return (
    <div className={styles.inputGroupWrapper}>
      <NumericChannelInput
        key="hsb-h"
        min={0}
        max={360}
        className={`${styles.formatInput} ${styles.inputFirst}`}
        value={hsv.h}
        disabled={disabled}
        onCommit={(val) => setHsv({ ...hsv, h: val })}
      />
      <NumericChannelInput
        key="hsb-s"
        min={0}
        max={100}
        className={`${styles.formatInput} ${styles.inputMiddle}`}
        value={hsv.s}
        disabled={disabled}
        onCommit={(val) => setHsv({ ...hsv, s: val })}
      />
      <NumericChannelInput
        key="hsb-v"
        min={0}
        max={100}
        className={`${styles.formatInput} ${withoutAlpha ? styles.inputLast : styles.inputMiddle}`}
        value={hsv.v}
        disabled={disabled}
        onCommit={(val) => setHsv({ ...hsv, v: val })}
      />
      {!withoutAlpha && (
        <NumericChannelInput
          key="hsb-a"
          min={0}
          max={100}
          className={`${styles.formatInput} ${styles.inputLast}`}
          style={{ width: 42, textAlign: "center" }}
          value={Math.round((hsv.a ?? 1) * 100)}
          disabled={disabled}
          onCommit={(val) => setColor({ ...color, a: val / 100 })}
        />
      )}
    </div>
  );
}

// ── DiceColorPicker (Componente pré-composto para uso rápido) ─────
export interface DiceColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  defaultFormat?: ColorFormat;
  disabled?: boolean;
}

export function DiceColorPicker({
  value,
  onChange,
  defaultFormat = "hex",
  disabled = false,
}: DiceColorPickerProps) {
  const displayColor = value || "#000000";

  return (
    <ColorPicker
      value={displayColor}
      onValueChange={onChange}
      defaultFormat={defaultFormat}
      disabled={disabled}
    >
      <ColorPickerTrigger asChild>
        <button type="button" className={styles.triggerBtn}>
          <ColorPickerSwatch
            className={styles.swatch}
            style={{ backgroundColor: displayColor }}
          />
          <span className={styles.triggerText}>{displayColor.toUpperCase()}</span>
        </button>
      </ColorPickerTrigger>
      <ColorPickerContent>
        <ColorPickerArea />
        <div className={styles.slidersRow}>
          <ColorPickerEyeDropper />
          <div className={styles.sliderSliders}>
            <ColorPickerHueSlider />
            <ColorPickerAlphaSlider />
          </div>
        </div>
        <div className={styles.formatRow}>
          <ColorPickerFormatSelect />
          <ColorPickerInput />
        </div>
      </ColorPickerContent>
    </ColorPicker>
  );
}

export default DiceColorPicker;
