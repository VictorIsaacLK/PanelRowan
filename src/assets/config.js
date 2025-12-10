// Central config for static assets
// Edit `window.APP_CONFIG.API_BASE` here to change the API base for all assets
(function(){
  window.APP_CONFIG = window.APP_CONFIG || {};
  // Default API base (change this value once to affect all assets)
  // UPDATED: set to your production API
  window.APP_CONFIG.API_BASE = 'https://api.victorobproyecto.site';
  // Backwards compatibility: some pages check window.API_BASE_URL
  if(!window.API_BASE_URL) window.API_BASE_URL = window.APP_CONFIG.API_BASE;
})();
