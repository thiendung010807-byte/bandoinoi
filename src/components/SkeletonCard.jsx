import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col animate-pulse">
      {/* Khung ảnh */}
      <div className="aspect-square rounded-2xl bg-slate-200 mb-4 w-full"></div>
      
      {/* Khung chữ */}
      <div className="flex flex-col flex-grow">
        <div className="h-5 bg-slate-200 rounded-md w-3/4 mb-4"></div>
        <div className="h-3 bg-slate-200 rounded-md w-1/2 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded-md w-full mb-6"></div>
        
        {/* Khung giá và nút */}
        <div className="mt-auto flex justify-between items-end">
          <div className="h-8 bg-slate-200 rounded-lg w-2/5"></div>
          <div className="h-12 w-12 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
}