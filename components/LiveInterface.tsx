import React, { useEffect, useRef, useState } from 'react';
import { BookingData } from '../types';

interface LiveInterfaceProps {
  onEndCall: () => void;
  bookingData: BookingData;
  messages: { text: string, isUser: boolean }[];
  onVideoFrame: (base64: string) => void;
  avatarMode?: 'LISTENING' | 'SEARCHING';
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ onEndCall, messages, onVideoFrame, avatarMode = 'LISTENING' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isMicActive, setIsMicActive] = useState(true);
  const [isCamActive, setIsCamActive] = useState(false); 
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    let stream: MediaStream | null = null;
    const setupCamera = async () => {
      if (isCamActive) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: facingMode }, audio: false 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch(e) { 
            console.error("Camera error", e);
            setIsCamActive(false); 
        }
      } else {
          if (videoRef.current && videoRef.current.srcObject) {
              const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
              tracks.forEach(t => t.stop());
              videoRef.current.srcObject = null;
          }
      }
    };
    setupCamera();
    return () => { 
        if (stream) stream.getTracks().forEach(t => t.stop()); 
    };
  }, [isCamActive, facingMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isCamActive && videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx && videoRef.current.videoWidth > 0) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            onVideoFrame(base64);
        }
      }
    }, 1000); 
    return () => clearInterval(interval);
  }, [isCamActive, onVideoFrame]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col justify-between z-50 pointer-events-none overflow-hidden">
      
      {/* TOP STATUS BAR */}
      <div className="w-full pt-4 px-6 flex justify-between items-start">
         <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 pointer-events-auto shadow-lg">
             <div className={`w-2 h-2 rounded-full animate-pulse ${avatarMode === 'SEARCHING' ? 'bg-blue-400' : 'bg-green-500'}`}></div>
             <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                {avatarMode === 'SEARCHING' ? 'CONSULTANDO...' : 'EN LÍNEA'}
             </span>
         </div>

         {/* PiP Camera Preview */}
         <div className={`relative w-24 aspect-[3/4] bg-black/50 rounded-lg overflow-hidden border border-white/20 transition-all duration-300 pointer-events-auto ${isCamActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <button 
                onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} 
                className="absolute bottom-1 right-1 text-white text-xs bg-black/50 p-1 rounded hover:bg-black/70"
            >
                ↻
            </button>
         </div>
      </div>

      {/* MESSAGES - Subtítulos Flotantes */}
      <div className="flex-1 flex flex-col justify-end items-center w-full px-6 pb-28 space-y-2 overflow-y-hidden">
          {messages.slice(-1).map((msg, i) => (
              <div key={i} className={`pointer-events-auto max-w-2xl text-center animate-fade-in`}>
                  <span className="inline-block bg-black/50 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-lg md:text-xl font-medium shadow-lg border border-white/10">
                    {msg.text}
                  </span>
              </div>
          ))}
          <div ref={messagesEndRef} />
      </div>

      {/* CONTROLS (Floating Bottom) */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center pointer-events-auto pb-4">
          <div className="flex items-center gap-6 bg-black/40 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full shadow-2xl transition-transform hover:scale-105">
              
              <button 
                onClick={() => setIsMicActive(!isMicActive)} 
                className={`p-4 rounded-full transition-all ${isMicActive ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'}`}
              >
                  {isMicActive ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                  )}
              </button>

              <button 
                onClick={onEndCall} 
                className="px-8 py-4 rounded-full bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg flex items-center gap-2 transform hover:scale-105"
              >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12a9 9 0 1018 0 9 9 0 00-18 0z" /></svg>
                  <span>Finalizar</span>
              </button>

              <button 
                onClick={() => setIsCamActive(!isCamActive)} 
                className={`p-4 rounded-full transition-all ${isCamActive ? 'bg-blue-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                title="Mostrar mi entorno"
              >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
          </div>
      </div>
    </div>
  );
};

export default LiveInterface;