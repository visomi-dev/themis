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
          activeColor: '#c4e7ff',
          color: '#7bd0ff',
          contrastColor: '#004560',
          hoverColor: '#97d8ff',
        },
        surface: {
          0: '#000000',
          50: '#09122b',
          100: '#0a1839',
          200: '#0b1d48',
          300: '#0a2257',
          400: '#32457c',
          500: '#6073ad',
          600: '#96a9e6',
          700: '#dfe4ff',
          800: '#edf2ff',
          900: '#f7f9ff',
          950: '#ffffff',
        },
      },
    },
  },
});

export { ThemisPreset };
