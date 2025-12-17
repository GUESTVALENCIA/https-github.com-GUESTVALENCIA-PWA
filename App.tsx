import React from 'react';
import MainWebsite from './components/MainWebsite';

const App: React.FC = () => {
  return (
    <div className="relative w-full min-h-screen font-sans text-slate-100 bg-slate-900">
      <MainWebsite />
    </div>
  );
};

export default App;