/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const AppColor = {
  black: '#000000',
  white: '#ffffff',
  blueAccent: '#4DACFF80',
  bluePrimary: '#007AFF',
  blueBrand: '#4A5CFF',
  blueMessage: '#3540A8',
  darkCanvas: '#000000',
  darkControl: '#262f4b',
  darkDivider: '#40404080',
  darkElevated: '#11131A',
  darkImage: '#0B0D14',
  darkOverlay: 'rgba(0, 0, 0, 0.92)',
  darkOverlayControl: 'rgba(32, 36, 48, 0.92)',
  darkPreview: '#151923',
  darkReceivedMessage: '#2E3135',
  darkSelected: 'rgb(60, 68, 79)',
  darkSurface: '#1c1c1e',
  darkTextSecondary: '#B0B4BA',
  disabled: '#303342',
  error: '#ff4444',
  errorSurface: 'rgba(255, 68, 68, 0.1)',
  lightCanvas: '#ffffff',
  lightControl: '#F0F0F3',
  lightSelected: '#E0E1E6',
  lightTextSecondary: '#60646C',
  mutedText: '#8E95A8',
  overlayBorder: 'rgba(255, 255, 255, 0.24)',
  success: '#34C759',
} as const;

export const Colors = {
  light: {
    text: AppColor.black,
    textInverse: AppColor.white,
    textSecondary: AppColor.lightTextSecondary,
    textMuted: AppColor.mutedText,
    textOnAccent: AppColor.white,
    background: AppColor.lightCanvas,
    backgroundElement: AppColor.lightControl,
    backgroundSelected: AppColor.lightSelected,
    surface: AppColor.lightCanvas,
    surfaceRaised: AppColor.lightControl,
    surfaceInput: AppColor.lightCanvas,
    surfacePreview: AppColor.lightControl,
    surfaceImage: AppColor.lightControl,
    surfaceOverlay: AppColor.darkOverlay,
    surfaceOverlayControl: AppColor.darkOverlayControl,
    borderSubtle: AppColor.lightSelected,
    borderAccent: AppColor.blueAccent,
    borderOverlay: AppColor.overlayBorder,
    genericborder: AppColor.blueAccent,
    actionPrimary: AppColor.bluePrimary,
    actionBrand: AppColor.blueBrand,
    actionDisabled: AppColor.disabled,
    actionSuccess: AppColor.success,
    actionDanger: AppColor.error,
    buttonBackground: AppColor.blueBrand,
    buttonDisabledBackground: AppColor.disabled,
    dangerText: AppColor.error,
    dangerSurface: AppColor.errorSurface,
    inputPlaceholder: AppColor.mutedText,
    messageSent: AppColor.blueMessage,
    messageReceived: AppColor.darkReceivedMessage,
    shadow: AppColor.black,
  },
  dark: {
    text: AppColor.white,
    textInverse: AppColor.black,
    textSecondary: AppColor.darkTextSecondary,
    textMuted: AppColor.mutedText,
    textOnAccent: AppColor.white,
    background: AppColor.darkCanvas,
    backgroundElement: AppColor.darkControl,
    backgroundSelected: AppColor.darkSelected,
    surface: AppColor.darkSurface,
    surfaceRaised: AppColor.darkElevated,
    surfaceInput: AppColor.darkControl,
    surfacePreview: AppColor.darkPreview,
    surfaceImage: AppColor.darkImage,
    surfaceOverlay: AppColor.darkOverlay,
    surfaceOverlayControl: AppColor.darkOverlayControl,
    borderSubtle: AppColor.darkDivider,
    borderAccent: AppColor.blueAccent,
    borderOverlay: AppColor.overlayBorder,
    genericborder: AppColor.blueAccent,
    actionPrimary: AppColor.bluePrimary,
    actionBrand: AppColor.blueBrand,
    actionDisabled: AppColor.disabled,
    actionSuccess: AppColor.success,
    actionDanger: AppColor.error,
    buttonBackground: AppColor.blueBrand,
    buttonDisabledBackground: AppColor.disabled,
    dangerText: AppColor.error,
    dangerSurface: AppColor.errorSurface,
    inputPlaceholder: AppColor.mutedText,
    messageSent: AppColor.blueMessage,
    messageReceived: AppColor.darkReceivedMessage,
    shadow: AppColor.black,
  },
} as const;

export type AppTheme = (typeof Colors)[keyof typeof Colors];
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sharp: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 18,
  round: 999,
} as const;

export const ControlSize = {
  sm: 36,
  md: 42,
  lg: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
