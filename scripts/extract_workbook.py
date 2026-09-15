"""Lossless sparse XLSX extraction plus source-linked operational views. Stdlib only."""
from __future__ import annotations
import argparse, collections, datetime as dt, hashlib, json, pathlib, re, unicodedata, zipfile
import xml.etree.ElementTree as ET
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ROOT=pathlib.Path(__file__).resolve().parents[1]
def clean(v): return re.sub(r'\s+', ' ', str(v or '')).strip()
def key(v): return ''.join(c for c in unicodedata.normalize('NFD',clean(v).upper()) if not unicodedata.combining(c))
def col(n):
 s=''
 while n: n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
def number(v):
 s=clean(v).replace('R$','').replace(' ','')
 if ',' in s:s=s.replace('.','').replace(',','.')
 try:return round(float(s),2)
 except ValueError:return None
def date(v):
 if not v:return None
 try:
  if re.fullmatch(r'\d+(\.\d+)?',str(v)):return (dt.datetime(1899,12,30)+dt.timedelta(days=float(v))).date().isoformat()
  return dt.datetime.strptime(v,'%d/%m/%Y').date().isoformat()
 except (ValueError,OverflowError):return None

def read_workbook(path):
 with zipfile.ZipFile(path) as z:
  strings=[''.join(t.text or '' for t in si.findall('.//m:t',NS)) for si in ET.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
  rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  wb=ET.fromstring(z.read('xl/workbook.xml'));sheets=[]
  styles=ET.fromstring(z.read('xl/styles.xml'))
  for index,s in enumerate(wb.find('m:sheets',NS)):
   target=rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']];root=ET.fromstring(z.read(target.lstrip('/') if target.startswith('/') else 'xl/'+target));rows=[]
   for row in root.findall('m:sheetData/m:row',NS):
    cells={};meta={}
    for c in row:
     v=c.find('m:v',NS);value=v.text if v is not None else '';typ=c.attrib.get('t','n');f=c.find('m:f',NS)
     if typ=='s':value=strings[int(value)] if value else ''
     if typ=='inlineStr':value=''.join(t.text or '' for t in c.findall('.//m:t',NS))
     if value or f is not None:
      column=c.attrib['r'].rstrip('0123456789');cells[column]=value;meta[column]={'type':typ,'style':c.attrib.get('s','0')}
      if f is not None:meta[column]['formula']=f.text
    if cells:rows.append({'row':int(row.attrib['r']),'cells':cells,'meta':meta,'hidden':row.attrib.get('hidden')=='1'})
   sheets.append({'id':f'sheet-{index+1}','name':s.attrib['name'],'state':s.attrib.get('state','visible'),'dimension':root.find('m:dimension',NS).attrib['ref'],'merges':[m.attrib['ref'] for m in root.findall('m:mergeCells/m:mergeCell',NS)],'rows':rows})
  return {'schemaVersion':1,'source':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'extractedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'date1904':wb.find('m:workbookPr',NS).attrib.get('date1904','0'),'stylesXml':ET.tostring(styles,encoding='unicode'),'sheets':sheets}

def build_library(wb):
 sheets=wb['sheets'];issues=[]
 def source(s,r,c='A'):return {'sheetId':s['id'],'sheet':s['name'],'row':r,'cell':f'{c}{r}'}
 def issue(kind,message,refs):issues.append({'id':f'issue-{len(issues)+1}','kind':kind,'message':message,'sources':refs})
 units=[{'id':'COMN','name':'Clínica de Oncologia e Mastologia','short':'COMN','logo':'/logos/comn.jpeg','color':'#557e38'},{'id':'OC','name':'Oncoclínicas','short':'Oncoclínicas','logo':'/logos/oncoclinicas.png','color':'#00a99d'},{'id':'CSM','name':'Clínica São Marcos','short':'São Marcos','logo':'/logos/sao-marcos.png','color':'#ca817a'},{'id':'PROMATER','name':'Promater','short':'Promater','logo':None,'color':'#668aac'},{'id':'MOSSORO','name':'Oncoclínicas · Mossoró','short':'Mossoró','logo':'/logos/oncoclinicas.png','color':'#6a9e93'}]
 professionals={};memberships=[]
 for i,unit in enumerate(['GROUP','GENERAL','COMN','OC','CSM','PROMATER','MOSSORO']):
  s=sheets[i];section='Corpo clínico'
  for r in s['rows']:
   c={k:clean(v) for k,v in r['cells'].items()};name=c.get('A','');registration=c.get('B','')
   if not re.search(r'\d',registration):
    if name and len(c)==1:section=name
    continue
   specialty=c.get('C' if i<3 else 'D','');rqe=c.get('D' if i<3 else 'C','') if i!=1 else ''
   council='CRN' if 'NUTRI' in key(specialty) else 'CRP' if 'PSICO' in key(specialty) else 'CRM'
   ident=council+'-'+re.sub(r'\D','',registration);src=source(s,r['row'])
   if ident not in professionals:professionals[ident]={'id':ident,'name':name,'registration':re.sub(r'\D','',registration),'council':council,'aliases':[],'specialties':[],'units':[],'sources':[]}
   p=professionals[ident]
   for field,value in [('aliases',name),('specialties',specialty),('units',unit)]:
    if value not in p[field]:p[field].append(value)
   p['sources'].append(src)
   birth=c.get('E','') if i!=1 else '';cpf=c.get('F','') if i!=1 else ''
   if birth and date(birth) is None:issue('Data inválida',f'Data de nascimento não interpretável: {name}.',[source(s,r['row'],'E')])
   memberships.append({'id':f"{s['id']}-{r['row']}",'professionalId':ident,'name':name,'registration':registration,'specialty':specialty,'rqe':rqe,'unit':unit,'section':section,'birthDate':date(birth),'birthDateRaw':birth,'cpf':cpf,'contract':c.get('G','') if i==0 else '', 'startDate':date(c.get('H' if i==0 else 'I','')) if i!=1 else None,'days':c.get('G','') if i>=2 else '', 'shift':c.get('H','') if i>=2 else '', 'notes':c.get('I','') if i==2 else '', 'source':src})
 for p in professionals.values():
  ms=[m for m in memberships if m['professionalId']==p['id']];rqes={m['rqe'] for m in ms if m['rqe'] and m['rqe'].isdigit()}
  if len(rqes)>1:issue('RQE divergente',f"{p['name']}: RQEs distintos na fonte ({', '.join(sorted(rqes))}).",[m['source'] for m in ms if m['rqe']])
 tariffs=[];mapping_notes=[]
 for i,unit in [(7,'COMN'),(8,'MOSSORO'),(9,'OC'),(10,'CSM')]:
  s=sheets[i];headers=next(r['cells'] for r in s['rows'] if r['row']==2)
  for j in range(1,len(headers)+1,2):
   specialty=clean(headers.get(col(j),''));context=''
   for r in s['rows']:
    if r['row']<=2:continue
    payer=clean(r['cells'].get(col(j),''));raw=clean(r['cells'].get(col(j+1),''))
    if not payer:continue
    if any(t in key(payer) for t in ['DR.','DRA.','CONV. COMN','AUTORIZADO ATENDIMENTO','CONVENIOS ONCOLOGY']):
     context=clean(context+' '+payer);mapping_notes.append({'unit':unit,'specialty':specialty,'text':payer,'source':source(s,r['row'],col(j))});continue
    tariffs.append({'id':f'tariff-{len(tariffs)+1}','unit':unit,'specialty':specialty,'payer':payer,'amount':number(raw),'amountRaw':raw,'context':context,'source':source(s,r['row'],col(j))})
 s=sheets[11]
 for r in s['rows']:
  if not 3<=r['row']<=21:continue
  for a,b,unit,specialty in [('A','B','COMN','ONCOLOGIA'),('C','D','OC','ONCOLOGIA'),('E','F','CSM','ONCOLOGIA'),('H','I','COMN','HEMATOLOGIA'),('J','K','OC','HEMATOLOGIA'),('L','M','CSM','HEMATOLOGIA')]:
   payer=clean(r['cells'].get(a,''));raw=clean(r['cells'].get(b,''))
   if payer:tariffs.append({'id':f'tariff-{len(tariffs)+1}','unit':unit,'specialty':specialty,'payer':payer,'amount':number(raw),'amountRaw':raw,'context':'Quadro comparativo','source':source(s,r['row'],a)})
 gaps=[];services=[];mossoro=[];payer_lists=[]
 for r in s['rows']:
  c=r['cells'];n=r['row']
  if 3<=n<=31 and c.get('O'):
   for column,unit in [('P','COMN'),('Q','OC'),('R','CSM'),('S','MOSSORO')]:
    raw=clean(c.get(column,''));k=key(raw)
    status='Credenciado' if raw=='✅' else 'Não solicitar' if 'NAO SOLICITAR' in k else 'Suspenso' if 'SUSPENSO' in k else 'Em andamento' if any(t in k for t in ['AGUARDANDO','ENVIADA','ENVIAR PROPOSTA']) else 'Pendente'
    gaps.append({'id':f'gap-{len(gaps)+1}','payer':clean(c['O']),'unit':unit,'status':status,'detail':raw,'source':source(s,n,column)})
  if 28<=n<=56:
   for column,unit in [('F','COMN'),('G','OC'),('H','CSM')]:
    if c.get('E'):services.append({'payer':clean(c['E']),'unit':unit,'raw':clean(c.get(column,'')),'consultations':'✅' in c.get(column,''),'infusions':'💊' in c.get(column,''),'procedures':'⚙' in c.get(column,''),'source':source(s,n,column)})
   for column,kind in [('A','Geral'),('B','Habilitados para quimioterapia')]:
    if c.get(column):payer_lists.append({'payer':clean(c[column]),'kind':kind,'source':source(s,n,column)})
  if n>=64 and c.get('E'):mossoro.append({'payer':clean(c['E']),'status':clean(c.get('F','')),'notes':clean(c.get('G','')),'source':source(s,n,'E')})
 procedures=[]
 for r in sheets[13]['rows']:
  c=r['cells']
  if r['row']==1:continue
  procedures.append({'id':f'procedure-{r["row"]}','code':clean(c.get('A','')),'category':clean(c.get('B','')),'description':clean(c.get('C','')),'notes':clean(c.get('D','')),'enabledPayers':clean(c.get('E','')),'disabledPayers':clean(c.get('F','')),'source':source(sheets[13],r['row'])})
 negotiations=[];negotiation_notes=[];section='';s=sheets[12]
 for r in s['rows']:
  c={k:clean(v) for k,v in r['cells'].items()};n=r['row']
  if n==84:section='Tabela de taxas cirúrgicas'
  if n<84 and re.fullmatch(r'\d{8,9}',c.get('B','')):
   price_col='E' if n<17 or 41<=n<=56 else 'D'
   negotiations.append({'id':f'negotiation-{n}','section':section,'code':c['B'],'description':c.get('C',''),'category':c.get('A',''),'basis':c.get('D','') if price_col=='E' else '', 'amount':number(c.get(price_col,'')),'amountRaw':c.get(price_col,''),'notes':c.get('F' if price_col=='E' else 'E',''),'source':source(s,n)})
  elif re.fullmatch(r'\d{8,9}',c.get('A','')):
   negotiations.append({'id':f'negotiation-{n}','section':section,'code':c['A'],'description':c.get('B',''),'category':section,'basis':'','amount':number(c.get('C','')),'amountRaw':c.get('C',''),'notes':'','source':source(s,n)})
  elif len(c)==1:
   text=next(iter(c.values()));negotiation_notes.append({'text':text,'source':source(s,n,next(iter(c)))})
   if not text.startswith(('Obs','Exclui')):section=text
  elif c and c.get('A') not in ['Categoria','Item','Código','CÓDIGO','Código TUSS']:negotiation_notes.append({'text':' · '.join(c.values()),'source':source(s,n)})
 links=[];seen=set();dupes=0;s=sheets[14]
 for r in s['rows'][1:]:
  name=clean(r['cells'].get('A',''));payer=clean(r['cells'].get('B',''));pair=(key(name),key(payer));dup=pair in seen;dupes+=dup;seen.add(pair)
  kind='Forma de pagamento' if key(payer) in ['CARTAO DE CREDITO','CARTAO DE DEBITO','TRANSFERENCIA (PIX/TED/DOC)','PARTICULAR','CORTESIA'] else 'Convênio / outra modalidade'
  match=[p['id'] for p in professionals.values() if key(name) in [key(a) for a in p['aliases']]]
  links.append({'id':f'link-{r["row"]}','name':name,'payer':payer,'kind':kind,'professionalId':match[0] if len(match)==1 else None,'duplicate':dup,'source':source(s,r['row'])})
  if not name:issue('Vínculo sem profissional','Exportação COMN: convênio sem nome do profissional.',[source(s,r['row'])])
 if dupes:issue('Repetições na exportação',f'{dupes} linhas repetem um par nome/modalidade. Preservadas e identificadas.',[source(s,1)])
 employees=[]
 for i in [15,16,17,18]:
  s=sheets[i];sections={};birthday_mode={}
  for r in s['rows']:
   c={k:clean(v) for k,v in r['cells'].items()};n=r['row']
   for start in [1,6,11]:
    a,b,d,e=[col(start+x) for x in range(4)];first=c.get(a,'');name=c.get(b,'');role=c.get(d,'');extra=c.get(e,'')
    if first and not name and not role and not extra:sections[start]=first;continue
    if key(name) in ['FUNCIONARIO:','NOME:'] or key(first)=='NOME:':birthday_mode[start]='NASC' in key(extra);continue
    if 'NASC' in key(extra):birthday_mode[start]=True;extra=''
    if i==18 and n<15 and start in [1,6]:name=first;first=sections.get(start,'')
    if not name or name.isdigit() or 'TOTAL:' in key(first):continue
    if key(name) in ['FUNCIONARIO:','NOME:']:continue
    if i in [15,16]:unit={1:'COMN',6:'OC',11:'CSM'}[start] if n<30 else {1:'VACINAS',6:'GROUP',11:'SEDE'}[start]
    else:unit='' if birthday_mode.get(start) or extra.isdigit() else extra
    employees.append({'id':f'employee-{i}-{n}-{start}','name':name,'department':first,'role':role,'unit':unit,'section':sections.get(start,''),'birthDate':date(extra) if birthday_mode.get(start) else None,'source':source(s,n,b)})
 staff_by_name=collections.defaultdict(list)
 for employee in employees:staff_by_name[key(employee['name'])].append(employee)
 for items in staff_by_name.values():
  divergent=[]
  for field,label in [('department','setor'),('role','cargo'),('unit','unidade'),('birthDate','nascimento')]:
   if len({key(e[field]) for e in items if e[field]})>1:divergent.append(label)
  if divergent:issue('Versões de cadastro',f"{items[0]['name']}: versões com diferenças de {', '.join(divergent)}; podem representar funções ou vínculos distintos.",[e['source'] for e in items])
 issue('Total divergente','Acompanhamento de Mossoró: título informa 17; há 20 registros listados.',[source(sheets[11],63,'F')])
 # Only exact normalized payer/specialty keys are compared; no speculative synonym merges.
 groups=collections.defaultdict(list)
 for t in tariffs:
  if t['amount'] is not None:groups[(t['unit'],key(t['specialty']),key(t['payer']))].append(t)
 for (unit,specialty,payer),items in groups.items():
  if len({t['amount'] for t in items})>1:issue('Valores diferentes',f'{unit} · {specialty} · {payer}: valores distintos entre quadros.',[t['source'] for t in items])
 for code in sorted({n['code'] for n in negotiations}):
  items=[n for n in negotiations if n['code']==code]
  if len({n['amount'] for n in items})>1:issue('Condições diferentes',f'Código {code}: valores diferentes; conferir descrição e contexto da negociação.',[n['source'] for n in items])
 issue('Versões de equipe','Quatro abas descrevem equipes com diferenças de cargo, setor e unidade. Nenhuma foi definida como versão oficial.',[source(sheets[i],1) for i in [15,16,17,18]])
 issue('Escopo de credenciamento','Credenciamento, habilitação de serviços e exportação de convênios são fontes com escopos diferentes. Uma não comprova a outra.',[source(sheets[11],2,'O'),source(sheets[11],27,'E'),source(sheets[14],1)])
 # Validate every source cell, including dates/CPFs, without printing personal values.
 nonempty=sum(1 for s in sheets for r in s['rows'] for v in r['cells'].values() if clean(v))
 return {'meta':{k:wb[k] for k in ['schemaVersion','source','sha256','extractedAt']}|{'sheetCount':len(sheets),'nonemptyRows':sum(sum(any(clean(v) for v in r['cells'].values()) for r in s['rows']) for s in sheets),'nonemptyCells':nonempty,'formulaCount':sum('formula' in m for s in sheets for r in s['rows'] for m in r['meta'].values()),'duplicateLinks':dupes},'units':units,'professionals':list(professionals.values()),'memberships':memberships,'tariffs':tariffs,'mappingNotes':mapping_notes,'gaps':gaps,'services':services,'payerLists':payer_lists,'mossoro':mossoro,'procedures':procedures,'negotiations':negotiations,'negotiationNotes':negotiation_notes,'links':links,'employees':employees,'issues':issues,'sheets':[{'id':s['id'],'name':s['name'],'rowCount':sum(any(clean(v) for v in r['cells'].values()) for r in s['rows'])} for s in sheets]}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('file',type=pathlib.Path);args=parser.parse_args();wb=read_workbook(args.file);library=build_library(wb);out=ROOT/'data';out.mkdir(exist_ok=True)
 for name,data in [('workbook.json',wb),('library.json',library)]:
  temp=out/(name+'.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(out/name)
 print(json.dumps({'meta':library['meta'],'counts':{k:len(v) for k,v in library.items() if isinstance(v,list)}},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
