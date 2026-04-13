export const environment = {
  production: false,
  // Call HTTPS directly. http://localhost:5226 redirects to https://localhost:7183; that redirect
  // response usually has no Access-Control-Allow-Origin, so the browser blocks the CORS preflight.
  apiUrl: 'https://broadbill.runasp.net',
  //apiUrl: 'https://localhost:7183',
  //https://broadbill.runasp.net
};

