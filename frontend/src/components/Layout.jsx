import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIAssistant from './AIAssistant';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed z-50 lg:static inset-y-0 left-0 w-64 transform transition-all duration-300 ease-out-expo ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <header className="flex items-center gap-4 px-4 py-3 glass-strong border-b border-gray-100 lg:hidden sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="btn-press p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">BB</span>
            </div>
            <span className="font-bold text-gray-900">Bill By Billu</span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <AIAssistant />
    </div>
  );
}
