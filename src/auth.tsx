import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
interface Session { user: { username: string; role: string }; expiresAt: number }
interface AuthContextValue { session: Session | null; login: (username: string, password: string) => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider ausente'); return value; }
export async function apiFetch(input: string, init?: RequestInit) {
 const response = await fetch(input, { ...init, credentials: 'same-origin' });
 if (response.status === 401) window.dispatchEvent(new Event('oncology:session-expired'));
 return response;
}
export function AuthProvider({children}:{children:ReactNode}) {
 const [session,setSession] = useState<Session|null>(null);
 const [loading,setLoading] = useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const channel=useRef<BroadcastChannel|null>(null);
 const clearSession=useCallback(()=>{setSession(null);setNotice('Sua sessão terminou. Entre novamente para continuar.');},[]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/auth/me',{credentials:'same-origin',signal:controller.signal}).then(async response=>{
   if(response.status===401)return;
   if(!response.ok)throw new Error('Não foi possível verificar seu acesso.');
   setSession(await response.json());
  }).catch(e=>{if(e.name!=='AbortError')setError('Não foi possível conectar ao sistema. Tente novamente.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  window.addEventListener('oncology:session-expired',clearSession);
  if('BroadcastChannel' in window){channel.current=new BroadcastChannel('oncology-auth');channel.current.onmessage=event=>{if(event.data==='logout')clearSession();};}
  return()=>{controller.abort();window.removeEventListener('oncology:session-expired',clearSession);channel.current?.close();};
 },[clearSession]);
 useEffect(()=>{
  if(!session)return;
  const timeout=window.setTimeout(clearSession,Math.max(0,session.expiresAt-Date.now()));
  const controller=new AbortController();
  const check=()=>{if(document.visibilityState==='visible')apiFetch('/api/auth/me',{signal:controller.signal}).catch(()=>{});};
  document.addEventListener('visibilitychange',check);
  return()=>{clearTimeout(timeout);controller.abort();document.removeEventListener('visibilitychange',check);};
 },[session,clearSession]);
 const login=async(username:string,password:string)=>{
  let response:Response;
  try{response=await fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});}
  catch{throw new Error('Não foi possível conectar. Verifique sua conexão e tente novamente.');}
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível entrar.');
  setSession(result);setNotice('');
 };
 const logout=async()=>{
  const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw new Error('Não foi possível sair. Tente novamente.');
  channel.current?.postMessage('logout');setSession(null);setNotice('');
 };
 if(loading)return <div className="loading"><span className="loading-ring"/><p>Preparando seu acesso…</p></div>;
 if(error)return <div className="loading"><h1>Vamos tentar novamente?</h1><p role="alert">{error}</p><button className="button primary" onClick={()=>location.reload()}>Tentar novamente</button></div>;
 return <AuthContext.Provider value={{session,login,logout}}><AuthGate notice={notice}>{children}</AuthGate></AuthContext.Provider>;
}
function AuthGate({children,notice}:{children:ReactNode;notice:string}) {
 const {session}=useAuth();const location=useLocation();
 if(!session){
  if(location.pathname!=='/login')return <Navigate replace to="/login" state={{from:location.pathname+location.search}}/>;
  return <Login notice={notice}/>;
 }
 if(location.pathname==='/login'){
  const from=location.state?.from;
  const safe=typeof from==='string'&&from.startsWith('/')&&!from.startsWith('//')&&!from.includes('\\')&&!from.startsWith('/login')?from:'/';
  return <Navigate replace to={safe}/>;
 }
 return children;
}
