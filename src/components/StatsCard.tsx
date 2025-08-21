import React from 'react';

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subValue: string;
}

export function StatsCard({ icon, title, value, subValue }: StatsCardProps) {
  return (
    <div className="bg-[#1a1b23] rounded-xl border border-[#2a2b35] p-6">
      <div className="flex items-center space-x-4 mb-4">
        <div className="bg-[#2a2b35] p-3 rounded-lg">
          <div className="text-[#9945FF]">{icon}</div>
        </div>
        <div>
          <h3 className="text-white/70 text-sm font-medium">{title}</h3>
          <div className="text-white text-2xl font-bold">{value}</div>
        </div>
      </div>
      <div className="text-white/60 text-sm">{subValue}</div>
    </div>
  );
}