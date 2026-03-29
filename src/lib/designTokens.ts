/**
 * Sprout & Soil Design System Utilities
 *
 * Central repository for design tokens, component builders, and theming utilities.
 * Use these utilities to create consistent components across the app.
 */

// ===== COLOR TOKENS =====
export const colors = {
  // Core surfaces
  surface: '#161311',
  surfaceContainer: {
    lowest: '#100e0c',
    low: '#1e1b19',
    default: '#2d2927',
    high: '#383432',
    highest: '#3d3936',
  },

  // Primary (Sweet Potato)
  primary: '#ffb59c',
  primaryContainer: '#f26b38',
  onPrimary: '#5c1a00',

  // Secondary (Sprout)
  secondary: '#aad54b',
  secondaryContainer: '#769d12',
  onSecondary: '#253500',

  // Tertiary (Warm Sand)
  tertiary: '#eebd8e',
  tertiaryContainer: '#c88f3f',
  onTertiary: '#3d2600',

  // Outlines
  outline: '#a78a81',
  outlineVariant: '#58423a',

  // States
  error: '#ffb4ab',
  errorContainer: '#8c0a0a',
  onError: '#5c0a0a',

  success: '#aad54b',
  successContainer: '#769d12',

  // Text
  textPrimary: '#e8e1d9',
  textSecondary: 'rgba(232, 225, 217, 0.7)',
  textTertiary: 'rgba(232, 225, 217, 0.5)',
};

// ===== SPACING SCALE =====
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
};

// ===== TYPOGRAPHY SCALE =====
export const typography = {
  displayLg: {
    fontSize: '3.5rem',
    fontWeight: '700',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
  },
  displayMd: {
    fontSize: '2.8rem',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  displaySm: {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: '1.25',
  },
  headlineLg: {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: '1.25',
  },
  headlineMd: {
    fontSize: '1.75rem',
    fontWeight: '700',
    lineHeight: '1.35',
  },
  headlineSm: {
    fontSize: '1.5rem',
    fontWeight: '700',
    lineHeight: '1.4',
  },
  bodyLg: {
    fontSize: '1.125rem',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  bodyMd: {
    fontSize: '1rem',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  bodySm: {
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1.4',
  },
};

// ===== ROUNDING SCALE =====
export const radius = {
  xs: '0.5rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  full: '9999px',
};

// ===== SHADOW & ELEVATION =====
export const elevation = {
  glowPrimary: '0 24px 24px -8px rgba(255, 183, 156, 0.12)',
  glowSecondary: '0 24px 24px -8px rgba(170, 213, 75, 0.12)',
  glowPrimaryHover: '0 24px 32px -8px rgba(255, 183, 156, 0.16)',
  glowPrimaryActive: '0 24px 24px -8px rgba(255, 183, 156, 0.08)',
  backdrop: 'rgba(60, 56, 54, 0.7)',
};

// ===== COMPONENT CLASS BUILDERS =====

export const getDynamicClasses = {
  button: (variant: 'primary' | 'secondary' | 'tertiary' = 'primary', size: 'sm' | 'md' | 'lg' = 'md') => {
    const baseClasses = 'transition-all duration-200 font-heading border-none cursor-pointer';

    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      tertiary: 'btn-tertiary',
    };

    const sizes = {
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
    };

    return `${baseClasses} ${variants[variant]} ${sizes[size]}`;
  },

  card: (compact: boolean = false) => {
    return `card ${compact ? 'card-compact' : ''}`;
  },

  surface: (level: 'highest' | 'high' | 'default' | 'low' | 'lowest' = 'high') => {
    const levels = {
      highest: 'surface-container-highest',
      high: 'surface-container-high',
      default: 'surface-container',
      low: 'surface-container-low',
      lowest: 'surface-container-lowest',
    };
    return levels[level];
  },

  listItem: () => {
    return 'list-item';
  },

  text: (variant: 'display' | 'headline' | 'body' = 'body', size: 'lg' | 'md' | 'sm' = 'md') => {
    const textClasses = {
      display: {
        lg: 'text-display-lg',
        md: 'text-display-md',
        sm: 'text-display-sm',
      },
      headline: {
        lg: 'text-headline-lg',
        md: 'text-headline-md',
        sm: 'text-headline-sm',
      },
      body: {
        lg: 'text-body-lg',
        md: 'text-body-md',
        sm: 'text-body-sm',
      },
    };
    return textClasses[variant][size];
  },

  asymmetricMargin: (position: 'left' | 'right' = 'left', intensity: 'sm' | 'lg' = 'sm') => {
    const directions = {
      left: intensity === 'sm' ? 'ml-organic-sm' : 'ml-organic-lg',
      right: intensity === 'sm' ? 'mr-organic-sm' : 'mr-organic-lg',
    };
    return directions[position];
  },
};

// ===== COLOR INTENT HELPERS =====

export const getColorForState = (state: 'success' | 'error' | 'warning' | 'info') => {
  const stateColors = {
    success: colors.success,
    error: colors.error,
    warning: colors.tertiary,
    info: colors.primary,
  };
  return stateColors[state];
};

export const getBackgroundForState = (state: 'success' | 'error' | 'warning' | 'info') => {
  const stateBackgrounds = {
    success: colors.successContainer,
    error: colors.errorContainer,
    warning: colors.tertiaryContainer,
    info: colors.primaryContainer,
  };
  return stateBackgrounds[state];
};

// ===== RESPONSIVE BREAKPOINTS (Tailwind Standard) =====
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
