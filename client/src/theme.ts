import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

// Custom emerald color palette matching the logo
const billGreen: MantineColorsTuple = [
  '#ecfdf5',  // 50
  '#d1fae5',  // 100
  '#a7f3d0',  // 200
  '#6ee7b7',  // 300
  '#34d399',  // 400
  '#10b981',  // 500 - primary (matches logo)
  '#059669',  // 600
  '#047857',  // 700
  '#065f46',  // 800
  '#064e3b'   // 900 (matches logo background)
];

const billOrange: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffd699',
  '#ffc266',
  '#ffb340',
  '#ffa726',
  '#ff9800',
  '#e68600',
  '#cc7700',
  '#b36600'
];

export const theme = createTheme({
  primaryColor: 'billGreen',
  colors: {
    billGreen,
    billOrange,
  },
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '600',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
