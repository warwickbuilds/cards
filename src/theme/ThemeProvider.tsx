import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from './colors';

interface Theme {
  colors: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ colors: light, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  return <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
