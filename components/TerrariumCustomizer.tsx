'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Volume2, VolumeX, Sun, Moon, Github, Heart } from 'lucide-react';
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
                        <Volume2 size={20} />
                    ) : (
                        <VolumeX size={20} />
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
                        <Sun size={20} />
                    ) : (
                        <Moon size={20} />
                    )}
                </button>

                {/* GitHub Star Button */}
                <a
                    href="https://github.com/asinarpit/terrarium-button"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center ${isDarkMode
                        ? 'bg-neutral-800 border-white/10 text-white/50 hover:text-white'
                        : 'bg-white border-black/10 text-black/50 hover:text-black shadow-md'
                        }`}
                    title="Star the Repo"
                >
                    <Github size={20} />
                </a>
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
                        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedScene.id === scene.id
                            ? 'border-emerald-500 shadow-2xl'
                            : isDarkMode ? 'border-white/10 shadow-lg' : 'border-black/20 shadow-md bg-white/50'
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
                            : (isDarkMode ? 'text-neutral-500' : 'text-neutral-600')
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

            {/* Footer */}
            <div className={`fixed bottom-6 right-8 text-sm font-medium tracking-tight duration-300 flex items-center gap-1.5 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-900'
                }`}>
                Made with <Heart size={14} className="text-rose-400 fill-rose-600" /> by <span className="font-bold">Arpit Singh</span>
            </div>
        </div>
    );
};

export default TerrariumCustomizer;
