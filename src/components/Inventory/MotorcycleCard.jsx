import React from 'react';
import { motion } from 'framer-motion';

const MotorcycleCard = ({ name, image, specs }) => {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer"
    >
      {/* Image */}
      <div className="h-28 md:h-44 bg-gray-50 flex items-center justify-center p-2 md:p-4">
        <img
          src={image}
          alt={name}
          className="max-h-full max-w-full object-contain transition-transform duration-500 hover:scale-105"
        />
      </div>

      {/* Name + Displacement */}
      <div className="px-2 py-2 md:px-4 md:py-3 border-t border-gray-100">
        <h3 className="font-bold text-gray-900 text-xs md:text-base leading-tight">{name}</h3>
        <p className="text-auteco-red font-black text-sm md:text-lg mt-0.5">{specs.displacement}</p>
      </div>
    </motion.div>
  );
};

export default MotorcycleCard;
