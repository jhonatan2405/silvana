import ReceptionPanel from './ReceptionPanel';
import NotificationsPanel from './NotificationsPanel';
import {AnalysisPanel,AlertsPanel,useQuery} from './MonitoringPanels';
import StationMonitor from './StationMonitor';
import PairStation from './PairStation';
import type {Device} from './stationTypes';
import { SilvanaBrand } from './Brand';
import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Bell, ChevronRight, Clock3, Database, LayoutDashboard, Leaf, LogOut, MapPin, Radio, RefreshCw, Settings2, ShieldCheck, Sparkles, Thermometer, Droplets, Volume2, VolumeX, Waves, X } from 'lucide-react';

type Section = 'overview'|'devices'|'ingestion'|'analysis'|'alerts'|'notifications'|'account';
const navigation = [
 {id:'overview',label:'Vista general',icon:LayoutDashboard},
 {id:'devices',label:'Dispositivos',icon:Radio},
 {id:'ingestion',label:'Recepción de datos',icon:Database},
 {id:'analysis',label:'Análisis',icon:Waves},
 {id:'alerts',label:'Alertas',icon:ShieldCheck},
 {id:'notifications',label:'Notificaciones',icon:Bell},
] as const;
export default function Dashboard({user,devices,loading,error,time,onLogout,onAddDevice,onRefresh,busy,logoutLoading,soundEnabled,onToggleSound,onUnauthorized,children,pairRequest}:{user:{name:string;email:string;role:string};devices:Device[];loading:boolean;error:string;time:string;onLogout:()=>void;onAddDevice:()=>void;onRefresh:()=>void;busy:boolean;logoutLoading:ReactNode;soundEnabled:boolean;onToggleSound:()=>void;onUnauthorized:()=>void;children:ReactNode;pairRequest?:{deviceId:string;nonce:number}|null}){
 const [selectedStation,setSelectedStation]=useState('');
 const [section,setSection]=useState<Section>('overview');
 const [metric,setMetric]=useState('temperature');
 const [period,setPeriod]=useState('24h');
 const [menu,setMenu]=useState(false);
 // Coalesce pointer events without rerendering the dashboard or touching data polling.
 const glowFrame=useRef<number|null>(null);
 const glowPointer=useRef<{target:HTMLElement;x:number;y:number}|null>(null);
 const clearGlow=()=>{glowPointer.current=null;if(glowFrame.current!==null){cancelAnimationFrame(glowFrame.current);glowFrame.current=null;}};
 useEffect(()=>clearGlow,[]);
 const followGlow=(event:ReactPointerEvent<HTMLDivElement>)=>{
  if(event.pointerType==='touch')return;
  const target=(event.target as HTMLElement).closest<HTMLElement>('.glass-surface');
  if(!target){clearGlow();return;}
  glowPointer.current={target,x:event.clientX,y:event.clientY};
  if(glowFrame.current!==null)return;
  glowFrame.current=requestAnimationFrame(()=>{
   glowFrame.current=null;const pointer=glowPointer.current;if(!pointer?.target.isConnected)return;
   const rect=pointer.target.getBoundingClientRect();
   pointer.target.style.setProperty('--light-x',`${pointer.x-rect.left}px`);
   pointer.target.style.setProperty('--light-y',`${pointer.y-rect.top}px`);
  });
 };
 const enabled=devices.filter(device=>device.active).length;
 const go=(next:Section)=>{setSection(next);setMenu(false);};
 const add=()=>{go('devices');onAddDevice();};
 const current=navigation.find(item=>item.id===section);
 const notifications=useQuery('/api/notifications?limit=1',onUnauthorized);const unreadNotifications=notifications.data?.counts.unread??0;
 return <main className="dashboard-enter" aria-label="Dashboard de Silvana" aria-busy={busy}>
  <div className={'observatory-shell'+(menu?' nav-open':'')} onPointerMove={followGlow} onPointerLeave={clearGlow} onKeyDown={event=>{if(event.key==='Escape')setMenu(false);}}>
   <aside className="observatory-sidebar" inert={busy}>
    <a className="dash-brand" href="/" aria-label="Silvana, inicio"><SilvanaBrand/></a>
    <div className="workspace-label"><span className="workspace-orb"/>Tu espacio de monitoreo</div>
    <nav aria-label="Navegación principal">{navigation.map(item=><button key={item.id} onClick={()=>go(item.id)} aria-label={item.label} title={item.label} aria-current={section===item.id?'page':undefined}><item.icon size={18}/><span>{item.label}</span>{item.id==='devices'&&<small>{loading?'…':error?'—':devices.length}</small>}{item.id==='notifications'&&unreadNotifications>0&&<small aria-label={unreadNotifications+' sin leer'}>{unreadNotifications>99?'99+':unreadNotifications}</small>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="landscape-note"><Leaf size={19}/><p>Observa el presente.<br/><strong>Entiende tu entorno.</strong></p></div><button className={section==='account'?'account-link selected':'account-link'} onClick={()=>go('account')} aria-label="Mi cuenta" title="Mi cuenta"><span className="user-initial">{user.name.slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>Mi cuenta</small></span><Settings2 size={16}/></button></div>
   </aside>
   <div className="observatory-workspace">
    <header className="dashboard-header" inert={busy}><div className="dash-breadcrumb"><button className="mobile-nav-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'Cerrar navegación':'Abrir navegación'} aria-expanded={menu}>{menu?<X size={19}/>:<LayoutDashboard size={19}/>}</button><span>Mi espacio</span><ChevronRight size={13}/><strong>{current?.label||'Mi cuenta'}</strong></div><div className="dash-location"><MapPin size={14}/><span>Montería, Colombia</span><i/><time>{time}</time><button className="dashboard-sound" onClick={onToggleSound} aria-label={soundEnabled?'Desactivar sonido':'Activar sonido'} aria-pressed={soundEnabled}>{soundEnabled?<Volume2 size={15}/>:<VolumeX size={15}/>}<span>Ambiente</span><span className={'sound-levels'+(soundEnabled?' active':'')} aria-hidden="true"><i/><i/><i/></span></button></div></header>
    <div className="dashboard-scroll">
     <div className="dashboard-title" inert={busy}><div><h1>{section==='overview'?`Hola, ${user.name.split(' ')[0]}.`:current?.label||'Mi cuenta'}</h1><p>{section==='overview'?'Tu entorno, desde una nueva perspectiva.':section==='devices'?'Cada estación es una ventana a tu entorno.':section==='account'?'Tu identidad y tu acceso al espacio de monitoreo.':section==='ingestion'?'Consulta las mediciones recibidas y su origen.':section==='analysis'?'Explora cambios y compara fuentes de Montería.':section==='alerts'?'Define condiciones y revisa cuándo se cumplen.':'Consulta tus avisos y elige cómo recibirlos.'}</p></div>{section==='overview'&&<button className="dash-button" onClick={add}><Radio size={16}/>Agregar estación<ArrowRight size={16}/></button>}{section==='devices'&&<button className="dash-button quiet" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading?'spin':''}/>Actualizar</button>}</div>
     {section==='overview'&&<ReceptionPanel overview selectedStation={selectedStation} onStationChange={setSelectedStation} devices={devices} deviceError={error} onConnect={()=>go('devices')} onUnauthorized={onUnauthorized}/>}
     {section==='overview'&&<>
      {error&&<div className="dashboard-notice" role="alert"><span>No pudimos consultar tus dispositivos. {error}</span><button onClick={onRefresh}>Reintentar</button></div>}
      <section className="system-path" aria-label="Etapas del monitoreo"><div><span className="path-live"/><span>Acceso protegido</span></div><ChevronRight size={12}/><button onClick={()=>go('devices')}>Dispositivos</button><ChevronRight size={12}/><button onClick={()=>go('ingestion')}>Recepción</button><ChevronRight size={12}/><button onClick={()=>go('analysis')}>Análisis</button><ChevronRight size={12}/><button onClick={()=>go('alerts')}>Alertas</button><ChevronRight size={12}/><button onClick={()=>go('notifications')}>Notificaciones</button><small>Del sensor a tus avisos.</small></section>
     </>}
     {section==='ingestion'&&<ReceptionPanel selectedStation={selectedStation} onStationChange={setSelectedStation} devices={devices} deviceError={error} onConnect={()=>go('devices')} onUnauthorized={onUnauthorized}/>}
     {section==='analysis'&&<AnalysisPanel selectedStation={selectedStation} onStationChange={setSelectedStation} devices={devices} onUnauthorized={onUnauthorized}/>}
     {section==='alerts'&&<AlertsPanel devices={devices} onUnauthorized={onUnauthorized}/>}
     {section==='devices'&&<div className="dashboard-devices"><PairStation request={pairRequest} devices={devices} onUnauthorized={onUnauthorized}/>{children}</div>}
     {section==='notifications'&&<NotificationsPanel onUnauthorized={onUnauthorized} onUpdate={notifications.refresh}/>}
     {section==='account'&&<section className={'profile-section glass-surface'+(busy?' profile-is-loading':'')}><div className="profile-content" inert={busy}><div className="profile-intro"><span className="profile-avatar">{user.name.slice(0,1).toUpperCase()}</span><div><h2>{user.name}</h2><span><ShieldCheck size={14}/>Sesión protegida</span></div></div><dl><div><dt>Correo electrónico</dt><dd>{user.email}</dd></div><div><dt>Tipo de cuenta</dt><dd>{user.role==='usuario'?'Usuario':user.role}</dd></div></dl><p>Tu sesión se valida de forma periódica. Al salir, el acceso de esta sesión queda revocado.</p><button className="dash-button quiet" onClick={onLogout} disabled={busy}><LogOut size={16}/>Cerrar sesión</button>{error&&<p role="alert">{error}</p>}</div>{logoutLoading}</section>}
     <footer className="dashboard-footer"><span><Leaf size={12}/>Silvana · Monitoreo ambiental</span><span>El paisaje es ilustrativo · Las lecturas provienen de tus estaciones</span></footer>
    </div>
   </div>
  </div>
 </main>;
}
