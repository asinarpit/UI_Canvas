'use client';

import { useState } from 'react';
import GalaxyButton from "@/components/GalaxyButton";
import TerrariumCustomizer from "@/components/TerrariumCustomizer";
import ControlsBar from "@/components/ControlsBar";
import SpiderWeb from "@/components/SpiderWeb";
import { Heart } from 'lucide-react';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const components = [
    {
      id: 1,
      component: <TerrariumCustomizer soundEnabled={soundEnabled} />
    },
    {
      id: 2,
      component: <GalaxyButton soundEnabled={soundEnabled} />
    },
    {
      id: 3,
      component: <SpiderWeb />
    }
  ];

  return (
    <main className={`min-h-screen grid grid-cols-1 md:grid-cols-2 items-center justify-center gap-5 p-4 sm:p-6 md:p-10 transition-colors duration-300 ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
      <ControlsBar
        soundEnabled={soundEnabled}
        onSoundToggle={setSoundEnabled}
        isDarkMode={isDarkMode}
        onThemeToggle={setIsDarkMode}
      />

      {
        components.map(item => (
          <div key={item.id} className="border-dotted-spaced h-full relative overflow-hidden">
            <span className="corner corner-tl"></span>
            <span className="corner corner-tr"></span>
            <span className="corner corner-bl"></span>
            <span className="corner corner-br"></span>
            {item.component}
          </div>
        ))
      }

      {/* Footer */}
      <div className={`fixed bottom-4 right-8 text-sm font-medium tracking-tight duration-300 flex items-center gap-1.5 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-900'
        }`}>
        Made with <Heart size={14} className="text-rose-400 fill-rose-600" /> by <span className="font-bold">Arpit Singh</span>
      </div>

    </main>
  );
}

