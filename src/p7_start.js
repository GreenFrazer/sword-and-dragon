// ======================= START =======================
resetGame();
showTitle();
requestAnimationFrame(update);
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)) { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {} }
