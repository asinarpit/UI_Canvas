'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import forestScene from '../assets/forest.png';
import frontGlass from '../assets/front-glass-panel.png';
import topGlass from '../assets/top-glass-panel.png';
import terrariumContainer from '../assets/terrarium-container.png';
import bottomDepression from '../assets/bottom-depression.png';
import mainMask from '../assets/main-mask.png';
import butterfly from '../assets/butterfly.gif';
import { StaticImageData } from 'next/image';


// button variants
const buttonVariants = {
    tap: {
        y: 15,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 17
        }
    }
} as const;

const sceneVariants = {
    tap: {
        y: 15,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 20
        }
    }
} as const;

interface TerrariumButtonProps {
    mainImage?: StaticImageData;
    gifImage?: StaticImageData;
    soundEnabled?: boolean;
}

const TerrariumButton = ({ mainImage, gifImage, soundEnabled = true }: TerrariumButtonProps) => {
    const playSound = () => {
        if (!soundEnabled) return;
        const audio = new Audio('/click.mp3');
        audio.currentTime = 0;
        audio.play().catch(err => console.log('Audio play failed:', err));
    };

    return (
        <div className='w-full h-full flex justify-center items-center'>
            <div className='relative transition-transform duration-500 ease-in-out scale-[0.6] sm:scale-75 md:scale-90 lg:scale-100'>
                <div className='w-[550px] h-[300px] relative overflow-hidden'>
                    {/* bottom depression */}
                    <div className='absolute bottom-0 opacity-50'>
                        <Image src={bottomDepression} alt="" />
                    </div>
                    {/* main button */}
                    <motion.div
                        className='absolute bottom-[-20px] left-1/2 -translate-x-1/2 cursor-pointer'
                        whileTap="tap"
                        variants={buttonVariants}
                        onTapStart={playSound}
                    >
                        <div className='w-[500px] h-[250px] overflow-hidden relative'>
                            {/* container */}
                            <div className='absolute bottom-0'>
                                <Image src={terrariumContainer} alt="" />
                            </div>
                            {/* main scene */}
                            <motion.div
                                className='absolute bottom-0'
                                variants={sceneVariants}
                                transition={{
                                    layout: { duration: 0.3, ease: 'easeOut' }
                                }}
                            >
                                <Image
                                    src={mainImage || forestScene}
                                    alt=""
                                    className="transition-all duration-500 ease-in-out"
                                />
                                {/*butterfly / snake  */}
                                <div className='absolute bottom-[20%] right-[20%] w-[100px] h-[100px]'>
                                    <Image src={gifImage || butterfly} alt="" />
                                </div>
                            </motion.div>



                            {/* front glass */}
                            <div className='absolute bottom-0'>
                                <Image src={frontGlass} alt="" />
                            </div>

                            {/* top glass */}
                            <div className='absolute top-[12px] backdrop-blur-[1px]'>
                                <Image src={topGlass} alt="" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>


        </div>



    );
};

export default TerrariumButton;
