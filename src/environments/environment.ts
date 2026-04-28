export const environment = {
  production: false,
  // Match the backend launch profile:
  // - HTTP profile (`dotnet run --launch-profile http`): only http://localhost:5226 is listening.
  // - HTTPS profile (`dotnet run --launch-profile https`): use https://localhost:7183.
  // If you use HTTP here, open the Angular app over http://localhost:4200 (CORS allows it by default).
  apiUrl: 'https://broadbill.runasp.net',
  //apiUrl: 'http://localhost:5226',
  //apiUrl: 'https://localhost:7183',
};

