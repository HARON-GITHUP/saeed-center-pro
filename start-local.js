const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');

const HOST = '127.0.0.1';
const FIRST_PORT = 4173;
const LAST_PORT = 4193;

function portIsFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();
    tester.once('error', () => resolve(false));
    tester.listen({ host: HOST, port }, () => tester.close(() => resolve(true)));
  });
}

async function findPort() {
  for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
    if (await portIsFree(port)) return port;
  }
  throw new Error(`لا يوجد منفذ متاح بين ${FIRST_PORT} و ${LAST_PORT}`);
}

function healthCheck(port, tries = 30) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const check = () => {
      attempt++;
      const req = http.get({ host: HOST, port, path: '/api/health', timeout: 700 }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        if (attempt >= tries) return reject(new Error(`Health check failed: HTTP ${res.statusCode}`));
        setTimeout(check, 250);
      });
      req.on('error', () => {
        if (attempt >= tries) return reject(new Error('تعذر الاتصال بسيرفر المشروع'));
        setTimeout(check, 250);
      });
      req.on('timeout', () => req.destroy());
    };
    check();
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    return;
  }
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(command, [url], { detached: true, stdio: 'ignore' });
  child.unref();
}

(async () => {
  const port = await findPort();
  process.env.PORT = String(port);
  process.env.HOST = HOST;

  if (port !== FIRST_PORT) {
    console.log(`\n[تنبيه] المنفذ ${FIRST_PORT} مستخدم بواسطة برنامج/سيرفر آخر.`);
    console.log(`[تم الحل] سيتم تشغيل النسخة الصحيحة تلقائيًا على المنفذ ${port}.\n`);
  }

  require('./server.js');
  await healthCheck(port);

  const url = `http://${HOST}:${port}`;
  console.log(`\nافتح الموقع من هذا العنوان فقط: ${url}`);
  console.log(`لوحة الإدارة: ${url}/admin.html`);
  console.log(`اختبار API: ${url}/api/public/groups\n`);
  openBrowser(url);
})().catch((err) => {
  console.error('\n[خطأ في التشغيل]', err.message);
  process.exitCode = 1;
});
