import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { SignJWT } from 'jose';

test('private pages and data require authentication', async ({page,request})=>{
 for(const route of ['/api/library','/api/workbook','/api/auth/me'])expect((await request.get(route)).status()).toBe(401);
 await page.goto('/corpo-clinico');await expect(page).toHaveURL('/login');
 await expect(page.getByRole('heading',{name:'Base de dados.'})).toBeVisible();
 await expect(page.getByAltText('Oncology Group')).toBeVisible();
 for(const route of ['/data/library.json','/data/workbook.json','/data/auth.json']){
  const response=await request.get(route);expect(await response.text()).not.toContain('passwordHash');expect(await response.text()).not.toContain('professionalId');
 }
});
test('login error, password visibility, deep-link restoration, reload and logout',async({page,context})=>{
 const request=context.request;
 await page.goto('/corpo-clinico');await page.getByLabel('Login',{exact:true}).fill('admin');await page.getByLabel('Senha',{exact:true}).fill('errada');
 await page.getByRole('button',{name:'Mostrar senha'}).click();await expect(page.getByLabel('Senha',{exact:true})).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'Acessar base de dados'}).click();await expect(page.getByRole('alert')).toContainText('Login ou senha incorretos');
 await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Acessar base de dados'}).click();await expect(page).toHaveURL('/corpo-clinico');await expect(page.getByRole('heading',{name:'Corpo clínico',exact:true})).toBeVisible();
 const cookie=(await context.cookies()).find(c=>c.name==='oncology_session')!;expect(cookie.httpOnly).toBe(true);expect(cookie.sameSite).toBe('Strict');expect(cookie.value.split('.')).toHaveLength(3);
 expect(await page.evaluate(()=>document.cookie)).not.toContain('oncology_session');expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.reload();await expect(page.getByRole('heading',{name:'Corpo clínico',exact:true})).toBeVisible();
 expect((await request.get('/api/library')).status()).toBe(200);
 await page.goto('/convenios');await expect(page.getByRole('heading',{name:'Convênios e valores',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sair do sistema'}).click();await expect(page).toHaveURL('/login');
 expect((await request.get('/api/library')).status()).toBe(401);
 expect((await request.get('/api/library',{headers:{Cookie:`oncology_session=${cookie.value}`}})).status()).toBe(401);
 await page.goBack();await expect(page.getByRole('heading',{name:'Base de dados.'})).toBeVisible();
});
test('forged and expired JWTs are rejected; other users cannot log in',async({request})=>{
 expect((await request.post('/api/auth/login',{data:{username:'other',password:'admin'}})).status()).toBe(401);
 expect((await request.post('/api/auth/login',{data:{username:[],password:{}}})).status()).toBe(400);
 expect((await request.post('/api/auth/login',{data:{username:'admin',password:'admin'},headers:{Origin:'https://example.com'}})).status()).toBe(403);
 expect((await request.post('/api/auth/login',{form:{username:'admin',password:'admin'}})).status()).toBe(415);
 const login=await request.post('/api/auth/login',{data:{username:'admin',password:'admin'}});expect(login.status()).toBe(200);
 const token=login.headers()['set-cookie'].split(';')[0].split('=')[1];const [head,payload,signature]=token.split('.');
 const forged=`${head}.${payload}.${signature[0]==='a'?'b':'a'}${signature.slice(1)}`;
 expect((await request.get('/api/workbook',{headers:{Cookie:`oncology_session=${forged}`}})).status()).toBe(401);
 const credentials=JSON.parse(await readFile('data/auth.json','utf8'));
 expect(credentials.passwordHash).not.toBe('admin');
 const expired=await new SignJWT({role:'admin'}).setProtectedHeader({alg:'HS256'}).setSubject('admin').setIssuer('organizacao-oncology').setAudience('oncology-web').setJti('expired-test').setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)-60).sign(Buffer.from(credentials.jwtSecret,'hex'));
 expect((await request.get('/api/library',{headers:{Cookie:`oncology_session=${expired}`}})).status()).toBe(401);
});
test('expired session clears the screen and logout reaches other tabs',async({page,context})=>{
 const request=context.request;
 const login=await request.post('/api/auth/login',{data:{username:'admin',password:'admin'}});const {expiresAt}=await login.json();
 await page.clock.install();await page.goto('/');await expect(page.getByRole('heading',{name:'Sua rede, em uma só visão.'})).toBeVisible();
 await page.clock.fastForward(expiresAt-Date.now()+1000);await expect(page).toHaveURL('/login');await expect(page.getByRole('status')).toContainText('Sua sessão terminou');
 await page.getByLabel('Login',{exact:true}).fill('admin');await page.getByLabel('Senha',{exact:true}).fill('admin');await page.clock.setSystemTime(new Date());await page.getByRole('button',{name:'Acessar base de dados'}).click();
 await expect(page.getByRole('heading',{name:'Sua rede, em uma só visão.'})).toBeVisible();
 const other=await context.newPage();await other.goto('/');await expect(other.getByRole('heading',{name:'Sua rede, em uma só visão.'})).toBeVisible();
 await page.getByRole('button',{name:'Sair do sistema'}).click();await expect(other).toHaveURL('/login');
});
test('login is responsive and honors reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/login');await expect(page.getByRole('heading',{name:'Base de dados.'})).toBeVisible();await page.screenshot({path:'test-results/login-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/login-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.getByLabel('Login',{exact:true}).fill('admin');await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByLabel('Senha',{exact:true}).press('Enter');await expect(page.getByRole('heading',{name:'Sua rede, em uma só visão.'})).toBeVisible();
});
test('repeated failed logins are rate limited',async({request})=>{
 let status=0;
 for(let i=0;i<31;i++){
  const response=await request.post('/api/auth/login',{data:{username:'admin',password:'invalid'}});status=response.status();
  if(status===429){expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);break;}
  expect(status).toBe(401);
 }
 expect(status).toBe(429);
});
