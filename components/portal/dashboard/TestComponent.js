'use client';

import { motion } from 'framer-motion';

export default function TestComponent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1>Test Component</h1>
      <p>This is a test</p>
    </motion.div>
  );
}