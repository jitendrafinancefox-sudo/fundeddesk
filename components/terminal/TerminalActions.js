'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function TerminalActions({ rootRef, activePane, getPrice, children }) {
  const [orderOpen, setOrderOpen] = useState(false);
  const [side, setSide] = useState('BUY');
  const [lots, setLots] = useState('1');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [message, setMessage] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [optionChainOpen, setOptionChainOpen] = useState(false);

  // Fullscreen listener
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, [rootRef]);

  const flash = useCallback((kind, text) => {
    setMessage({ kind, text });
    window.setTimeout(() => setMessage(null), 4500);
  }, []);

  const submitOrder = useCallback(() => {
    if (!activePane.selection) return flash('err', 'Pehle option chain se strike select karo.');
    const quantity = Number(lots);
    if (!Number.isInteger(quantity) || quantity < 1) return flash('err', 'Lots 1 ya usse zyada hone chahiye.');
    const price = getPrice?.();
    if (!price) return flash('err', 'Live price ka wait karo.');
    flash('ok', `${side} ${quantity} lot @ ${price.toFixed(2)}`);
    setOrderOpen(false);
  }, [activePane.selection, lots, getPrice, side, flash]);

  return children({
    orderOpen,
    setOrderOpen,
    side,
    setSide,
    lots,
    setLots,
    sl,
    setSl,
    tp,
    setTp,
    message,
    fullscreen,
    toggleFullscreen,
    optionChainOpen,
    setOptionChainOpen,
    flash,
    submitOrder,
  });
}
