'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#3182ce',
  text 
}) => {
  const sizes = {
    small: 16,
    medium: 24,
    large: 32
  };

  const spinnerSize = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className="animate-spin rounded-full border-2 border-gray-200"
        style={{ 
          width: spinnerSize, 
          height: spinnerSize,
          borderTopColor: color 
        }}
      />
      {text && (
        <p className="text-gray-600 text-sm font-medium">{text}</p>
      )}
    </div>
  );
};

export const PageLoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="large" text={text} />
  </div>
);

export const InlineLoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center justify-center p-8">
    <LoadingSpinner size="medium" text={text} />
  </div>
);