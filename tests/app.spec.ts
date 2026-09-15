import { test, expect } from '@playwright/test';
test.beforeEach(async ({ context }) => {
 const response = await context.request.post('/api/auth/login', { data: { username: 'admin', password: 'admin' } });
 expect(response.ok()).toBe(true);
});
test('dashboard, filter, original source, and filtered export', async ({page}) => {
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Sua rede, em uma só visão.'})).toBeVisible();
 await expect(page.getByText('102',{exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Todas as unidades'}).selectOption('CSM');
 await page.getByRole('button',{name:/Profissionais na base/}).click();
 await expect(page.getByRole('heading',{name:'Corpo clínico',exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Buscar nesta visão'}).fill('Cristina');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar consulta'}).click();expect((await downloadPromise).suggestedFilename()).toBe('oncology-consulta.csv');
 await page.getByRole('button',{name:/Ver detalhes de/}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('dialog').getByRole('button').filter({hasText:'CORPO CLINICO CSM'}).click();
 await expect(page).toHaveURL(/aba=sheet-5/);await expect(page.locator('.highlight-row')).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('search, all modules, filters and empty states',async({page})=>{
 await page.goto('/');await page.getByRole('textbox',{name:'Buscar nesta visão'}).fill('40304485');await expect(page.getByText('Mielograma - punção aspirativa de medula óssea')).toBeVisible();
 for(const path of ['/atendimentos','/convenios','/credenciamento','/procedimentos','/equipe','/qualidade']){await page.goto(path);await expect(page.locator('tbody tr').first()).toBeVisible();}
 await page.goto('/credenciamento');await page.getByRole('combobox',{name:'Todas as situações'}).selectOption('Não solicitar');await expect(page.locator('tbody tr')).toHaveCount(6);
 await page.getByRole('textbox',{name:'Buscar nesta visão'}).fill('sem-resultado-xyz');await expect(page.getByText('Nenhum registro encontrado')).toBeVisible();
 await page.goto('/procedimentos');await page.getByRole('tab',{name:'Base de negociação'}).click();await page.getByRole('textbox',{name:'Buscar nesta visão'}).fill('60023082');await expect(page.locator('tbody tr')).toHaveCount(4);
});
test('mobile navigation, all tabs and keyboard dialog',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Sua rede, em uma só visão.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.waitForTimeout(1200);await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('link',{name:'Convênios e valores'}).click();
 for(const tab of ['Habilitação de serviços','Vínculos COMN','Listas gerais','Observações do mapeamento']){await page.getByRole('tab',{name:tab}).click();await expect(page.locator('tbody tr').first()).toBeVisible();}
 await page.getByRole('button',{name:/Ver detalhes de/}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1)}));
 expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
});
test('desktop screenshot and raw workbook coverage',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await page.goto('/');await expect(page.getByText('102',{exact:true})).toBeVisible();await page.waitForTimeout(900);await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 await page.goto('/base');const select=page.getByRole('combobox',{name:'Selecione a aba'});await expect(select.locator('option')).toHaveCount(20);
 await select.selectOption('sheet-15');await page.getByRole('textbox',{name:'Buscar na aba'}).fill('CARTAO DE DEBITO');await expect(page.locator('tbody tr').first()).toContainText('CARTAO DE DEBITO');
});
