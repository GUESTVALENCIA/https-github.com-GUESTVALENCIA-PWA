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
  const [isPaused, setIsPaused] = useState(false); // Estado de pausa solicitado
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // --- CAMERA LOGIC ---
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
    // CONTENEDOR FLOTANTE INVISIBLE (Capa superior)
    <div className="absolute inset-0 w-full h-full flex flex-col justify-between z-50 pointer-events-none overflow-hidden animate-fade-in">
      
      {/* TOP STATUS BAR (Estados de IA y Preview Cámara) */}
      <div className="w-full pt-4 px-6 flex justify-between items-start">
         <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 pointer-events-auto shadow-lg">
             <div className={`w-2 h-2 rounded-full animate-pulse ${avatarMode === 'SEARCHING' ? 'bg-blue-400' : (isPaused ? 'bg-yellow-500' : 'bg-green-500')}`}></div>
             <span className="text-[10px] font-bold text-white tracking-widest uppercase shadow-black">
                {avatarMode === 'SEARCHING' ? 'CONSULTANDO...' : (isPaused ? 'EN ESPERA' : 'EN LÍNEA')}
             </span>
         </div>

         {/* PiP Camera Preview */}
         <div className={`relative w-24 aspect-[3/4] bg-black/50 rounded-lg overflow-hidden border border-white/20 transition-all duration-300 pointer-events-auto shadow-2xl ${isCamActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <button 
                onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} 
                className="absolute bottom-1 right-1 text-white text-xs bg-black/50 p-1 rounded hover:bg-black/70 backdrop-blur-sm"
            >
                ↻
            </button>
         </div>
      </div>

      {/* MESSAGES (Subtítulos flotantes) */}
      <div className="flex-1 flex flex-col justify-end items-center w-full px-6 pb-28 space-y-2 overflow-y-hidden">
          {messages.slice(-1).map((msg, i) => (
              <div key={i} className={`pointer-events-auto max-w-xl p-0 text-center animate-fade-in`}>
                  <span className="inline-block bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-xl text-lg font-medium shadow-lg border border-white/5">
                    {msg.text}
                  </span>
              </div>
          ))}
          <div ref={messagesEndRef} />
      </div>

      {/* CONTROLS (Floating Bottom - Exactamente donde estaba el buscador) */}
      {/* Posición absoluta bottom-4 md:bottom-8, max-w-4xl centrado para coincidir con la Search Box */}
      <div className="absolute bottom-4 md:bottom-8 left-0 right-0 w-full px-4 flex justify-center pointer-events-auto">
          <div className="w-full max-w-4xl flex justify-center items-center gap-4 md:gap-6 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl transition-all transform animate-slide-up">
              
              {/* 1. ABRIR CÁMARA (Izquierda del todo) - Azul */}
              <button 
                onClick={() => setIsCamActive(!isCamActive)} 
                className={`p-3 md:p-4 rounded-full transition-all hover:scale-105 ${isCamActive ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="Compartir Visión (Cámara)"
              >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>

              {/* 2. SILENCIAR MICRÓFONO (Seguido) - Gris/Blanco */}
              <button 
                onClick={() => setIsMicActive(!isMicActive)} 
                className={`p-3 md:p-4 rounded-full transition-all hover:scale-105 ${!isMicActive ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="Silenciar Micrófono (Privacidad)"
              >
                  {!isMicActive ? (
                       <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                  ) : (
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  )}
              </button>

              {/* 3. PAUSAR (Seguido, con dos I mayúsculas) - Amarillo */}
              <button 
                onClick={() => setIsPaused(!isPaused)} 
                className={`p-3 md:p-4 rounded-full transition-all hover:scale-105 ${isPaused ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="Pausar / En Espera"
              >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>

              <div className="w-px h-8 bg-white/20 mx-2"></div>

              {/* 4. COLGAR (Derecha del todo) - Rojo */}
              <button 
                onClick={onEndCall} 
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition-all shadow-lg hover:scale-110"
                title="Colgar Llamada"
              >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12a9 9 0 1018 0 9 9 0 00-18 0z" /></svg>
              </button>

          </div>
      </div>
    </div>
  );
};

export default LiveInterface;