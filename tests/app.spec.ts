// Copyright © 2026 Victor Rodrigues (@victorrodriguessf). Consulte LICENSE.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
 const response = await context.request.post('/api/auth/login', { data: { username: 'admin', password: 'admin' } });
 expect(response.ok()).toBe(true);
});

test('unit to specialty to doctor shows only unit-specific information', async ({ page }) => {
 const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading', { name: /Pessoas que cuidam.*Informações que conectam/ })).toBeVisible();
 await expect(page.getByText('Desenvolvido originalmente por')).toBeVisible();
 await expect(page.getByRole('link', { name: 'Victor Rodrigues · @victorrodriguessf' })).toHaveAttribute('href', 'https://github.com/victorrodriguessf');
 await expect(page.locator('.unit-tile')).toHaveCount(5);
 await page.locator('.unit-tile').filter({ hasText: 'Clínica de Oncologia e Mastologia' }).click();
 await expect(page.getByRole('heading', { name: 'Clínica de Oncologia e Mastologia' })).toBeVisible();
 await expect(page.getByRole('tab', { name: 'Especialidades' })).toHaveAttribute('aria-selected', 'true');
 await page.getByLabel('Buscar nesta unidade').fill('Oncologia Clínica');
 await page.getByRole('link', { name: /Oncologia Clínica.*profissionais/ }).first().click();
 await expect(page.getByRole('heading', { name: 'Oncologia Clínica' })).toBeVisible();
 await page.locator('.person-card').first().click();
 await expect(page.getByRole('heading', { name: 'Convênios atendidos' })).toBeVisible();
 await expect(page.getByRole('heading', { name: 'Dias de atendimento' })).toBeVisible();
 await expect(page.getByText('Informações de COMN')).toBeVisible();
 await page.getByText(/Versões clínicas nas abas da planilha/).click();
 await expect(page.locator('.source-version').first()).toBeVisible();
 expect(errors).toEqual([]);
});

test('admin creates and updates a professional, with changes surviving reload', async ({ page, context }) => {
 const registration = String(Date.now()).slice(-10);
 await page.goto('/unidades/CSM');
 await page.getByRole('button', { name: 'Cadastrar profissional' }).last().click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByLabel('Nome completo').fill('Dra. Exemplo Integração');
 await page.getByLabel('Número do registro').fill(registration);
 await page.getByLabel('UF do registro').selectOption('RN');
 await page.getByLabel('Especialidades do vínculo 1').fill('Mastologia');
 await page.getByLabel('Convênios do vínculo 1').fill('Convênio Teste');
 await page.getByRole('button', { name: 'Adicionar horário' }).click();
 await page.getByLabel('Dias do horário 1, vínculo 1').fill('Segunda-feira');
 await page.getByLabel('Turno do horário 1, vínculo 1').fill('Manhã');
 await page.getByRole('button', { name: 'Salvar cadastro' }).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.getByRole('status')).toContainText('Cadastro salvo');
 await page.getByLabel('Buscar nesta unidade').fill('Mastologia');
 await page.getByRole('link', { name: /Mastologia.*profissionais/ }).first().click();
 await page.getByLabel('Buscar nesta unidade').fill('Exemplo Integração');
 await page.locator('.person-card').filter({ hasText: 'Exemplo Integração' }).click();
 await expect(page.getByText('Convênio Teste')).toBeVisible();
 await expect(page.getByText('Segunda-feira')).toBeVisible();
 await page.getByRole('button', { name: 'Editar profissional' }).click();
 await page.getByLabel('Nome completo').fill('Dra. Exemplo Atualizada');
 await page.getByRole('button', { name: 'Salvar cadastro' }).click();
 await page.reload();
 await expect(page.getByRole('heading', { name: 'Dra. Exemplo Atualizada' })).toBeVisible();
 const data = await (await context.request.get('/api/guide')).json();
 expect(data.professionals.some((p: { registration: string; name: string }) => p.registration === registration && p.name === 'Dra. Exemplo Atualizada')).toBe(true);
});

test('exams are explicitly assigned to a unit and can be edited', async ({ page }) => {
 await page.goto('/unidades/COMN?aba=exames');
 await expect(page.getByRole('tab', { name: 'Exames' })).toHaveAttribute('aria-selected', 'true');
 await page.getByRole('button', { name: 'Cadastrar exame' }).first().click();
 await page.getByLabel('Nome do exame').fill('Exame de integração');
 await page.getByLabel('Código').fill('TEST001');
 await page.getByRole('button', { name: 'Salvar cadastro' }).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.getByRole('link', { name: /Exame de integração/ })).toBeVisible();
 await page.getByRole('link', { name: /Exame de integração/ }).click();
 await expect(page.getByRole('heading', { name: 'Exame de integração' })).toBeVisible();
 await page.getByRole('button', { name: 'Editar exame' }).click();
 await page.getByLabel('Informações do exame').fill('Informação revisada');
 await page.getByRole('button', { name: 'Salvar cadastro' }).click();
 await page.reload();
 await expect(page.getByText('Informação revisada')).toBeVisible();
 await page.goto('/unidades/CSM?aba=exames');
 await expect(page.getByText('Exame de integração')).toHaveCount(0);
});

test('CNPJ can be maintained per existing unit; mobile layout has no overflow', async ({ page }) => {
 await page.goto('/unidades/CSM');
 await page.getByRole('button', { name: 'Dados da unidade' }).click();
 await page.getByLabel('CNPJ').fill('12.345.678/0001-90');
 await page.getByLabel('Razão social').fill('Clínica São Marcos Ltda');
 await page.getByRole('button', { name: 'Salvar cadastro' }).click();
 await expect(page.getByText('12.345.678/0001-90')).toBeVisible();
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto('/');
 await expect(page.locator('.unit-tile')).toHaveCount(5);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.waitForTimeout(900);
 await page.screenshot({ path: 'test-results/guide-mobile.png', fullPage: true });
 await page.setViewportSize({ width: 1440, height: 1000 });
 await page.screenshot({ path: 'test-results/guide-desktop.png', fullPage: true });
});
