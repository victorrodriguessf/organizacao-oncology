import { readFile, mkdir, open, rename, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Library } from './src/types';
import { normalized, logoOptions, states, type GuideData, type GuideUnit, type GuideProfessional, type GuideExam } from './src/guide-types';
interface ManualData { version: 1; revision: number; professionals: Record<string, GuideProfessional>; units: Record<string, GuideUnit>; exams: Record<string, GuideExam> }
export class GuideError extends Error { constructor(public status: number, message: string) { super(message); } }
const blank = (): ManualData => ({ version: 1, revision: 0, professionals: {}, units: {}, exams: {} });
const unique = (values: string[]) => [...new Map(values.filter(Boolean).map(v => [normalized(v),v])).values()];
const aliases: Record<string,string> = { 'nutricionista':'Nutrição', 'psicologa':'Psicologia', 'dermatologista':'Dermatologia', 'neurocirurgiao':'Neurocirurgia', 'ortopedista':'Ortopedia', 'hematologista':'Hematologia', 'clinica da dor':'Clínica da Dor', 'clinico geral':'Clínico Geral', 'geriatra/paliativista':'Geriatria / Cuidados Paliativos', 'onco-hematologia pediatrica':'Oncologia e Hematologia Pediátrica', 'pediatria onco-hematologica':'Oncologia e Hematologia Pediátrica', 'onco-genetica':'Oncogenética' };
function specialties(raw: string) { if(normalized(raw)==='geriatria / cuidados paliativos'||normalized(raw)==='geriatra/paliativista')return ['Geriatria / Cuidados Paliativos']; return raw.split(/\s*\/\s*/).map(v=>aliases[normalized(v)]||v); }
function projection(base: Library, manual: ManualData): GuideData {
 const units = base.units.map(u => ({ ...u, cnpj:'', legalName:'', entityId:`unit:${u.id}` }));
 const unitMap = new Map<string,GuideUnit>(units.map(u=>[u.id,u]));
 for(const u of Object.values(manual.units))unitMap.set(u.id,u);
 const professionals: GuideProfessional[] = base.professionals.map(p=>{
  const placements: GuideProfessional['placements']=[];
  const memberships=base.memberships.filter(m=>m.professionalId===p.id && unitMap.has(m.unit));
  for(const unitId of unique(memberships.map(m=>m.unit))){
   const rows=memberships.filter(m=>m.unit===unitId);
   const scheduleMap=new Map(rows.filter(m=>m.days||m.shift||m.notes).map(m=>{const item={days:m.days,shift:m.shift,notes:m.notes};return [JSON.stringify(item),item];}));
   // Only exact professional links exported by COMN belong to this unit.
   const payers=unitId==='COMN'?unique(base.links.filter(l=>l.professionalId===p.id&&l.kind!=='Forma de pagamento').map(l=>l.payer)):[];
   placements.push({unitId,specialties:unique(rows.flatMap(m=>specialties(m.specialty))),payers,schedules:[...scheduleMap.values()],notes:'',active:true});
  }
  const rqes=unique(base.memberships.filter(m=>m.professionalId===p.id&&m.rqe&&!['CRN','CRP'].includes(m.rqe.toUpperCase())).map(m=>m.rqe));
  const versions=memberships.map(m=>({unitId:m.unit,name:m.name,specialty:m.specialty,rqe:m.rqe,days:m.days,shift:m.shift,source:{sheet:m.source.sheet,cell:m.source.cell}}));
  const names=unique([...p.aliases,...memberships.map(m=>m.name)]);
  const divergences=[...(new Set(names.map(normalized)).size>1?['Grafias diferentes do nome nas abas da planilha.']:[]),...(rqes.length>1?['Informações diferentes de RQE nas abas da planilha.']:[])];
  return {id:p.id,name:p.name,council:p.council,registration:p.registration,uf:'',rqe:rqes.join(' / '),notes:'',placements,sources:p.sources.map(s=>({sheet:s.sheet,cell:s.cell})),versions,divergences,origin:'imported',updatedAt:null};
 });
 const people=new Map(professionals.map(p=>[p.id,p]));
 for(const p of Object.values(manual.professionals))people.set(p.id,{...p,versions:p.versions||[],divergences:p.divergences||[]});
 return {revision:manual.revision,units:[...unitMap.values()],professionals:[...people.values()],exams:Object.values(manual.exams),catalog:base.procedures.map(p=>({id:p.id,name:p.description,code:p.code,category:p.category})),importedAt:base.meta.extractedAt};
}
function object(value: unknown): Record<string,unknown> { if(!value||typeof value!=='object'||Array.isArray(value))throw new GuideError(400,'Dados de cadastro inválidos.');return value as Record<string,unknown>; }
function text(value: unknown, field: string, max=300, required=false): string { if(typeof value!=='string')throw new GuideError(400,`Informe ${field}.`);const result=value.trim();if(result.length>max||required&&!result)throw new GuideError(400,`Confira ${field}.`);return result; }
function strings(value: unknown, field: string): string[] { if(!Array.isArray(value)||value.length>100)throw new GuideError(400,`Confira ${field}.`);return unique(value.map(v=>text(v,field,200,true))); }
function array(value: unknown, max: number): unknown[] { if(!Array.isArray(value)||value.length>max)throw new GuideError(400,'Lista inválida ou acima do limite.');return value; }
function active(value: unknown) { if(typeof value!=='boolean')throw new GuideError(400,'Informe a situação do vínculo.');return value; }
function unitRecord(value: unknown, id: string, guide: GuideData): GuideUnit {
 const data=object(value);const cnpj=text(data.cnpj,'CNPJ',25).replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
 if(cnpj&&!/^[A-Z0-9]{12}\d{2}$/.test(cnpj))throw new GuideError(400,'Informe os 14 caracteres do CNPJ ou deixe o campo em branco.');
 const legalName=text(data.legalName,'razão social');
 if(cnpj&&!legalName)throw new GuideError(400,'Informe a razão social para associar o CNPJ.');
 const other=guide.units.find(u=>u.id!==id&&u.cnpj===cnpj&&cnpj);
 if(other&&normalized(other.legalName)!==normalized(legalName))throw new GuideError(409,'Este CNPJ já está associado a outra razão social na rede.');
 const logo=data.logo===null?null:text(data.logo,'logo');
 if(logo&&!logoOptions.some(o=>o.value===logo))throw new GuideError(400,'Selecione uma das logos disponíveis.');
 return {id,name:text(data.name,'nome da unidade',200,true),short:text(data.short,'nome curto',70,true),cnpj,legalName,entityId:cnpj?`cnpj:${cnpj}`:`unit:${id}`,logo,color:guide.units.find(u=>u.id===id)?.color||'#357766'};
}
function personRecord(value: unknown, id: string, guide: GuideData): GuideProfessional {
 const data=object(value);const old=guide.professionals.find(p=>p.id===id);
 const council=text(data.council,'conselho',20,true).toUpperCase();const registration=text(data.registration,'registro',30,true).toUpperCase();const uf=text(data.uf,'UF',2).toUpperCase();
 if(!/^[A-Z]{2,12}$/.test(council)||!/^\d{1,15}$/.test(registration)||uf&&!states.includes(uf))throw new GuideError(400,'Confira conselho, número de registro e UF.');
 if(guide.professionals.some(p=>p.id!==id&&p.council===council&&p.registration===registration&&(!uf||!p.uf||p.uf===uf)))throw new GuideError(409,'Já existe um profissional com este conselho e registro. Edite o cadastro existente.');
 const placements=array(data.placements,50).map(v=>{
  const a=object(v);const unitId=text(a.unitId,'unidade',100,true);if(!guide.units.some(u=>u.id===unitId))throw new GuideError(400,'Unidade não encontrada.');
  const spec=strings(a.specialties,'especialidades');if(!spec.length)throw new GuideError(400,'Informe ao menos uma especialidade em cada vínculo.');
  const schedules=array(a.schedules,30).map(v=>{const s=object(v);return {days:text(s.days,'dias',200),shift:text(s.shift,'turno',300),notes:text(s.notes,'observação de horário',1000)};}).filter(s=>s.days||s.shift||s.notes);
  return {unitId,specialties:spec,payers:strings(a.payers,'convênios'),schedules,notes:text(a.notes,'observações do vínculo',2000),active:active(a.active)};
 });
 if(new Set(placements.map(p=>p.unitId)).size!==placements.length)throw new GuideError(400,'Agrupe as informações da mesma unidade em um único vínculo.');
 if(!placements.length&&!old)throw new GuideError(400,'Vincule o profissional a pelo menos uma unidade.');
 // Exam associations must remain meaningful when a unit affiliation is deactivated.
 if(guide.exams.some(e=>e.active&&e.professionalIds.includes(id)&&!placements.some(p=>p.unitId===e.unitId&&p.active)))throw new GuideError(409,'Atualize os exames associados ao profissional antes de desativar este vínculo.');
 return {id,name:text(data.name,'nome do profissional',200,true),council,registration,uf,rqe:text(data.rqe,'RQE',500),notes:text(data.notes,'observações',2000),placements,sources:old?.sources||[],versions:old?.versions||[],divergences:old?.divergences||[],origin:old?.sources.length?'updated':'manual',updatedAt:new Date().toISOString()};
}
function examRecord(value: unknown, id: string, guide: GuideData): GuideExam {
 const data=object(value);const unitId=text(data.unitId,'unidade',100,true);if(!guide.units.some(u=>u.id===unitId))throw new GuideError(400,'Unidade não encontrada.');
 const professionalIds=strings(data.professionalIds,'profissionais');
 if(professionalIds.some(id=>!guide.professionals.some(p=>p.id===id&&p.placements.some(a=>a.unitId===unitId&&a.active))))throw new GuideError(400,'Selecione profissionais com vínculo ativo nesta unidade.');
 const name=text(data.name,'nome do exame',500,true);const code=text(data.code,'código',30);
 if(guide.exams.some(e=>e.id!==id&&e.unitId===unitId&&normalized(e.name)===normalized(name)&&e.code===code))throw new GuideError(409,'Este exame já está cadastrado nesta unidade.');
 return {id,unitId,name,code,category:text(data.category,'categoria',150),description:text(data.description,'descrição',3000),payers:strings(data.payers,'convênios'),professionalIds,active:active(data.active),updatedAt:new Date().toISOString()};
}
export class GuideStore {
 private file: string;
 constructor(private baseFile: string, private directory: string) { this.file=path.join(directory,'manual.json'); }
 private async readManual(): Promise<ManualData> {
  try { const data=JSON.parse(await readFile(this.file,'utf8'));if(data.version!==1||!Number.isInteger(data.revision)||!data.professionals||!data.units||!data.exams)throw new Error('Invalid store');return data; }
  catch(error) { if((error as NodeJS.ErrnoException).code==='ENOENT')return blank();throw new GuideError(503,'Não foi possível ler os cadastros salvos. O arquivo foi preservado para conferência.'); }
 }
 private async base(): Promise<Library> { return JSON.parse(await readFile(this.baseFile,'utf8')); }
 async read() { return projection(await this.base(),await this.readManual()); }
 async save(kind: 'professionals'|'units'|'exams', id: string|null, input: unknown, revision: unknown) {
  if(!Number.isInteger(revision))throw new GuideError(400,'Recarregue a página antes de salvar.');
  if(kind==='units'&&!id)throw new GuideError(400,'Edite uma das unidades já existentes.');
  await mkdir(this.directory,{recursive:true});const lock=path.join(this.directory,'.manual.lock');
  let acquired=false;
  for(let attempt=0;attempt<50;attempt++){
   try{await mkdir(lock);acquired=true;break;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;await new Promise(resolve=>setTimeout(resolve,40));}
  }
  if(!acquired)throw new GuideError(503,'Outro salvamento está em andamento. Tente novamente em alguns instantes.');
  const temporary=path.join(this.directory,`manual-${randomUUID()}.tmp`);
  try{
   const manual=await this.readManual();if(manual.revision!==revision)throw new GuideError(409,'A base foi atualizada em outra tela. Recarregue os dados antes de salvar para não substituir alterações.');
   const guide=projection(await this.base(),manual);
   if(id&&!guide[kind].some(item=>item.id===id))throw new GuideError(404,'Cadastro não encontrado.');
   const recordId=id||`${kind}-${randomUUID()}`;
   if(kind==='professionals')manual.professionals[recordId]=personRecord(input,recordId,guide);
   if(kind==='units')manual.units[recordId]=unitRecord(input,recordId,guide);
   if(kind==='exams')manual.exams[recordId]=examRecord(input,recordId,guide);
   manual.revision++;
   const handle=await open(temporary,'wx',0o600);
   try{await handle.writeFile(JSON.stringify(manual,null,2)+'\n');await handle.sync();}finally{await handle.close();}
   try{await copyFile(this.file,path.join(this.directory,'manual.backup.json'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   await rename(temporary,this.file);
   return {id:recordId,guide:projection(await this.base(),manual)};
  }finally{try{await rm(temporary,{force:true});}finally{await rm(lock,{recursive:true,force:true});}}
 }
}
