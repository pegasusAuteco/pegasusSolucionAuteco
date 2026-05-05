import React from 'react';
import { motion } from 'framer-motion';

const ChatBubble = ({ sender, text, timestamp }) => {
  const isIA = sender === 'IA';
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`flex ${isIA ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-md transition-colors duration-300 ${
        isIA 
          ? 'bg-gray-100 text-auteco-blue border border-transparent dark:bg-gray-900 dark:border-gray-800 dark:text-gray-200 rounded-tl-none' 
          : 'bg-auteco-blue text-white rounded-tr-none'
      }`}>
        <p className="text-sm leading-relaxed">{text}</p>
        <span className={`text-[10px] mt-1 block ${isIA ? 'text-gray-400 dark:text-gray-500' : 'text-blue-200'}`}>
          {timestamp}
        </span>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
