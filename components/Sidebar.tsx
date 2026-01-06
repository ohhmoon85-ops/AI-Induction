
import React from 'react';
import { 
  Home, 
  BarChart2, 
  Clock, 
  Database, 
  ShieldAlert, 
  Layers,
  Flame
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="w-20 lg:w-64 bg-[#0a0a0c] border-r border-white/5 flex flex-col py-6">
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight hidden lg:block">AI-KITCHEN</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <SidebarItem icon={<Home />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
        <SidebarItem icon={<Layers />} label="System Arch" active={activeTab === 'System Arch'} onClick={() => setActiveTab('System Arch')} />
        <SidebarItem icon={<BarChart2 />} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
        <SidebarItem icon={<Clock />} label="Cooking Logs" active={activeTab === 'Cooking Logs'} onClick={() => setActiveTab('Cooking Logs')} />
        <SidebarItem icon={<Database />} label="Ground Truth" active={activeTab === 'Ground Truth'} onClick={() => setActiveTab('Ground Truth')} />
        <SidebarItem icon={<ShieldAlert />} label="Safety Protocols" active={activeTab === 'Safety Protocols'} onClick={() => setActiveTab('Safety Protocols')} />
      </nav>

      <div className="px-6 mt-auto">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hidden lg:block">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Platform Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Core AI Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
        active ? 'bg-blue-600/15 text-blue-400 shadow-sm border border-blue-500/10' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
      }`}
    >
      <span className={`w-5 h-5 ${active ? 'text-blue-400' : ''}`}>{icon}</span>
      <span className="font-medium text-sm hidden lg:block">{label}</span>
    </button>
  );
};

export default Sidebar;
