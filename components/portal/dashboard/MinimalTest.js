'use client';

import { motion } from 'framer-motion';

export default function MinimalTest() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div>
        <button>Test</button>
      </div>
    </motion.div>
  );
}