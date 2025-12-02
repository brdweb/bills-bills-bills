import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

// Custom vibrant color for bills
const billGreen: MantineColorsTuple = [
  '#e6fff0',
  '#d0f9e0',
  '#a3f2c1',
  '#72eb9f',
  '#4ae582',
  '#31e16f',
  '#1fdf64',
  '#0dc653',
  '#00b048',
  '#00993a'
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
  primaryColor: 'violet',
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
