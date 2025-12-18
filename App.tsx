import React from 'react';
import MainWebsite from './components/MainWebsite';

const App: React.FC = () => {
  return (
    // Galaxy White Mode Container
    <div className="relative w-full min-h-screen font-sans text-slate-900 bg-white selection:bg-blue-500/30">
      <MainWebsite />
    </div>
  );
};

export default App;