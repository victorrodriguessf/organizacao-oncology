// Copyright © 2026 Victor Rodrigues (@victorrodriguessf). Consulte LICENSE.
export interface Source { sheetId: string; sheet: string; row: number; cell: string }
export interface Unit { id: string; name: string; short: string; logo: string | null; color: string }
export interface Professional { id: string; name: string; registration: string; council: string; aliases: string[]; specialties: string[]; units: string[]; sources: Source[] }
export interface Membership { id: string; professionalId: string; name: string; registration: string; specialty: string; rqe: string; unit: string; section: string; birthDate: string | null; birthDateRaw: string; cpf: string; contract: string; startDate: string | null; days: string; shift: string; notes: string; source: Source }
export interface Tariff { id: string; unit: string; specialty: string; payer: string; amount: number | null; amountRaw: string; context: string; source: Source }
export interface Gap { id: string; payer: string; unit: string; status: string; detail: string; source: Source }
export interface Procedure { id: string; code: string; category: string; description: string; notes: string; enabledPayers: string; disabledPayers: string; source: Source }
export interface Negotiation { id: string; section: string; code: string; description: string; category: string; basis: string; amount: number | null; amountRaw: string; notes: string; source: Source }
export interface Employee { id: string; name: string; department: string; role: string; unit: string; section: string; birthDate: string | null; source: Source }
export interface LinkRecord { id: string; name: string; payer: string; kind: string; professionalId: string | null; duplicate: boolean; source: Source }
export interface Issue { id: string; kind: string; message: string; sources: Source[] }
export interface Library { meta: { source: string; sha256: string; extractedAt: string; sheetCount: number; nonemptyRows: number; nonemptyCells: number; formulaCount: number; duplicateLinks: number }; units: Unit[]; professionals: Professional[]; memberships: Membership[]; tariffs: Tariff[]; gaps: Gap[]; services: { payer: string; unit: string; raw: string; consultations: boolean; infusions: boolean; procedures: boolean; source: Source }[]; procedures: Procedure[]; negotiations: Negotiation[]; negotiationNotes: {text: string; source: Source}[]; mappingNotes: {unit: string; specialty: string; text: string; source: Source}[]; payerLists: {payer: string; kind: string; source: Source}[]; mossoro: {payer: string; status: string; notes: string; source: Source}[]; employees: Employee[]; links: LinkRecord[]; issues: Issue[]; sheets: {id: string; name: string; rowCount: number}[] }
export interface Sheet { id: string; name: string; dimension: string; rows: { row: number; cells: Record<string,string>; meta: Record<string,{type: string; style: string; formula?: string}> }[] }
export interface Workbook { sheets: Sheet[] }
