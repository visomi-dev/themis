import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const ThemisPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#edf3ff',
      100: '#d9e2ff',
      200: '#a8c0ff',
      300: '#7ba2f0',
      400: '#5a7fd4',
      500: '#385ca9',
      600: '#2f5198',
      700: '#25457f',
      800: '#18335f',
      900: '#0f2445',
      950: '#08152c',
    },
    colorScheme: {
      light: {
        primary: {
          activeColor: '{primary.700}',
          color: '{primary.500}',
          contrastColor: '#f9f8ff',
          hoverColor: '{primary.600}',
        },
        surface: {
          0: '#ffffff',
          50: '#faf8ff',
          100: '#f2f3ff',
          200: '#e9edff',
          300: '#e1e7ff',
          400: '#d9e2ff',
          500: '#a1b1dd',
          600: '#6a7aa3',
          700: '#4e5e86',
          800: '#213156',
          900: '#17264a',
          950: '#0c1834',
        },
      },
      dark: {
        primary: {
          activeColor: '#aac0fb',
          color: '#bdceff',
          contrastColor: '#2d4477',
          hoverColor: '#aac0fb',
        },
        surface: {
          0: '#000000',
          50: '#080e1b',
          100: '#0b1323',
          200: '#10192c',
          300: '#141f35',
          400: '#19253f',
          500: '#3c4863',
          600: '#697593',
          700: '#9eabcb',
          800: '#dde5ff',
          900: '#f9f9ff',
          950: '#ffffff',
        },
      },
    },
  },
});

export { ThemisPreset };
