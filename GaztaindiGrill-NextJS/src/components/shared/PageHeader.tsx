

"use client";

import React from "react";

interface SystemMonitorProps {
  pageTitle: string;
  pageDescription?: string;
}

export const PageHeader = ({pageTitle, pageDescription}: SystemMonitorProps) => {

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">

      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <p className="text-sm text-gray-600">{pageDescription}</p>
      </div>
     
    </div>
  );
};
