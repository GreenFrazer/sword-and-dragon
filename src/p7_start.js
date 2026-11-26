// ======================= START =======================
resetGame();
showTitle();
try { importSaveFromHash(); } catch (e) {}
try { importDuelFromHash(); } catch (e) {}
requestAnimationFrame(update);
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)) { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {} }
