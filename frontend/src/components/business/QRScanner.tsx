import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, AlertCircle, Camera } from 'lucide-react';

interface QRScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
    mode: 'flash_code' | 'reward_redeem' | 'passport_reward';
    title?: string;
}

// Dynamically load jsQR library if not already loaded
const loadJsQR = (): Promise<(data: Uint8ClampedArray, width: number, height: number) => { data: string } | null> => {
    return new Promise((resolve, reject) => {
        if ((window as any).jsQR) {
            resolve((window as any).jsQR);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        script.onload = () => resolve((window as any).jsQR);
        script.onerror = () => reject(new Error('Failed to load jsQR'));
        document.head.appendChild(script);
    });
};

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, mode, title }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const jsQRRef = useRef<((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null>(null);
    const scannedRef = useRef(false);

    const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading');
    const [cameraError, setCameraError] = useState<string | null>(null);

    const modeColors: Record<string, string> = {
        flash_code: '#00f3ff',
        reward_redeem: '#a855f7',
        passport_reward: '#22c55e',
    };
    const scanColor = modeColors[mode] || '#00f3ff';

    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const scanFrame = useCallback(() => {
        if (scannedRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const jsQR = jsQRRef.current;

        if (!video || !canvas || !jsQR || video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = (jsQR as any)(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });

        if (code?.data) {
            scannedRef.current = true;
            stopCamera();

            let scannedCode = code.data;
            if (scannedCode.startsWith('http://') || scannedCode.startsWith('https://')) {
                try {
                    const url = new URL(scannedCode);
                    const pathParts = url.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        // Extract the last part of the URL path (e.g. the hash_id)
                        scannedCode = pathParts[pathParts.length - 1];
                    }
                } catch (e) {
                    // Ignore parse error, use raw string
                }
            } else if (scannedCode.startsWith('PARCHE:')) {
                scannedCode = scannedCode.split(':')[1] || scannedCode;
            }
            onScan(scannedCode.toUpperCase().trim());
        } else {
            animFrameRef.current = requestAnimationFrame(scanFrame);
        }
    }, [onScan, stopCamera]);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                // Load jsQR
                jsQRRef.current = await loadJsQR();

                if (cancelled) return;

                // Request camera with back camera preference
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadeddata = () => {
                        if (!cancelled) {
                            setStatus('scanning');
                            animFrameRef.current = requestAnimationFrame(scanFrame);
                        }
                    };
                }
            } catch (err: any) {
                if (cancelled) return;
                if (err?.name === 'NotAllowedError') {
                    setCameraError('Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador e intenta de nuevo.');
                } else if (err?.message?.includes('jsQR')) {
                    setCameraError('No se pudo cargar el módulo de escaneo. Verifica tu conexión a internet.');
                } else {
                    setCameraError('No se pudo acceder a la cámara. Verifica que el sitio esté en HTTPS o localhost y que la cámara no esté siendo usada por otra app.');
                }
                setStatus('error');
            }
        };

        init();

        return () => {
            cancelled = true;
            stopCamera();
        };
    }, [scanFrame, stopCamera]);

    const modeLabels: Record<string, string> = {
        flash_code: 'Escanear código flash del usuario',
        reward_redeem: 'Escanear código de recompensa',
        passport_reward: 'Escanear ticket de pasaporte',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem'
        }}>
            {/* Header */}
            <div style={{ width: '100%', maxWidth: '460px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={20} color={scanColor} />
                        {title || modeLabels[mode]}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                        Apunta la cámara al código QR o código de barras
                    </p>
                </div>
                <button
                    onClick={() => { stopCamera(); onClose(); }}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', flexShrink: 0 }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Camera viewport */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '460px', borderRadius: '24px', overflow: 'hidden', background: '#111', aspectRatio: '1/1' }}>
                {cameraError ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', gap: '1rem' }}>
                        <AlertCircle size={48} color="#f87171" />
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', margin: 0 }}>{cameraError}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0 }}>
                            Tip: Asegúrate de acceder desde <strong>localhost</strong> o un dominio con <strong>HTTPS</strong>.
                        </p>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            playsInline
                            autoPlay
                            muted
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Overlay: Loading spinner */}
                        {status === 'loading' && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                                <Loader2 size={36} className="animate-spin" color={scanColor} />
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700' }}>Iniciando cámara...</span>
                            </div>
                        )}

                        {/* Overlay: Scan frame */}
                        {status === 'scanning' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
                                <div style={{ position: 'relative', width: '62%', aspectRatio: '1/1' }}>
                                    {/* Corner brackets */}
                                    {[
                                        { top: 0, left: 0, borderTop: true, borderLeft: true, borderRadius: '4px 0 0 0' },
                                        { top: 0, right: 0, borderTop: true, borderRight: true, borderRadius: '0 4px 0 0' },
                                        { bottom: 0, left: 0, borderBottom: true, borderLeft: true, borderRadius: '0 0 0 4px' },
                                        { bottom: 0, right: 0, borderBottom: true, borderRight: true, borderRadius: '0 0 4px 0' },
                                    ].map((_, i) => (
                                        <div key={i} style={{
                                            borderTopWidth: '2px',
                                            borderBottomWidth: '2px',
                                            borderLeftWidth: '2px',
                                            borderRightWidth: '2px',
                                            borderStyle: 'solid',
                                            borderColor: '#FF4D00', // El color neón de Parché
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            // CORRECCIÓN: Usamos operadores ternarios para pasar strings, no booleanos
                                            borderTopColor: i === 0 || i === 1 ? '#FF4D00' : 'transparent',
                                            borderLeftColor: i === 0 || i === 2 ? '#FF4D00' : 'transparent',
                                            borderRightColor: i === 1 || i === 3 ? '#FF4D00' : 'transparent',
                                            borderBottomColor: i === 2 || i === 3 ? '#FF4D00' : 'transparent',
                                            width: '40px',
                                            height: '40px',
                                        } as React.CSSProperties}
                                        />
                                    ))}
                                    {/* Animated scan line */}
                                    <div style={{ position: 'absolute', inset: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: '100%', height: '2px',
                                            background: `linear-gradient(90deg, transparent, ${scanColor}, transparent)`,
                                            boxShadow: `0 0 10px ${scanColor}`,
                                            animation: 'qrScanMove 2s ease-in-out infinite',
                                        }} />
                                    </div>
                                </div>
                                <div style={{ position: 'absolute', bottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: scanColor, fontWeight: '700', fontSize: '0.82rem' }}>
                                    <Loader2 size={15} className="animate-spin" />
                                    Buscando código...
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
        @keyframes qrScanMove {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(120px); opacity: 0.6; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};
