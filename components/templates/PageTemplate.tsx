import React from 'react';
import { motion } from 'framer-motion';

interface PageTemplateProps {
  children: React.ReactNode;
}

export const PageTemplate: React.FC<PageTemplateProps> = ({ children }) => {
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl space-y-4"
      >
        {children}
      </motion.div>
    </div>
  );
};
