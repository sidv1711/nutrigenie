'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = '100%', 
  height = '1rem',
  variant = 'rectangular'
}) => {
  const baseClasses = "animate-pulse bg-gray-200 rounded";
  
  const variantClasses = {
    text: "rounded-md",
    rectangular: "rounded-md",
    circular: "rounded-full"
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const MealPlanSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton width="200px" height="2rem" />
        <Skeleton width="150px" height="1rem" />
      </div>
      <Skeleton width="140px" height="40px" />
    </div>

    {/* Store info */}
    <Skeleton width="300px" height="1rem" />
    
    {/* Total cost */}
    <Skeleton width="150px" height="1.5rem" />

    {/* Days */}
    {[...Array(7)].map((_, dayIndex) => (
      <div key={dayIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
        <Skeleton width="100px" height="1.5rem" />
        
        {/* Meals */}
        {[...Array(3)].map((_, mealIndex) => (
          <div key={mealIndex} className="space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton width="80px" height="1rem" />
              <Skeleton width="60px" height="1rem" />
            </div>
            <div className="border border-gray-200 rounded p-3 space-y-2">
              <Skeleton width="200px" height="1.25rem" />
              <Skeleton width="100%" height="1rem" />
              <div className="flex gap-2">
                <Skeleton width="60px" height="20px" />
                <Skeleton width="80px" height="20px" />
              </div>
              <Skeleton width="100%" height="1rem" />
              <div className="space-y-1">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} width="90%" height="1rem" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const GroceryListSkeleton: React.FC = () => (
  <div className="p-6 space-y-6">
    <Skeleton width="200px" height="2rem" />
    
    {/* Table header */}
    <div className="border-b border-gray-200 pb-2">
      <div className="flex justify-between">
        <Skeleton width="60px" height="1rem" />
        <Skeleton width="40px" height="1rem" />
        <Skeleton width="40px" height="1rem" />
        <Skeleton width="80px" height="1rem" />
        <Skeleton width="60px" height="1rem" />
      </div>
    </div>
    
    {/* Table rows */}
    {[...Array(15)].map((_, i) => (
      <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-2">
        <Skeleton width="120px" height="1rem" />
        <Skeleton width="40px" height="1rem" />
        <Skeleton width="40px" height="1rem" />
        <Skeleton width="60px" height="1rem" />
        <Skeleton width="60px" height="1rem" />
      </div>
    ))}
    
    {/* Total */}
    <div className="flex justify-end">
      <Skeleton width="120px" height="1.5rem" />
    </div>
    
    {/* Button */}
    <Skeleton width="150px" height="40px" />
  </div>
);

export const FormSkeleton: React.FC = () => (
  <div className="max-w-md mx-auto p-6 space-y-4">
    <Skeleton width="200px" height="2rem" className="mx-auto" />
    
    {[...Array(8)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton width="100px" height="1rem" />
        <Skeleton width="100%" height="40px" />
      </div>
    ))}
    
    <Skeleton width="100%" height="48px" />
  </div>
);

export const StoreSelectorSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Skeleton width="200px" height="1.5rem" />
    
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border border-gray-200 rounded">
        <Skeleton width="20px" height="20px" />
        <div className="flex-1 space-y-1">
          <Skeleton width="150px" height="1rem" />
          <Skeleton width="200px" height="0.875rem" />
        </div>
        <Skeleton width="60px" height="0.875rem" />
      </div>
    ))}
    
    <Skeleton width="120px" height="40px" />
  </div>
);