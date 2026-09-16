import { Router, type RequestHandler } from 'express';
import path from 'node:path';
import { GuideStore, GuideError } from './guide-store';
export function createGuideRouter(root: string, requireAuth: RequestHandler) {
 const router=Router();const directory=process.env.GUIDE_DATA_DIR||path.join(root,'data');
 const store=new GuideStore(path.join(root,'data/library.json'),directory);
 router.use(requireAuth);
 router.use((req,res,next)=>{
  if(req.method==='GET'){next();return;}
  if(res.locals.session.user.role!=='admin'){res.status(403).json({error:'Acesso restrito à administração.'});return;}
  const origin=req.get('origin');let valid=true;
  if(origin){try{valid=new URL(origin).origin===`${req.protocol}://${req.get('host')}`;}catch{valid=false;}}
  if(!valid||req.get('sec-fetch-site')==='cross-site'){res.status(403).json({error:'Origem não permitida.'});return;}
  if(!req.is('application/json')){res.status(415).json({error:'Envie os dados em JSON.'});return;}
  next();
 });
 router.get('/',async(_req,res,next)=>{try{res.json(await store.read());}catch(e){next(e);}});
 for(const kind of ['professionals','units','exams'] as const){
  if(kind!=='units')router.post(`/${kind}`,async(req,res,next)=>{try{res.status(201).json(await store.save(kind,null,req.body?.record,req.body?.revision));}catch(e){next(e);}});
  router.put(`/${kind}/:id`,async(req,res,next)=>{try{res.json(await store.save(kind,req.params.id,req.body?.record,req.body?.revision));}catch(e){next(e);}});
 }
 router.use(((error,_req,res,_next)=>{if(error instanceof GuideError){res.status(error.status).json({error:error.message});return;}res.status(500).json({error:'Não foi possível salvar ou carregar os dados. Tente novamente.'});}) as import('express').ErrorRequestHandler);
 return router;
}
