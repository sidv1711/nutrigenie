'use client';

import React, { useState } from 'react';
import PDFExport from './PDFExport';
import CartExport from './CartExport';
import { MealPlan } from '@/types/mealPlan';
import { GroceryList } from '@/types/grocery';

interface ExportOptionsProps {
  type: 'meal-plan' | 'grocery-list';
  data: MealPlan | GroceryList;
  planId?: string;
  className?: string;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  type,
  data,
  planId,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: type === 'meal-plan' ? 'My Meal Plan' : 'My Grocery List',
          text: `Check out my ${type === 'meal-plan' ? 'meal plan' : 'grocery list'} from NutriGenie!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.log('Error copying to clipboard:', err);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
        Export
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Export Options
              </div>
              
              <div className="border-t border-gray-100">
                <div className="px-4 py-3">
                  <PDFExport 
                    type={type}
                    data={data}
                    variant="link"
                    className="block w-full text-left"
                  />
                </div>
                
                <button
                  onClick={handlePrint}
                  className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </div>
                </button>

                <button
                  onClick={handleShare}
                  className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share
                  </div>
                </button>
              </div>

              {type === 'grocery-list' && planId && (
                <div className="border-t border-gray-100 pt-2">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Add to Cart
                  </div>
                  <div className="px-4 pb-3">
                    <CartExport planId={planId} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportOptions;