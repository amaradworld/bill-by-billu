import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIAssistant from './AIAssistant';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed z-50 lg:static inset-y-0 left-0 w-64 bg-white border-r transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="flex items-center gap-4 px-4 py-3 bg-white border-b lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu size={20} />
          </button>
          <span className="font-bold text-brand-600">Bill By Billu</span>
        </header>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <AIAssistant />
    </div>
  );
}
