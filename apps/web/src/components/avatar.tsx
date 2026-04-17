import { AVATAR_PRESET_PREFIX, PRESET_AVATARS, type PresetAvatar } from "@gojo/shared";

type PresetConfig = {
  label: string;
  src: string;
};

const PRESETS: Record<PresetAvatar, PresetConfig> = {
  kitsune: { label: "Kitsune", src: "/avatars/kitsune.svg" },
  tanuki: { label: "Tanuki", src: "/avatars/tanuki.svg" },
  kappa: { label: "Kappa", src: "/avatars/kappa.svg" },
  tengu: { label: "Tengu", src: "/avatars/tengu.svg" },
  neko: { label: "Neko", src: "/avatars/neko.svg" },
  sensei: { label: "Sensei", src: "/avatars/sensei.svg" },
};

export function isPresetAvatar(value: string | null): value is `preset:${PresetAvatar}` {
  return (
    !!value &&
    value.startsWith(AVATAR_PRESET_PREFIX) &&
    (PRESET_AVATARS as readonly string[]).includes(value.slice(AVATAR_PRESET_PREFIX.length))
  );
}

export function getPreset(value: string | null): PresetConfig | null {
  if (!isPresetAvatar(value)) return null;
  const id = value.slice(AVATAR_PRESET_PREFIX.length) as PresetAvatar;
  return PRESETS[id] ?? null;
}

export function Avatar({
  value,
  size = 40,
  fallback,
}: {
  value: string | null;
  size?: number;
  fallback?: string;
}) {
  const style: React.CSSProperties = { width: size, height: size };
  const preset = getPreset(value);

  if (preset) {
    return (
      <img
        src={preset.src}
        alt={preset.label}
        width={size}
        height={size}
        className="shrink-0 rounded-full border-2 border-gojo-ink bg-gojo-orange object-cover"
        style={style}
      />
    );
  }

  if (value && !isPresetAvatar(value)) {
    return (
      <img
        src={value}
        alt={fallback ?? "Avatar"}
        width={size}
        height={size}
        className="shrink-0 rounded-full border-2 border-gojo-ink object-cover"
        style={style}
      />
    );
  }

  const initial = (fallback?.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-label={fallback ?? "Avatar"}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-gojo-ink bg-gojo-orange font-bold text-white"
      style={{ ...style, fontSize: Math.round(size * 0.45) }}
    >
      {initial}
    </span>
  );
}

export const PRESET_CONFIGS = PRESETS;
