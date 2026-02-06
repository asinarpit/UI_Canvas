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

interface TerrariumCustomizerProps {
    soundEnabled?: boolean;
}

const TerrariumCustomizer = ({ soundEnabled = true }: TerrariumCustomizerProps) => {
    const [selectedScene, setSelectedScene] = useState(scenes[0]);
    const [isDarkMode, setIsDarkMode] = useState(true);

    return (
        <div className={`flex flex-col items-center justify-center transition-colors duration-700 p-4 sm:p-8 gap-8 sm:gap-16
            }`}>

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

        </div>
    );
};

export default TerrariumCustomizer;
