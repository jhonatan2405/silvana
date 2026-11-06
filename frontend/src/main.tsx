import {confirmAction,notifySuccess,notifyError} from './uiFeedback';
import type {Device} from './stationTypes';
import '@fontsource-variable/manrope';
import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Check, ChevronRight, ChevronUp, CloudRain, Copy, Eye, EyeOff, Github, Leaf, LoaderCircle, LogOut, MapPin, Moon, Plus, Radio, RefreshCw, ShieldCheck, Sun, Sunset, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import Dashboard from './Dashboard';
import { BrandLoading, SilvanaBrand } from './Brand';
import Scene, { Weather, resolvedWeather } from './Scene';
import './style.css';
import { useAmbient } from './useAmbient';

type User = { id: string; name: string; email: string; role: string };
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
async function api(path: string, options: RequestInit = {}) {
  let response: Response;
  try { response = await fetch('/api' + path, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new ApiError(0, 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.'); }
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, typeof body.detail === 'string' ? body.detail : 'Revisa los datos ingresados e inténtalo nuevamente.');
  return body;
}

function App() {
  const [register, setRegister] = useState(false);
  const [entering,setEntering]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const signingOut=useRef(false);
  const [returning,setReturning]=useState(false);
  const [authComplete,setAuthComplete]=useState(false);
  useEffect(()=>{if(!returning)return;const timer=setTimeout(()=>setReturning(false),1000);return()=>clearTimeout(timer);},[returning]);
  const [weather, setWeather] = useState<Weather>('auto');
  const [rain, setRain] = useState(false);
  const [creatorStorm,setCreatorStorm]=useState(false);
  useEffect(()=>{const clear=()=>setCreatorStorm(false);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);return()=>{window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};},[]);
  const motion = true;
  const [clock, setClock] = useState(new Date());
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [adding, setAdding] = useState(false);
  const [credential, setCredential] = useState('');
  const [copied, setCopied] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);

  const checkSession = async () => {
    setChecking(true); setSessionError('');
    try { setUser((await api('/auth/me')).user); }
    catch (e) { if (e instanceof ApiError && e.status !== 401) setSessionError('El servicio de acceso no responde. Puedes revisar el diseño y volver a intentar la conexión.'); }
    finally { setChecking(false); }
  };
  useEffect(() => { void checkSession(); const id = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(id); }, []);
  const expireSession = () => { if(signingOut.current)return;setUser(null); setDevices([]); setCredential(''); setAdding(false); setEditing(null); setExpired(true); };
  const currentUserId=useRef(user?.id);currentUserId.current=user?.id;
  const loadDevices = async (background=false) => {
    const owner=user?.id;if(!owner||signingOut.current)return;
    if(!background){setLoadingDevices(true);setDeviceError('');}
    try { const result=await api('/devices?limit=100');if(currentUserId.current===owner&&!signingOut.current){setDevices(result.items);setDeviceError('');} }
    catch (e) { if(currentUserId.current!==owner||signingOut.current)return;if (e instanceof ApiError && e.status === 401) expireSession(); else setDeviceError((e as Error).message); }
    finally { if(!background&&currentUserId.current===owner)setLoadingDevices(false); }
  };
  useEffect(() => { if(!user)return;void loadDevices();let pending=false;const refresh=async()=>{if(pending||document.hidden||signingOut.current)return;pending=true;try{await loadDevices(true);}finally{pending=false;}};const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);}; }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    const validate = async () => {
      try { await api('/auth/me'); }
      catch (e) { if (e instanceof ApiError && e.status === 401) expireSession(); }
    };
    const interval = setInterval(validate, 60000);
    window.addEventListener('focus', validate);
    return () => { clearInterval(interval); window.removeEventListener('focus', validate); };
  }, [user?.id]);
  const switchForm = () => { setRegister(!register); setError(''); setNotice(''); setShowPassword(false); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setAuthComplete(false); setBusy(true);
    const data = new FormData(event.currentTarget);
    const loadingStarted=performance.now();
    const settleLoading=()=>new Promise(resolve=>setTimeout(resolve,Math.max(0,650-(performance.now()-loadingStarted))));
    try {
      if (register) {
        await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: data.get('name'), email: data.get('email'), password: data.get('password') }) });
        await settleLoading();setAuthComplete(true);
        await new Promise(resolve=>setTimeout(resolve,450));
        setRegister(false); setShowPassword(false); setNotice('Tu cuenta está lista. Inicia sesión para continuar.');
      } else {
        const result=await api('/auth/login', {method:'POST',body:JSON.stringify({email:data.get('email'),password:data.get('password')})});
        await settleLoading();setExpired(false);setSessionError('');setCreatorStorm(false);setAuthComplete(true);
        await new Promise(resolve=>setTimeout(resolve,280));setEntering(true);
        await new Promise(resolve=>setTimeout(resolve,1000));
        setUser(result.user);setEntering(false);setNotice('');
      }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); setAuthComplete(false); }
  }
  async function logout() {
    if(signingOut.current)return;signingOut.current=true;
    setBusy(true);setAuthComplete(false);setDeviceError('');
    const logoutStarted=performance.now();
    try {
      await api('/auth/logout', {method:'POST'});
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,700-(performance.now()-logoutStarted))));
      setAuthComplete(true);await new Promise(resolve=>setTimeout(resolve,250));setLeaving(true);
      await new Promise(resolve=>setTimeout(resolve,900));
      setReturning(true);setUser(null);setDevices([]);setCredential('');setNotice('Cerraste sesión correctamente.');setAdding(false);setEditing(null);
    }
    catch (e) { setDeviceError('No pudimos cerrar la sesión en el servidor. Intenta nuevamente.'); }
    finally { setBusy(false);setLeaving(false);setAuthComplete(false);signingOut.current=false; }
  }
  async function saveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setDeviceBusy('save'); setDeviceError('');
    const data = new FormData(event.currentTarget);
    try {
      const payload = { name: data.get('name'), location: data.get('location'), model: data.get('model'), ...(editing ? { active: editing.active } : {}) };
      const result = await api(editing ? '/devices/' + editing.id : '/devices', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (result.credential) { setCredential(result.credential); setCopied(false); }
      setAdding(false); setEditing(null); await loadDevices();notifySuccess('Estación guardada.');
    } catch (e) { if (e instanceof ApiError && e.status === 401) expireSession(); else {setDeviceError((e as Error).message);notifyError((e as Error).message);} }
    finally { setDeviceBusy(null); }
  }
  async function deviceAction(device: Device, action: 'delete' | 'toggle' | 'rotate') {
    setDeviceBusy(device.id); setDeviceError('');
    try {
      if (action === 'delete') { await api('/devices/' + device.id, { method: 'DELETE' }); }
      if (action === 'toggle') await api('/devices/' + device.id, { method: 'PUT', body: JSON.stringify({ name: device.name, location: device.location, model: device.model, active: !device.active }) });
      if (action === 'rotate') { const result = await api('/devices/' + device.id + '/rotate-credential', { method: 'POST' }); setCredential(result.credential); setCopied(false); }
      await loadDevices();notifySuccess(action==='delete'?'Estación eliminada.':action==='rotate'?'Credencial renovada.':'Estado de la estación actualizado.');
    } catch (e) { if (e instanceof ApiError && e.status === 401) expireSession(); else {setDeviceError((e as Error).message);notifyError((e as Error).message);} }
    finally { setDeviceBusy(null); }
  }
  const mode = resolvedWeather(weather);
  const ambient = useAmbient(mode, rain || creatorStorm, !checking,{automatic:weather==='auto',storm:creatorStorm});
  useEffect(()=>{if(entering)ambient.cue('enter');},[entering]);
  useEffect(()=>{if(leaving)ambient.cue('exit');},[leaving]);
  const time = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(clock);
  const modes = [ ['auto', 'Ahora', Activity], ['day', 'Día', Sun], ['sunset', 'Atardecer', Sunset], ['dusk', 'Anochecer', Moon], ['night', 'Noche', Moon] ] as const;
  const modeIndex = modes.findIndex(item => item[0] === weather);
  const activeMode = modes[modeIndex];
  const ModeIcon = activeMode[2];

  return <div className={'app-shell' + (!checking ? (user ? ' immersive-dashboard' : ' immersive-access motion-enabled') : ' silvana-boot') + (entering?' access-departing':'') + (leaving?' dashboard-departing':'') + (returning?' access-returning':'')}>
    {!checking && <div className={'environment-backdrop scene-' + mode}><Scene weather={weather} rain={rain || creatorStorm} storm={creatorStorm} register={register} motion={motion} dashboard={Boolean(user)&&!entering&&!leaving}/><div className="environment-vignette"/></div>}
    <header className="site-header"><a className="brand" href="/" aria-label="Silvana, inicio"><SilvanaBrand/></a><div className="header-meta"><div className="header-location"><MapPin size={14}/><span>Montería, Colombia</span><span className="header-dot"/>{time}</div>{!user && !checking && <button className="header-sound" onClick={ambient.toggle} aria-pressed={ambient.enabled} aria-label={ambient.enabled ? 'Desactivar sonido' : 'Activar sonido'} title={ambient.enabled ? 'Desactivar sonido' : 'Activar sonido'}>{ambient.enabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>}</div></header>
    {checking ? <main className="session-check"><BrandLoading kind="page" label="Preparando tu entorno" detail="Recuperando tu espacio en Silvana."/></main> : user ?
      <Dashboard user={user} devices={devices} loading={loadingDevices} error={deviceError} time={time} onLogout={logout} onRefresh={()=>void loadDevices()} onUnauthorized={expireSession} busy={busy} logoutLoading={busy&&!leaving?<BrandLoading kind="card" label="Cerrando sesión" complete={authComplete}/>:null} soundEnabled={ambient.enabled} onToggleSound={ambient.toggle} onAddDevice={()=>{setAdding(true);setEditing(null);setDeviceError('');}}>
        <section className="devices-panel" aria-label="Mis dispositivos"><div className="section-heading"><h2>Mis estaciones <span>{devices.length}</span></h2><button className="primary compact" onClick={() => { setAdding(true); setEditing(null); setDeviceError(''); }} disabled={adding || !!editing}><Plus size={16}/>Agregar dispositivo</button></div>
          {deviceError && <div className="feedback error" role="alert">{deviceError}<button className="text-button" onClick={()=>void loadDevices()}>Reintentar</button></div>}
          {credential && <section className="credential-box" aria-label="Credencial del dispositivo"><div className="section-heading"><strong>Guarda esta credencial</strong><button className="icon-button" aria-label="Ocultar credencial" onClick={() => setCredential('')}><X size={18}/></button></div><p>Solo se muestra una vez. La necesita tu dispositivo para identificarse. No la compartas.</p><code>{credential}</code><button className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(credential); setCopied(true); } catch { setDeviceError('No se pudo copiar. Selecciona la credencial y cópiala manualmente.'); } }}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copiada' : 'Copiar credencial'}</button></section>}
          {(adding || editing) && <form className="device-form" onSubmit={saveDevice}><h3>{editing ? 'Editar dispositivo' : 'Nueva estación'}</h3><label>Nombre<input name="name" defaultValue={editing?.name} placeholder="Estación del patio" minLength={2} maxLength={100} required autoFocus/></label><label>Ubicación<input name="location" defaultValue={editing?.location} placeholder="Montería · Patio principal" minLength={2} maxLength={160} required/></label><label>Modelo<input name="model" defaultValue={editing?.model || 'ESP32'} minLength={2} maxLength={80} required/></label><div className="form-actions"><button className="primary compact" disabled={deviceBusy === 'save'}>{deviceBusy === 'save' ? 'Guardando…' : 'Guardar dispositivo'}</button><button type="button" className="secondary" onClick={() => { setAdding(false); setEditing(null); }}>Cancelar</button></div></form>}
          {loadingDevices ? <BrandLoading label="Buscando tus estaciones" detail="Recuperando tus dispositivos."/> : devices.length === 0 && !deviceError ? <div className="empty-state"><div className="empty-symbol"><Radio size={38}/></div><h3>Tu primera estación está por llegar</h3><p>Registra un ESP32 para organizar tus dispositivos y generar su credencial de acceso.</p>{!adding && <button className="text-button" onClick={() => setAdding(true)}>Registrar mi primer dispositivo <ArrowRight size={16}/></button>}</div> : <div className="device-list">{devices.map(device => <article className="device-row" key={device.id}><div className="device-row-main"><span className="device-symbol"><Radio size={23}/></span><div><h3>{device.name}</h3><p>{device.location} · {device.model}</p></div><span className={'status ' + (device.online&&!deviceError ? 'enabled' : '')}>{deviceError?'Sin actualizar':!device.active?'Deshabilitada':device.online?'Conectada':'Sin comunicación'}</span></div><div className="device-row-actions"><button className="text-button" onClick={() => { setEditing(device); setAdding(false); }} disabled={!!deviceBusy}>Editar</button><button className="text-button" onClick={() => deviceAction(device, 'toggle')} disabled={!!deviceBusy}>{device.active ? 'Deshabilitar' : 'Habilitar'}</button><button className="text-button" onClick={async () => { if (await confirmAction('¿Renovar la credencial?', 'La anterior dejará de ser válida. Tendrás que actualizar la credencial de la estación.', 'Renovar credencial')) void deviceAction(device, 'rotate'); }} disabled={!!deviceBusy}><RefreshCw size={13}/>Renovar credencial</button><button className="icon-button danger" aria-label={'Eliminar ' + device.name} onClick={async () => { if (await confirmAction('¿Eliminar esta estación?',device.name+'. Su credencial dejará de ser válida.', 'Eliminar estación')) void deviceAction(device,'delete'); }} disabled={!!deviceBusy}><Trash2 size={15}/></button></div></article>)}</div>}
        </section>
      </Dashboard> : <main className="access-main">
        {sessionError && <div className="connection-banner" role="status">{sessionError}<button className="text-button" onClick={checkSession}>Reintentar</button></div>}
        <section className={'access-frame ' + (register ? 'is-register' : '') + (error || notice || expired ? ' has-feedback' : '')} aria-label={register ? 'Crear una cuenta' : 'Iniciar sesión'}>
          <div className={'scene-panel scene-' + mode}>
            <div className="scene-shade"/>
            <div className="scene-top"><span className="scene-location"><MapPin size={14}/>Montería · Córdoba</span><span className="scene-time">{time}</span></div>
            <div className="scene-copy"><span className="scene-icon"><Leaf size={23}/></span><h2>Tu entorno,<br/>{' '}más cerca.</h2><p>Cada lectura cuenta una historia.<br/>Conecta con lo que sucede a tu alrededor.</p></div>

          </div>
          <div className={'form-panel'+(busy?' auth-is-busy':'')} aria-busy={busy} onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - box.left}px`); event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - box.top}px`); }}><div className="form-inner" inert={busy} key={register ? 'register' : 'login'}>
            <h1>{register ? 'Un nuevo comienzo.' : 'Qué bueno verte.'}</h1><p className="form-intro">{register ? 'Crea tu cuenta y acerca tu entorno.' : 'Inicia sesión y conecta con tu estación.'}</p>
            <form onSubmit={submit}>
              {register && <label>Tu nombre<input name="name" placeholder="¿Cómo te llamas?" minLength={2} maxLength={100} autoComplete="name" required/></label>}
              <label>Correo electrónico<input name="email" type="email" placeholder="tu@correo.com" maxLength={254} autoComplete="email" required/></label>
              <label>Contraseña<div className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} placeholder={register ? 'Crea una contraseña segura' : 'Ingresa tu contraseña'} minLength={register ? 12 : 1} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? 'password-help' : undefined} required/><button type="button" className="password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
              {register && <p className="field-help" id="password-help">Usa al menos 12 caracteres. Puedes usar una frase.</p>}
              {(error || expired) && <div className="feedback error" role="alert">{error || 'Tu sesión expiró. Inicia sesión para continuar.'}</div>}
              {notice && <div className="feedback success" role="status"><Check size={16}/>{notice}</div>}
              <button className="primary submit-button" disabled={busy || entering}>{register ? 'Crear mi cuenta' : 'Iniciar sesión'}<ArrowRight size={18}/></button>
            </form>
            <div className="switch-account"><span>{register ? '¿Ya tienes una cuenta?' : '¿Es tu primera vez aquí?'}</span><button className="text-button" onClick={switchForm} disabled={busy || entering}>{register ? 'Inicia sesión' : 'Crea una cuenta'}<ChevronRight size={15}/></button></div>

          </div>{busy && !entering && <BrandLoading kind="card" label={authComplete?(register?'Tu cuenta está lista':'Bienvenido a Silvana'):register?'Creando tu espacio':'Conectando contigo'} detail={authComplete?'Todo listo para continuar.':register?'Un nuevo comienzo, más cerca de tu entorno.':'Verificando tu acceso de forma segura.'} complete={authComplete}/>}</div>
        </section>
        <div className="preview-toolbar"><span className="preview-explanation">Ambiente de demostración</span><div className="creator-credit" aria-label="Creadores del proyecto" onPointerMove={event=>{const rect=event.currentTarget.getBoundingClientRect();event.currentTarget.style.setProperty('--glow-x',`${event.clientX-rect.left}px`);event.currentTarget.style.setProperty('--glow-y',`${event.clientY-rect.top}px`);}} onPointerLeave={()=>setCreatorStorm(false)}>
          <span>Desarrollado por</span><div className="creator-portraits">{['jhonatan2405','juanxpz1'].map(handle=><a key={handle} href={'https://github.com/'+handle} target="_blank" rel="noopener noreferrer" aria-label={'GitHub de '+handle} data-name={handle} onPointerEnter={event=>{if(event.pointerType==='mouse')setCreatorStorm(true);}} onPointerLeave={()=>setCreatorStorm(false)} onPointerCancel={()=>setCreatorStorm(false)} onClick={()=>setCreatorStorm(false)}><img src={'https://github.com/'+handle+'.png?size=80'} alt={'Avatar de '+handle} width="30" height="30" onError={event=>{event.currentTarget.style.display='none';}}/><span className="avatar-fallback">{handle.slice(0,2).toUpperCase()}</span></a>)}</div><Github size={16} aria-hidden="true"/>
        </div><details className="environment-menu" onKeyDown={event => { if(event.key === 'Escape') event.currentTarget.removeAttribute('open'); }}>
          <summary aria-label="Elegir ambiente"><ModeIcon size={17}/><span>{activeMode[1]}{rain ? ' · Lluvia' : ''}</span><ChevronUp size={15}/></summary>
          <div className="environment-popover" role="group" aria-label="Elegir iluminación y lluvia">
            {modes.map(([value,label,Icon]) => <button key={value} aria-pressed={weather === value} onClick={event => { setWeather(value); event.currentTarget.closest('details')?.removeAttribute('open'); }}><Icon size={16}/><span>{label}</span>{weather === value && <Check size={14}/>}</button>)}
            <div className="menu-divider"/>
            <button aria-pressed={!rain} onClick={event => {setRain(false);event.currentTarget.closest('details')?.removeAttribute('open');}}><Sun size={16}/><span>Sin lluvia</span>{!rain && <Check size={14}/>}</button>
            <button aria-pressed={rain} onClick={event => {setRain(true);event.currentTarget.closest('details')?.removeAttribute('open');}}><CloudRain size={16}/><span>Con lluvia</span>{rain && <Check size={14}/>}</button>
          </div>
        </details></div>{ambient.error && <p className="audio-error" role="status">{ambient.error}</p>}
      </main>}

  </div>;
}

const rootElement = document.getElementById('root')! as HTMLElement & { __reactRoot?: ReturnType<typeof createRoot> };
const appRoot = rootElement.__reactRoot ??= createRoot(rootElement);
appRoot.render(<React.StrictMode><App/></React.StrictMode>);








