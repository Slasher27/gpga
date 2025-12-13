import React from 'react';
import type { BadgeProps } from '../../types';

export const Badge: React.FC<BadgeProps> = ({ children, type = 'neutral' }) => {
  const styles = {
    neutral: 'badge badge-ghost',
    success: 'badge badge-success',
    danger: 'badge badge-error',
    warning: 'badge badge-warning'
  };
  return <span className={`${styles[type]} badge-sm`}>{children}</span>;
};
