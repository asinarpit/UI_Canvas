'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Sun, Moon, Github } from 'lucide-react';

interface ControlsBarProps {
    soundEnabled?: boolean;
    onSoundToggle?: (enabled: boolean) => void;
    isDarkMode?: boolean;
    onThemeToggle?: (isDark: boolean) => void;
    showSound?: boolean;
    showTheme?: boolean;
    showGithub?: boolean;
    githubUrl?: string;
}

const ControlsBar = ({
    soundEnabled: externalSoundEnabled,
    onSoundToggle,
    isDarkMode: externalDarkMode,
    onThemeToggle,
    showSound = true,
    showTheme = true,
    showGithub = true,
    githubUrl = "https://github.com/asinarpit/terrarium-button"
}: ControlsBarProps) => {
    // Internal state for standalone usage
    const [internalSoundEnabled, setInternalSoundEnabled] = useState(true);
    const [internalDarkMode, setInternalDarkMode] = useState(true);

    // Use external values if provided, otherwise use internal state
    const soundEnabled = externalSoundEnabled ?? internalSoundEnabled;
    const isDarkMode = externalDarkMode ?? internalDarkMode;

    const handleSoundToggle = () => {
        const newValue = !soundEnabled;
        if (onSoundToggle) {
            onSoundToggle(newValue);
        } else {
            setInternalSoundEnabled(newValue);
        }
    };

    const handleThemeToggle = () => {
        const newValue = !isDarkMode;
        if (onThemeToggle) {
            onThemeToggle(newValue);
        } else {
            setInternalDarkMode(newValue);
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex gap-3">
            {/* Sound Toggle Button */}
            {showSound && (
                <button
                    onClick={handleSoundToggle}
                    className={`p-3 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 backdrop-blur-md ${isDarkMode
                        ? 'bg-neutral-800/80 border-white/10 text-white/50 hover:text-white'
                        : 'bg-white/80 border-black/10 text-black/50 hover:text-black shadow-md'
                        }`}
                    title={soundEnabled ? "Disable Sound" : "Enable Sound"}
                >
                    {soundEnabled ? (
                        <Volume2 size={20} />
                    ) : (
                        <VolumeX size={20} />
                    )}
                </button>
            )}

            {/* Theme Toggle Button */}
            {showTheme && (
                <button
                    onClick={handleThemeToggle}
                    className={`p-3 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 backdrop-blur-md ${isDarkMode
                        ? 'bg-neutral-800/80 border-white/10 text-white/50 hover:text-white'
                        : 'bg-white/80 border-black/10 text-black/50 hover:text-black shadow-md'
                        }`}
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? (
                        <Sun size={20} />
                    ) : (
                        <Moon size={20} />
                    )}
                </button>
            )}

            {/* GitHub Button */}
            {showGithub && (
                <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center backdrop-blur-md ${isDarkMode
                        ? 'bg-neutral-800/80 border-white/10 text-white/50 hover:text-white'
                        : 'bg-white/80 border-black/10 text-black/50 hover:text-black shadow-md'
                        }`}
                    title="Star the Repo"
                >
                    <Github size={20} />
                </a>
            )}
        </div>
    );
};

export default ControlsBar;
