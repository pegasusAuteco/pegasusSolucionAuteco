import React from 'react';
import { motion } from 'framer-motion';

const MotorcycleCard = ({ name, image, specs, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(225,6,0,0.15)] hover:border-auteco-red/30 dark:hover:border-auteco-red/30"
    >
      {/* Image */}
      <div className="h-28 md:h-44 bg-gray-50 dark:bg-gray-950/50 flex items-center justify-center p-2 md:p-4 relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-[radial-gradient(#888_1px,transparent_1px)] dark:bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <img
          src={image}
          alt={name}
          className="max-h-full max-w-full object-contain transition-transform duration-500 hover:scale-105"
        />
      </div>

      {/* Name + Displacement */}
      <div className="px-2 py-2 md:px-4 md:py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/80 transition-colors duration-300">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-xs md:text-base leading-tight uppercase tracking-wider group-hover:text-auteco-blue dark:group-hover:text-white transition-colors">{name}</h3>
        <p className="text-auteco-red font-black text-sm md:text-lg mt-0.5 dark:drop-shadow-[0_0_8px_rgba(225,6,0,0.5)]">{specs.displacement}</p>
      </div>
    </motion.div>
  );
};

export default MotorcycleCard;
