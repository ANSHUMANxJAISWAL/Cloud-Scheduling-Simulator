import React, { useState } from 'react';
import SimulatorPage from './pages/SimulatorPage';
import ComparePage from './pages/ComparePage';
import WorkloadPage from './pages/WorkloadPage';
import { Cpu, Columns, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator');

  const renderContent = () => {
    switch (activeTab) {
      case 'simulator':
        return <SimulatorPage />;
      case 'compare':
        return <ComparePage />;
      case 'presets':
        return <WorkloadPage setActiveTab={setActiveTab} />;
      default:
        return <SimulatorPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glassmorphism border-b border-border/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
            <Cpu className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <div>
            <h1 className="font-heading text-xl tracking-wider font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-400">
              NEBULA SIM
            </h1>
            <p className="text-[10px] text-textSecondary font-mono tracking-widest uppercase">
              Cloud Event Scheduling Engine
            </p>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav className="flex space-x-1 bg-surface/80 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === 'simulator'
                ? 'bg-accent text-white shadow-lg'
                : 'text-textSecondary hover:text-textPrimary hover:bg-border/30'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Simulator</span>
          </button>
          
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === 'compare'
                ? 'bg-accent text-white shadow-lg'
                : 'text-textSecondary hover:text-textPrimary hover:bg-border/30'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === 'presets'
                ? 'bg-accent text-white shadow-lg'
                : 'text-textSecondary hover:text-textPrimary hover:bg-border/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Presets</span>
          </button>
        </nav>

        {/* Decorative Indicator */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-success">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
          </span>
          <span>Simulation Engine Active</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="animate-fadeUp">
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-surface/50 py-6 text-center text-xs text-textSecondary font-mono mt-12">
        <p>© 2026 Nebula Scheduling Engine. Developed with Jain's Fairness Index & Discrete-Event Queue.</p>
      </footer>
    </div>
  );
}
