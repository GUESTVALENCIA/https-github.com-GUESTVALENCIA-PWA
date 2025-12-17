import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveService } from '../services/geminiService';
import { playRingTone, playPickupSound, MediaStorage } from '../utils';
import LiveInterface from './LiveInterface';
import { BookingData } from '../types';

// --- ASSETS ---
const DEFAULT_HERO_IMG = "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1920&q=95";

const APARTMENTS = [
    { id: 1, title: "Ático Cabañal Beach", price: 120, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", features: "2 Hab • Terraza • Vistas al Mar" },
    { id: 2, title: "Loft Industrial Puerto", price: 95, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", features: "1 Hab • Diseño • Smart Lock" },
    { id: 3, title: "Casa Típica Marinera", price: 150, img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80", features: "3 Hab • Patio • Histórico" }
];

const MainWebsite: React.FC = () => {
  // --- STATE ---
  const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'CONNECTING' | 'LIVE' | 'ERROR'>('IDLE');
  const [transcripts, setTranscripts] = useState<{text: string, isUser: boolean}[]>([]);
  const [avatarMode, setAvatarMode] = useState<'LISTENING' | 'SEARCHING'>('LISTENING');
  
  // Media Assets State
  const [heroImageBlob, setHeroImageBlob] = useState<string>(DEFAULT_HERO_IMG);
  const [heroVideoBlob, setHeroVideoBlob] = useState<string | null>(null);
  
  // Controls
  const [bookingData, setBookingData] = useState<BookingData>({ pricePerNight: 120, available: true, guestCount: 2, discountApplied: false });

  // --- REFS ---
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const ringToneRef = useRef<{ stop: () => void } | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
      const loadAssets = async () => {
          try {
              const savedImg = await MediaStorage.getFile('custom_hero_image');
              if (savedImg instanceof Blob) setHeroImageBlob(URL.createObjectURL(savedImg));

              const savedVideo = await MediaStorage.getFile('custom_hero_video');
              if (savedVideo instanceof Blob) setHeroVideoBlob(URL.createObjectURL(savedVideo));
          } catch (e) { console.log("System: No cached assets found."); }
      };
      loadAssets();
  }, []);

  // --- HANDLERS ---
  const ensureApiKey = async (): Promise<string | undefined> => {
    if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await (window as any).aistudio.openSelectKey(); } catch (e) { return undefined; }
        }
    }
    return process.env.API_KEY;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const objectUrl = URL.createObjectURL(file);
      
      if (type === 'image') {
          setHeroImageBlob(objectUrl);
          await MediaStorage.saveFile('custom_hero_image', file);
      } else {
          setHeroVideoBlob(objectUrl);
          await MediaStorage.saveFile('custom_hero_video', file);
      }
      alert(`${type === 'image' ? 'Foto' : 'Vídeo'} cargado correctamente.`);
  };

  const startCall = async () => {
    const apiKey = await ensureApiKey();
    if (!apiKey) {
        alert("Por favor, selecciona una API Key para continuar.");
        return;
    }

    setCallState('RINGING');
    ringToneRef.current = playRingTone();

    setTimeout(async () => {
        if (ringToneRef.current) ringToneRef.current.stop();
        playPickupSound(); // CLACK
        
        setCallState('CONNECTING');
        
        // Start video playback if available
        if (heroVideoRef.current && heroVideoBlob) {
            try {
                heroVideoRef.current.currentTime = 0;
                await heroVideoRef.current.play();
            } catch (e) { console.log("Autoplay blocked/failed", e); }
        }

        if (!liveServiceRef.current) {
            liveServiceRef.current = new GeminiLiveService(apiKey);
        }
        
        try {
            await liveServiceRef.current.connect(
                (text, isUser) => setTranscripts(prev => [...prev.slice(-1), { text, isUser }]),
                (status) => {
                    if (status === 'CONNECTED') setCallState('LIVE');
                    if (status === 'DISCONNECTED') endCall();
                    if (status === 'ERROR') setCallState('ERROR');
                },
                async (toolName, args) => { 
                    if (toolName === 'setVisualState') setAvatarMode(args.state);
                    return { success: true }; 
                }
            );
        } catch (e) {
            console.error(e);
            setCallState('ERROR');
        }
    }, 2500); 
  };

  const endCall = async () => {
      if (liveServiceRef.current) {
          await liveServiceRef.current.disconnect();
          liveServiceRef.current = null;
      }
      if (ringToneRef.current) ringToneRef.current.stop();
      setCallState('IDLE');
      setTranscripts([]);
      
      if (heroVideoRef.current) {
          heroVideoRef.current.pause();
          heroVideoRef.current.currentTime = 0; 
      }
  };

  const handleVideoFrame = (base64: string) => {
      if (callState === 'LIVE' && liveServiceRef.current) {
          liveServiceRef.current.sendVideoFrame(base64);
      }
  };

  const isLive = callState === 'LIVE' || callState === 'CONNECTING' || callState === 'RINGING';

  return (
    <div className="font-sans text-slate-900 bg-white min-h-full flex flex-col">
        {/* NAVBAR */}
        <nav className="fixed top-0 left-0 right-0 w-full z-40 bg-brand-600 shadow-lg transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="#home" className="text-2xl font-bold text-white flex items-center gap-2 font-serif">
                    <span className="text-brand-100">Guests</span>Valencia
                </a>
                <div className="hidden md:flex gap-6 text-sm font-medium text-white/90">
                    <a href="#home" className="hover:text-white transition-colors">Inicio</a>
                    <a href="#alojamientos" className="hover:text-white transition-colors">Alojamientos</a>
                    <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>
                    <a href="#owners" className="hover:text-white transition-colors">Propietarios</a>
                    <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
                </div>
                <div className="flex gap-3 items-center">
                     <a href="https://wa.me/34624020085" target="_blank" rel="noreferrer" 
                       className="flex items-center gap-2 bg-green-500 hover:bg