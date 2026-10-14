import { chromium } from '@playwright/test';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.env.PRODUCT_URL || 'http://localhost:1420';
const source = process.env.PRODUCT_SOURCE || 'C:/Users/holam/Documents/02_Proyectos/apps de escritorio/CounterKeep';
const target = resolve('public/images');
await mkdir(target, { recursive: true });
await copyFile(resolve(source, 'src/assets/counterkeep-logo.jpg'), resolve(target, 'logo.jpg'));
const browser = await chromium.launch();
const manifest = [];
try {
  for (const [language, suffix] of [['en-US', 'en'], ['es-419', 'es']]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('.setup-shell').waitFor();
    // Only this isolated browser context receives fixtures. The original source,
    // desktop database and user records are never modified.
    await page.evaluate(async language => {
      const { getDb } = await import('/src/services/db.ts');
      const { useAppStore } = await import('/src/store/appStore.ts');
      const { useAuthStore } = await import('/src/store/authStore.ts');
      const { changeAppLanguage } = await import('/src/i18n.ts');
      const spanish = language === 'es-419';
      const names = spanish
        ? ['Café de especialidad 250 g', 'Taza de cerámica', 'Botella térmica 500 ml', 'Cuaderno tapa dura', 'Bolsa de algodón', 'Té verde 100 g', 'Vela aromática', 'Chocolate 70%']
        : ['Specialty coffee 250 g', 'Ceramic mug', 'Insulated bottle 500 ml', 'Hardcover notebook', 'Cotton tote bag', 'Green tea 100 g', 'Scented candle', 'Dark chocolate 70%'];
      const products = names.map((name, i) => ({ id: i + 1, name, sku: `CK-${String(i + 1).padStart(3, '0')}`, barcode: `78012345000${i}`, category: i < 3 ? (spanish ? 'Café y accesorios' : 'Coffee & accessories') : (spanish ? 'Tienda' : 'Shop'), supplier: 'Local supply', cost: [6, 4, 12, 5, 3, 4, 7, 2][i], retail_price: [12.5, 9, 24, 11, 8, 10, 16, 6][i], stock_quantity: [36, 24, 3, 48, 32, 4, 18, 52][i], minimum_stock: 5, is_active: 1 }));
      const customers = ['Ana Torres', 'Daniel Rojas', 'Elena Morales', 'Lucas Rivera'].map((name, i) => ({ id: i + 1, name, email: `customer${i + 1}@example.com`, phone: '' }));
      const recent = [68.5, 42, 96, 24, 53.5, 87, 74, 67].map((total, i) => ({ sale_number: `RCT-${String(128 - i).padStart(6, '0')}`, total, sold_at: '2026-10-14 12:30:00' }));
      const reports = [512, 438, 685, 392, 746, 581, 824].map((total, i) => ({ day: `2026-10-${14 - i}`, total, sales: [18, 15, 22, 14, 26, 19, 28][i] }));
      const workOrders = customers.map((c, i) => ({ id: i + 1, customer: c.name, work_order_number: `WO-000${84 + i}`, device_description: ['Lenovo ThinkPad T14', 'Samsung Galaxy A54', 'Dell Inspiron 15', 'HP LaserJet Pro'][i], status: ['Diagnosing', 'Waiting for parts', 'Ready for pickup', 'In progress'][i], total_estimate: [85, 120, 65, 95][i] }));
      const db = await getDb();
      db.select = async query => {
        if (query.includes('COALESCE(SUM')) return [{ total: 512, count: 18, profit: 208 }];
        if (query.includes('GROUP BY date')) return reports;
        if (query.includes('FROM work_orders')) return workOrders;
        if (query.includes('FROM products')) return query.includes('stock_quantity <=') ? products.filter(p => p.stock_quantity <= p.minimum_stock) : products;
        if (query.includes('FROM customers')) return customers;
        if (query.includes('FROM sales')) return recent;
        return [];
      };
      await changeAppLanguage(language);
      useAppStore.getState().setSettings({ setupComplete: true, language, businessProfile: 'retail', businessName: spanish ? 'Tienda Olivo · Demo' : 'Olivo shop · Demo', loginEnabled: true });
      useAuthStore.getState().setUser({ id: 1, fullName: 'Demo operator', username: 'demo', role: 'admin' });
    }, language);
    for (const [view, filename] of [['dashboard', 'hero'], ['newSale', 'feature-1-pos'], ['products', 'feature-2-inventory'], ['reports', 'feature-3-reports'], ['workOrders', 'feature-4-work-orders']]) {
      await page.evaluate(async view => {
        const { useAppStore } = await import('/src/store/appStore.ts');
        useAppStore.getState().setCurrentView(view);
      }, view);
      await page.locator('.app-content h1').waitFor();
      if (view === 'newSale') {
        await page.locator('.pos-page section button.ck-card').first().click();
        await page.locator('.pos-page section button.ck-card').nth(1).click();
        await page.locator('#pos-cash').fill('30');
      }
      if (view === 'products') await page.locator('tbody tr').first().waitFor();
      if (view === 'reports') await page.locator('.recharts-bar-rectangle').first().waitFor();
      if (view === 'workOrders') await page.locator('tbody tr').first().waitFor();
      if (view === 'dashboard') await page.getByText('$512.00', { exact: true }).waitFor();
      await page.evaluate(async () => { await document.fonts.ready; });
      // Allow the real chart animation to finish before capturing pixels.
      await page.waitForTimeout(1800);
      const file = `${filename}-${suffix}.png`;
      await page.screenshot({ path: resolve(target, file), animations: 'disabled' });
      manifest.push({ file, view, language, width: 1920, height: 1080, source: 'Actual CounterKeep React interface in browser preview; isolated fictional demo fixtures; no UI reconstruction' });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close();
  }
  await writeFile(resolve(target, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Captured ${manifest.length} real product screens at 1920×1080`);
} finally { await browser.close(); }
