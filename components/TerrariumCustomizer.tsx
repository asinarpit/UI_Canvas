'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import TerrariumButton from './TerrariumButton';

// Import scenes
import forest from '../assets/forest.png';
import desert from '../assets/desert.png';
import butterfly from '../assets/butterfly.gif';
import snake from '../assets/snake.gif';

const scenes = [
    { id: 'forest', name: 'Mystic Forest', image: forest, gif: butterfly },
    { id: 'desert', name: 'Golden Oasis', image: desert, gif: snake },
];

const TerrariumCustomizer = () => {
    const [selectedScene, setSelectedScene] = useState(scenes[0]);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(true);

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen transition-colors duration-700 p-4 sm:p-8 gap-8 sm:gap-16 ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-neutral-300 text-neutral-900'
            }`}>

            {/* Controls Bar */}
            <div className="flex gap-4">
                {/* Sound Toggle Button */}
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-3 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${isDarkMode
                        ? 'bg-neutral-800 border-white/10 text-white/50 hover:text-white'
                        : 'bg-white border-black/10 text-black/50 hover:text-black shadow-md'
                        }`}
                    title={soundEnabled ? "Disable Sound" : "Enable Sound"}
                >
                    {soundEnabled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                    )}
                </button>

                {/* Theme Toggle Button */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-3 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${isDarkMode
                        ? 'bg-neutral-800 border-white/10 text-white/50 hover:text-white'
                        : 'bg-white border-black/10 text-black/50 hover:text-black shadow-md'
                        }`}
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    )}
                </button>
            </div>

            {/* Button Container */}
            <div className="relative group w-full flex justify-center py-4 overflow-hidden">
                <TerrariumButton
                    mainImage={selectedScene.image}
                    gifImage={selectedScene.gif}
                    soundEnabled={soundEnabled}
                />
            </div>

            {/* Scene Selector */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl">
                {scenes.map((scene) => (
                    <button
                        key={scene.id}
                        onClick={() => setSelectedScene(scene)}
                        className={`relative group flex flex-col items-center gap-2 sm:gap-3 transition-all duration-300 cursor-pointer ${selectedScene.id === scene.id ? 'scale-105' : 'opacity-60 hover:opacity-100 scale-100'
                            }`}
                    >
                        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-colors duration-300 ${selectedScene.id === scene.id
                            ? 'border-emerald-500 shadow-2xl'
                            : isDarkMode ? 'border-white/10 shadow-lg' : 'border-black/10 shadow-md'
                            }`}>
                            <Image
                                src={scene.image}
                                alt={scene.name}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <span className={`text-xs sm:text-sm font-medium transition-colors ${selectedScene.id === scene.id
                            ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                            : (isDarkMode ? 'text-neutral-500' : 'text-neutral-400')
                            }`}>
                            {scene.name}
                        </span>

                        {selectedScene.id === scene.id && (
                            <motion.div
                                layoutId="active-indicator"
                                className="absolute -bottom-2 w-1 h-1 bg-emerald-500 rounded-full"
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TerrariumCustomizer;
