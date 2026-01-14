
import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Tab = 'available' | 'active' | 'profile';
type OrderStatus = 'idle' | 'accepted' | 'at-origin' | 'on-way-to-destination';

interface Order {
  id: number;
  vendor: string;
  pointA: { address: string; lat: number; lng: number };
  pointB: { address: string; lat: number; lng: number };
  fee: string;
  distance: string;
  type: string;
}

const App: React.FC = () => {
  // Core State
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [isOnline, setIsOnline] = useState(false);
  const [balance] = useState(119700);
  
  // Selection & Workflow
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  
  // Swipe Logic State
  const [swipeX, setSwipeX] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const sliderWidth = useRef(0);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.LayerGroup | null>(null);

  // Mock Data
  const availableOrders: Order[] = [
    {
      id: 901123,
      vendor: 'Gotto Pizza • Tashkent City',
      pointA: { address: 'ул. Амира Темура, 12', lat: 41.3111, lng: 69.2797 },
      pointB: { address: 'Юнусабад 4, д. 15', lat: 41.3500, lng: 69.2850 },
      fee: '12,500 сум',
      distance: '4.2 км',
      type: 'PayMe'
    },
    {
      id: 901124,
      vendor: 'Yaponamama • Chilonzor',
      pointA: { address: 'ул. Темура Малика, 3А', lat: 41.348, lng: 69.345 },
      pointB: { address: 'Кибрай, ул. Абая', lat: 41.358, lng: 69.355 },
      fee: '15,000 сум',
      distance: '1.8 км',
      type: 'Cash'
    }
  ];

  // Initialize Map Once
  useEffect(() => {
    if (mapContainerRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([41.3200, 69.2900], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);
      markersGroup.current = L.layerGroup().addTo(mapInstance.current);
    }
    
    // Invalidate size on state changes to ensure map takes full remaining space
    const timer = setInterval(() => mapInstance.current?.invalidateSize(), 500);
    return () => clearInterval(timer);
  }, []);

  // Sync Map with Markers and Zoom
  useEffect(() => {
    if (!markersGroup.current || !mapInstance.current) return;
    markersGroup.current.clearLayers();

    const courierPos: [number, number] = [41.3200, 69.2900];
    
    // 1. Courier Marker
    L.marker(courierPos, {
      icon: L.divIcon({ className: 'courier-marker', iconSize: [20, 20] })
    }).addTo(markersGroup.current);

    const relevantOrder = currentOrder || selectedOrder;

    if (relevantOrder) {
      // 2. Point A Marker
      const iconA = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin marker-pin-a"><span>A</span></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32]
      });
      L.marker([relevantOrder.pointA.lat, relevantOrder.pointA.lng], { icon: iconA }).addTo(markersGroup.current);

      // 3. Point B Marker
      const iconB = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin marker-pin-b"><span>B</span></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32]
      });
      L.marker([relevantOrder.pointB.lat, relevantOrder.pointB.lng], { icon: iconB }).addTo(markersGroup.current);

      // 4. Auto-Fit Bounds
      const bounds = L.latLngBounds([
        courierPos, 
        [relevantOrder.pointA.lat, relevantOrder.pointA.lng], 
        [relevantOrder.pointB.lat, relevantOrder.pointB.lng]
      ]);
      mapInstance.current.fitBounds(bounds, { padding: [80, 80], animate: true });
    } else {
      mapInstance.current.setView(courierPos, 14, { animate: true });
    }
  }, [selectedOrder, currentOrder]);

  // Swipe-to-Online Handlers
  const handleStart = (e: any) => {
    isDragging.current = true;
    startX.current = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const container = e.currentTarget.parentElement;
    sliderWidth.current = container.offsetWidth - 76; // width minus handle size
  };

  const handleMove = useCallback((e: any) => {
    if (!isDragging.current) return;
    const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const diff = Math.max(0, Math.min(sliderWidth.current, currentX - startX.current));
    setSwipeX(diff);
    
    if (diff >= sliderWidth.current * 0.95) {
      isDragging.current = false;
      setIsOnline(true);
      setSwipeX(0);
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (swipeX < sliderWidth.current * 0.95) setSwipeX(0);
  }, [swipeX]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [handleMove, handleEnd]);

  // Lifecycle Methods
  const acceptOrder = (order: Order) => {
    setCurrentOrder(order);
    setOrderStatus('accepted');
    setActiveTab('active');
    setSelectedOrder(null);
  };

  const markArrived = () => setOrderStatus('at-origin');
  const markPickedUp = () => setOrderStatus('on-way-to-destination');
  const markCompleted = () => {
    setCurrentOrder(null);
    setOrderStatus('idle');
    setActiveTab('available');
  };

  const goOffline = () => {
    setIsOnline(false);
    setCurrentOrder(null);
    setOrderStatus('idle');
    setSelectedOrder(null);
  };

  return (
    <div className="h-full w-full relative overflow-hidden flex flex-col bg-slate-950">
      
      {/* 1. MAP LAYER (Occupies 100% background, visually focused top 70-80%) */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full"></div>

      {/* 2. TOP HUD */}
      <div className="absolute top-12 left-6 right-6 z-50 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-4 px-6 rounded-[28px] border border-white/10 shadow-2xl pointer-events-auto">
          <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Баланс</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black">{balance.toLocaleString()}</span>
            <span className="text-xs font-bold text-slate-400">сум</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 pointer-events-auto">
          <button className="w-14 h-14 bg-slate-900/90 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl active:scale-90 transition-all">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          {isOnline && (
             <div className="bg-emerald-500/20 backdrop-blur-xl px-4 py-2 rounded-full border border-emerald-500/30 flex items-center gap-2 shadow-lg">
                <div className="status-pulse"></div>
                <span className="text-[10px] font-black uppercase text-emerald-400">Online</span>
             </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM PANEL (SHEET) */}
      <div 
        className={`bottom-sheet z-40 px-7 pb-10 transition-all duration-500 overflow-hidden ${isOnline ? 'h-[48vh]' : 'h-[34vh]'}`}
      >
        <div className="w-14 h-1.5 bg-slate-800/40 rounded-full mx-auto my-5 flex-shrink-0"></div>

        {!isOnline ? (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-1">Tashkent</h2>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                  <span className="uppercase tracking-[0.1em]">Спрос:</span>
                  <div className="flex gap-1 h-3 items-end">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <div className="w-1.5 h-3 bg-slate-700 rounded-full"></div>
                    <div className="w-1.5 h-2 bg-slate-700 rounded-full"></div>
                  </div>
                  <span className="text-slate-500">Средний</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Сегодня</p>
                <p className="text-lg font-black text-emerald-400">+42,000 сум</p>
              </div>
            </div>

            <div className="swipe-container mt-auto mb-4" onMouseDown={handleStart} onTouchStart={handleStart}>
              <div className="absolute left-0 top-0 bottom-0 bg-blue-500/20 transition-all" style={{ width: swipeX + 32 }}></div>
              <div className="swipe-handle" style={{ transform: `translateX(${swipeX}px)` }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
              </div>
              <span className="swipe-text" style={{ opacity: 1 - swipeX / (sliderWidth.current || 200) }}>Выйти в онлайн</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* TABS HEADER */}
            <div className="flex items-center justify-between mb-7 flex-shrink-0">
              <div className="flex gap-7">
                <button 
                  onClick={() => setActiveTab('available')} 
                  className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'available' ? 'text-blue-400 border-b-2 border-blue-400 pb-1.5 scale-105' : 'text-slate-500'}`}
                >
                  Заказы
                </button>
                <button 
                  onClick={() => setActiveTab('active')} 
                  className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1.5 scale-105' : 'text-slate-500'}`}
                >
                  Активные {currentOrder ? '●' : ''}
                </button>
                <button 
                  onClick={() => setActiveTab('profile')} 
                  className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'text-white border-b-2 border-white pb-1.5 scale-105' : 'text-slate-500'}`}
                >
                  Профиль
                </button>
              </div>
              <button 
                onClick={goOffline} 
                className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-tighter rounded-xl border border-red-500/20 active:bg-red-500 active:text-white transition-all"
              >
                Оффлайн
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-grow overflow-y-auto custom-scroll pr-1 pb-6">
              {activeTab === 'available' && (
                <div className="space-y-4">
                  {availableOrders.map(order => (
                    <div 
                      key={order.id} 
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className={`p-6 rounded-[32px] border transition-all active:scale-[0.98] cursor-pointer ${selectedOrder?.id === order.id ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/10' : 'bg-slate-900/40 border-white/5'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Ресторан</p>
                          <h4 className="font-extrabold text-base">{order.vendor}</h4>
                        </div>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">{order.fee}</span>
                      </div>
                      <div className="flex items-center gap-5 text-[11px] text-slate-400 font-bold mb-4">
                        <span className="flex items-center gap-1">📍 {order.distance}</span>
                        <span className="flex items-center gap-1">💳 {order.type}</span>
                      </div>
                      {selectedOrder?.id === order.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); acceptOrder(order); }}
                          className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                        >
                          Принять заказ
                        </button>
                      )}
                    </div>
                  ))}
                  {availableOrders.length === 0 && (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-600 grayscale opacity-40">
                      <span className="text-5xl mb-2">🔭</span>
                      <p className="text-[10px] font-black uppercase tracking-widest">Ищем заказы поблизости...</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'active' && (
                <div className="h-full">
                  {!currentOrder ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 py-10">
                      <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-white/5">📦</div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-50">У вас нет активных заказов</p>
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-emerald-500/20 p-7 rounded-[40px] shadow-2xl animate-in zoom-in-95">
                      <div className="flex justify-between items-start mb-7">
                        <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className="status-pulse"></span> В работе
                          </p>
                          <h4 className="text-xl font-black tracking-tight">{currentOrder.vendor}</h4>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/20">🍔</div>
                      </div>

                      <div className="space-y-6 mb-10">
                        <div className="flex gap-5 items-start">
                          <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-sm border-2 ${orderStatus === 'accepted' ? 'bg-blue-600 border-white text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>A</div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Откуда забрать</p>
                            <p className="text-xs font-bold text-slate-200">{currentOrder.pointA.address}</p>
                          </div>
                        </div>
                        <div className="h-8 w-0.5 bg-slate-800 ml-[18px]"></div>
                        <div className="flex gap-5 items-start">
                          <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-sm border-2 ${orderStatus === 'on-way-to-destination' ? 'bg-red-500 border-white text-white shadow-lg shadow-red-500/30' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>B</div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Куда доставить</p>
                            <p className="text-xs font-bold text-slate-200">{currentOrder.pointB.address}</p>
                          </div>
                        </div>
                      </div>

                      {/* WORKFLOW CONTROLS */}
                      <div className="grid grid-cols-1 gap-4">
                        {orderStatus === 'accepted' && (
                          <button onClick={markArrived} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-blue-500/30 active:scale-95 transition-all">Я на месте (Точка A)</button>
                        )}
                        {orderStatus === 'at-origin' && (
                          <button onClick={markPickedUp} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-emerald-500/30 active:scale-95 transition-all">Заказ получен</button>
                        )}
                        {orderStatus === 'on-way-to-destination' && (
                          <button onClick={markCompleted} className="w-full bg-white text-slate-950 hover:bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-2xl active:scale-95 transition-all">Заказ доставлен</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-5 animate-in slide-in-from-right-4">
                  <div className="p-7 rounded-[36px] bg-slate-900/80 border border-white/5 flex items-center gap-6 shadow-xl">
                    <div className="w-18 h-18 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-500/30 border-2 border-white/10">И</div>
                    <div>
                      <p className="font-black text-2xl tracking-tight">Иван Курьер</p>
                      <p className="text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Партнер Профи
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-6 rounded-[32px] bg-slate-900/50 border border-white/5 backdrop-blur-md">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Рейтинг</p>
                      <p className="text-2xl font-black text-yellow-400">⭐ 4.99</p>
                    </div>
                    <div className="p-6 rounded-[32px] bg-slate-900/50 border border-white/5 backdrop-blur-md">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Заказы</p>
                      <p className="text-2xl font-black">2,412</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-[32px] bg-slate-900/50 border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase mb-1">Реферальный код</p>
                      <p className="font-black text-blue-400">COURIER_882</p>
                    </div>
                    <button className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. PERSISTENT NAVIGATOR OVER MAP */}
      {currentOrder && (
        <button className="absolute bottom-[52vh] right-8 z-50 w-16 h-16 bg-blue-600 text-white rounded-[20px] flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-slate-950 animate-in bounce-in">
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
      )}
    </div>
  );
};

export default App;
