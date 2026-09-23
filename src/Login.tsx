// Copyright © 2026 Victor Rodrigues (@victorrodriguessf). Consulte LICENSE.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { ArrowRight, Database, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, AlertCircle, LoaderCircle, Layers3 } from 'lucide-react';
import { useAuth } from './auth';
import './login.css';
export default function Login({notice}:{notice:string}) {
 const {login}=useAuth();const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const root=useRef<HTMLDivElement>(null);const usernameRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  document.title='Acesso à base de dados · Oncology Group';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return()=>{document.title='Organização · Oncology Group';};
  const scope=createScope({root}).add(()=>{
   animate('.login-enter',{opacity:[0,1],translateY:[16,0],delay:stagger(70),duration:750,ease:'out(3)'});
   animate('.login-orbits',{rotate:[-5,5],duration:16000,alternate:true,loop:true,ease:'inOutSine'});
  });
  return()=>{scope.revert();document.title='Organização · Oncology Group';};
 },[]);
 const submit=async(event:FormEvent)=>{event.preventDefault();if(busy)return;setError('');setBusy(true);try{await login(username.trim(),password);}catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.');setPassword('');usernameRef.current?.focus();}finally{setBusy(false);}};
 return <div className="login-page" ref={root}>
  <section className="login-story" aria-label="Oncology Group — gestão integrada">
   <div className="login-story-brand login-enter"><span className="login-story-mark"><Layers3 size={19}/></span><span>ONCOLOGY GROUP<small>GESTÃO INTEGRADA DA REDE</small></span></div>
   <div className="login-orbits" aria-hidden="true"><i/><i/><i/><i/><i/><span className="login-orbit-point p1"/><span className="login-orbit-point p2"/><span className="login-orbit-point p3"/></div>
   <div className="login-story-copy login-enter"><span className="login-kicker"><span/> CONEXÕES QUE CUIDAM</span><h2>Informações conectadas.<br/><em>Cuidado que vai além.</em></h2><p>Um só lugar para conhecer a nossa rede,<br className="desktop-break"/> aproximar pessoas e apoiar cada decisão.</p><div className="login-story-divider"/><div className="login-story-features"><span><Database size={16}/>Uma base integrada</span><span><ShieldCheck size={16}/>Acesso reservado</span></div></div>
   <div className="login-story-footer login-enter"><span>PESSOAS. CONEXÕES. CUIDADO.</span><span>Oncology Group © {new Date().getFullYear()}</span></div>
  </section>
  <section className="login-access" aria-label="Acesso ao sistema"><div className="login-access-top"><span className="login-access-pill"><span/> PORTAL DA REDE</span></div>
   <div className="login-form-wrap">
    <div className="login-logo login-enter"><img src="/logos/oncology.png" alt="Oncology Group"/></div>
    <div className="login-intro login-enter"><div className="login-section-label"><span/> BEM-VINDO AO SEU ESPAÇO</div><h1>Base de dados<span>.</span></h1><p>A informação que você precisa, reunida aqui.<br/>Entre com seu login e senha para continuar.</p></div>
    <form className="login-form login-enter" onSubmit={submit} aria-busy={busy}>
     {notice&&!error&&<div className="login-notice" role="status"><ShieldCheck size={17}/><span>{notice}</span></div>}
     {error&&<div className="login-error" role="alert" id="login-error"><AlertCircle size={17}/><span>{error}</span></div>}
     <label htmlFor="login-username">Login</label><div className="login-input"><UserRound size={18}/><input ref={usernameRef} id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Seu usuário" value={username} onChange={e=>setUsername(e.target.value)} required maxLength={100} disabled={busy} aria-invalid={!!error} aria-describedby={error?'login-error':undefined}/></div>
     <label htmlFor="login-password">Senha</label><div className="login-input"><LockKeyhole size={18}/><input id="login-password" name="password" type={show?'text':'password'} autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256} disabled={busy} aria-invalid={!!error} aria-describedby={error?'login-error':undefined}/><button type="button" aria-label={show?'Ocultar senha':'Mostrar senha'} aria-pressed={show} onClick={()=>setShow(!show)} disabled={busy}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
     <button className="login-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle size={18} className="login-spinner"/>Entrando…</>:<>Acessar base de dados<ArrowRight size={18}/></>}</button>
     <div className="login-private"><LockKeyhole size={13}/><span>Acesso exclusivo à equipe autorizada.</span></div>
    </form>
   </div>
   <footer className="login-access-footer"><span>Organização Oncology</span><span>Mais clareza para cuidar.</span></footer>
  </section>
 </div>;
}
