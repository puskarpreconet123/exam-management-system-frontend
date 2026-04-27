import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme === 'dark';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            root.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const ThemeToggle = ({ className = '' }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            id="global-theme-toggle"
            onClick={toggleTheme}
            className={`relative size-8 rounded-full overflow-hidden flex items-center justify-center
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        transition-all duration-300 cursor-pointer
                        hover:scale-110 active:scale-90
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                        focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
                        ${className}`}
            aria-label="Toggle Theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {/* Sun icon — visible in dark mode (click to switch to light) */}
            <span
                className={`material-symbols-outlined absolute text-amber-500 text-[18px]
                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                            ${isDark
                                ? 'opacity-100 rotate-0 scale-100'
                                : 'opacity-0 rotate-180 scale-0'}`}
            >
                light_mode
            </span>

            {/* Moon icon — visible in light mode (click to switch to dark) */}
            <span
                className={`material-symbols-outlined absolute text-indigo-500 text-[18px]
                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                            ${isDark
                                ? 'opacity-0 -rotate-180 scale-0'
                                : 'opacity-100 rotate-0 scale-100'}`}
            >
                dark_mode
            </span>
        </button>
    );
};
