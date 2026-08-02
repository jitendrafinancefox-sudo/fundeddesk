'use client';
export function OverlayRenderer({ overlays = [] }) { return (ctx) => overlays.forEach((overlay) => overlay(ctx)); }
