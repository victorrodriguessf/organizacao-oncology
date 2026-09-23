// Copyright © 2026 Victor Rodrigues (@victorrodriguessf). Consulte LICENSE.
import { test, expect } from '@playwright/test';

test('cadastro API validates duplicate doctors, stale writes and existing units', async ({ request }) => {
 expect((await request.get('/api/guide')).status()).toBe(401);
 expect((await request.post('/api/guide/professionals', { data: { record: {}, revision: 0 } })).status()).toBe(401);
 const login = await request.post('/api/auth/login', { data: { username: 'admin', password: 'admin' } });
 expect(login.status()).toBe(200);
 const guide = await (await request.get('/api/guide')).json();
 expect(guide.units).toHaveLength(5);
 const unit = guide.units.find((u: { id: string }) => u.id === 'COMN');
 expect((await request.post('/api/guide/units', { data: { record: unit, revision: guide.revision } })).status()).toBe(404);
 const invalidCnpj = await request.put(`/api/guide/units/${unit.id}`, { data: { record: { ...unit, cnpj: '123' }, revision: guide.revision } });
 expect(invalidCnpj.status()).toBe(400);
 const registration = String(Date.now()).slice(-11);
 const record = { name: 'Profissional API', council: 'CRM', registration, uf: 'RN', rqe: '', notes: '', placements: [{ unitId: 'COMN', specialties: ['Oncologia Clínica'], payers: [], schedules: [], notes: '', active: true }] };
 const saved = await request.post('/api/guide/professionals', { data: { record, revision: guide.revision } });
 expect(saved.status()).toBe(201);
 const { guide: updated } = await saved.json();
 expect(updated.revision).toBe(guide.revision + 1);
 expect((await request.post('/api/guide/professionals', { data: { record, revision: guide.revision } })).status()).toBe(409);
 const duplicate = await request.post('/api/guide/professionals', { data: { record, revision: updated.revision } });
 expect(duplicate.status()).toBe(409);
 expect(await duplicate.json()).toMatchObject({ error: expect.stringContaining('Já existe') });
 const forgedOrigin = await request.post('/api/guide/professionals', { data: { record, revision: updated.revision }, headers: { Origin: 'https://example.com' } });
 expect(forgedOrigin.status()).toBe(403);
 const refreshed = await (await request.get('/api/guide')).json();
 expect(refreshed.professionals.some((p: { registration: string }) => p.registration === registration)).toBe(true);
});
