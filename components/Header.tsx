
import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="flex justify-between items-center py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Induction Dashboard</h1>
        <p className="text-slate-500 text-sm">Real-time Autonomous Cooking Analysis (Patent Ver.)</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search sensor logs..." 
            className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-64"
          />
        </div>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
        </button>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white/10 shadow-lg" />
      </div>
    </header>
  );
};

export default Header;
