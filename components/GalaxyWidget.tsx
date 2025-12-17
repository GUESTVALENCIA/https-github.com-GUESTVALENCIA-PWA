import React, { useState, useRef, useCallback, useEffect } from 'react';
import LiveInterface from './LiveInterface';
import { GeminiLiveService } from '../services/geminiService';
import { AppState, BookingData } from '../types';

// Mock Data for the widget context
const INITIAL_BOOKING_DATA: BookingData = {
  pricePerNight: 120,
  available: true,
  guestCount: 2,
  discountApplied: false
};

const GalaxyWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcripts, setTranscripts] = useState<{text: string, isUser: boolean}[]>([]);
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const [bookingData, setBookingData] = useState<BookingData>(INITIAL_BOOKING_DATA);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size to hide on Desktop (Conflict Resolution)
  useEffect(() => {
    const checkMobile = () => {
        setIsMobile(window.innerWidth < 1024); // Hide on screens larger than LG (Desktop)
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Tool Logic
  const handleToolCall = async (name: string, args: any) => {
    console.log(`Widget Tool: ${name}`, args);
    if (name === 'checkAvailability') {
        return { available: bookingData.available, price: bookingData.pricePerNight };
    }
    if (name === 'negotiatePrice') {
        const target = args.targetPrice;
        if (target > 80 && !bookingData.discountApplied) {
             const newPrice = Math.max(target, 95);
             setBookingData(prev => ({ ...prev, pricePerNight: newPrice, discountApplied: true }));
             return { success: true, newPrice: newPrice };
        }
        return { success: false, currentPrice: bookingData.pricePerNight };
    }
    return { error: "Unknown tool" };
  };

  const handleStartCall = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return alert("API_KEY missing");
    
    setAppState(AppState.CONNECTING);
    liveServiceRef.current = new GeminiLiveService(apiKey);
    try {
      await liveServiceRef.current.connect(
        (text, isUser) => setTranscripts(prev => [...prev.slice(-3), { text, isUser }]),
        (status) => {
            if (status === 'CONNECTED') setAppState(AppState.LIVE);
            if (status === 'DISCONNECTED') setAppState(AppState.IDLE);
            if (status === 'ERROR') setAppState(AppState.ERROR);
        },
        handleToolCall
      );
    } catch (e) {
      setAppState(AppState.ERROR);
    }
  };

  const handleEndCall = async () => {
    if (liveServiceRef.current) {
      await liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
    setAppState(AppState.IDLE);
    setTranscripts([]);
  };

  const handleVideoFrame = useCallback((base64: string) => {
    if (appState === AppState.LIVE && liveServiceRef.current) {
        liveServiceRef.current.sendVideoFrame(base64);
    }
  }, [appState]);

  const toggleWidget = () => {
    if (isOpen) {
        if (appState === AppState.LIVE || appState === AppState.CONNECTING) {
            handleEndCall();
        }
        setIsOpen(false);
    } else {
        setIsOpen(true);
    }
  };

  // If NOT mobile, do not render the floating widget to avoid conflict with Hero
  if (!isMobile) return null;

  return (
    <div className="flex flex-col items-end z-50">
        {/* WIDGET PANEL (The "Call" Interface) */}
        <div className={`
            transition-all duration-500 ease-in-out origin-bottom-right overflow-hidden
            ${isOpen ? 'w-[90vw] h-[80vh] opacity-100 scale-100 mb-4' : 'w-0 h-0 opacity-0 scale-50'}
            bg-white backdrop-blur-2xl border border-slate-200 rounded-3xl shadow-2xl relative flex flex-col
        `}>
             {/* Header of Widget */}
             <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 border-b border-slate-100 bg-white/80">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold tracking-widest text-slate-800">SANDRA IA • LIVE</span>
                </div>
                <button onClick={toggleWidget} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             {/* Content Area */}
             <div className="flex-1 relative overflow-hidden bg-slate-50">
                {appState === AppState.IDLE || appState === AppState.CONNECTING || appState === AppState.ERROR ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                         <div className="w-20 h-20 mb-4 rounded-full bg-blue-50 flex items-center justify-center animate-float">
                             <span className="text-3xl">🤖</span>
                         </div>
                         <h3 className="text-xl font-bold text-slate-800 mb-2">Asistente Virtual</h3>
                         <p className="text-sm text-slate-500 mb-6">Sandra puede ayudarte con el check-in, consejos locales y precios.</p>
                         
                         <button 
                            onClick={handleStartCall}
                            disabled={appState === AppState.CONNECTING}
                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
                         >
                            {appState === AppState.CONNECTING ? 'Conectando...' : 'Iniciar Videollamada'}
                         </button>
                         {appState === AppState.ERROR && <p className="text-red-400 text-xs mt-2">Error de conexión.</p>}
                    </div>
                ) : (
                    <LiveInterface 
                        onEndCall={handleEndCall}
                        bookingData={bookingData}
                        messages={transcripts}
                        onVideoFrame={handleVideoFrame}
                    />
                )}
             </div>
        </div>

        {/* TOGGLE BUTTON (Floating Action Button) */}
        <button 
            onClick={toggleWidget}
            className={`
                group relative flex items-center justify-center w-14 h-14 rounded-full 
                bg-gradient-to-tr from-brand-600 to-brand-500 border border-white/20 shadow-xl shadow-brand-500/30
                hover:scale-110 transition-transform duration-300
                ${isOpen ? 'rotate-90' : 'rotate-0'}
            `}
        >
            {!isOpen && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>}
            
            {isOpen ? (
                 <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
                 <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            )}
        </button>
    </div>
  );
};

export default GalaxyWidget;