import React from 'react';
import type { CardProps } from '../../types';

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>
    {children}
  </div>
);
