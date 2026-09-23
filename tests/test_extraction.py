# Copyright © 2026 Victor Rodrigues (@victorrodriguessf). Consulte LICENSE.
import importlib.util, json, pathlib, unittest, collections, zipfile, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('extractor',ROOT/'scripts/extract_workbook.py');extractor=importlib.util.module_from_spec(spec);spec.loader.exec_module(extractor)
class ExtractionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.library=json.loads((ROOT/'data/library.json').read_text());cls.workbook=json.loads((ROOT/'data/workbook.json').read_text())
 def test_complete_source_coverage(self):
  self.assertEqual(len(self.workbook['sheets']),19)
  self.assertEqual(self.library['meta']['nonemptyCells'],8111)
  self.assertEqual(self.library['meta']['nonemptyRows'],2743)
  source=pathlib.Path('/Users/victorrodrigues/Downloads/BASE DE DADOS GERAL.xlsx')
  if source.exists():
   actual=extractor.read_workbook(source)
   self.assertEqual(actual['sha256'],self.workbook['sha256'])
   for a,b in zip(actual['sheets'],self.workbook['sheets']):self.assertEqual(a,b)
 def test_every_reference_resolves(self):
  sources={s['id']:{r['row']:r for r in s['rows']} for s in self.workbook['sheets']}
  def visit(obj):
   if isinstance(obj,dict):
    if {'sheetId','row','cell'}<=obj.keys():self.assertIn(obj['row'],sources[obj['sheetId']])
    for value in obj.values():visit(value)
   elif isinstance(obj,list):
    for value in obj:visit(value)
  visit(self.library)
 def test_missing_values_are_not_zero_or_false_coverage(self):
  self.assertIsNone(extractor.number(''))
  self.assertIsNone(extractor.number('COOPERADO'))
  self.assertEqual(extractor.number('R$ 1.974,17'),1974.17)
  self.assertEqual(extractor.number('259.77999999999997'),259.78)
  for s in self.library['services']:
   if s['raw'] in ['', '—', '⚠️', 'SUSPENSO']:self.assertFalse(s['consultations'] or s['infusions'] or s['procedures'])
 def test_dates_and_invalid_dates(self):
  self.assertEqual(extractor.date('46027'),'2026-01-05')
  self.assertIsNone(extractor.date('07/003/1973'))
  self.assertIsNone(extractor.date(''))
 def test_export_preserves_duplicates_and_orphans(self):
  links=self.library['links'];self.assertEqual(len(links),1875)
  self.assertEqual(sum(l['duplicate'] for l in links),64)
  self.assertEqual(sum(not l['name'] for l in links),5)
  self.assertTrue(all(l['kind']=='Forma de pagamento' for l in links if l['payer']=='CARTAO DE DEBITO'))
 def test_notes_are_not_insurers(self):
  self.assertFalse(any('AUTORIZADO ATENDIMENTO' in t['payer'] for t in self.library['tariffs']))
  self.assertTrue(any('AUTORIZADO ATENDIMENTO' in t['text'] for t in self.library['mappingNotes']))
 def test_conflicting_negotiation_contexts_remain(self):
  vals={n['amount'] for n in self.library['negotiations'] if n['code']=='60023082'}
  self.assertEqual(vals,{150.0,172.76,207.94})
 def test_professionals_are_not_summed_memberships(self):
  self.assertEqual(len(self.library['professionals']),102)
  self.assertEqual(len({p['id'] for p in self.library['professionals']}),102)
  self.assertTrue(all(m['professionalId'] in {p['id'] for p in self.library['professionals']} for m in self.library['memberships']))
 def test_do_not_request_is_not_pending_action(self):
  items=[g for g in self.library['gaps'] if 'NÃO SOLICITAR' in g['detail']]
  self.assertTrue(items);self.assertTrue(all(g['status']=='Não solicitar' for g in items))
 def test_staff_versions_remain_separate(self):
  self.assertEqual({e['source']['sheetId'] for e in self.library['employees']},{'sheet-16','sheet-17','sheet-18','sheet-19'})
  self.assertFalse(any(e['name'].isdigit() or 'FUNCIONÁRIO:' in e['name'] for e in self.library['employees']))
if __name__=='__main__':unittest.main()
