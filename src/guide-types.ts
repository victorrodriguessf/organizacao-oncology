export interface GuideSource { sheet: string; cell: string }
export interface GuideVersion { unitId: string; name: string; specialty: string; rqe: string; days: string; shift: string; source: GuideSource }
export interface GuideUnit { id: string; name: string; short: string; logo: string | null; color: string; cnpj: string; legalName: string; entityId: string }
export interface Schedule { days: string; shift: string; notes: string }
export interface Placement { unitId: string; specialties: string[]; payers: string[]; schedules: Schedule[]; notes: string; active: boolean }
export interface GuideProfessional { id: string; name: string; council: string; registration: string; uf: string; rqe: string; notes: string; placements: Placement[]; sources: GuideSource[]; versions: GuideVersion[]; divergences: string[]; origin: 'imported' | 'manual' | 'updated'; updatedAt: string | null }
export interface GuideExam { id: string; unitId: string; name: string; code: string; category: string; description: string; payers: string[]; professionalIds: string[]; active: boolean; updatedAt: string }
export interface ExamCatalogItem { id: string; name: string; code: string; category: string }
export interface GuideData { revision: number; units: GuideUnit[]; professionals: GuideProfessional[]; exams: GuideExam[]; catalog: ExamCatalogItem[]; importedAt: string }
export const logoOptions = [ { value: '/logos/comn.jpeg', label: 'Oncologia e Mastologia' }, { value: '/logos/oncoclinicas.png', label: 'Oncoclínicas' }, { value: '/logos/sao-marcos.png', label: 'São Marcos' }, { value: '/logos/oncology.png', label: 'Oncology Group' } ];
export const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
export const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const labelCase = (s: string) => s === s.toUpperCase() ? s.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase()) : s;
