const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrrizeupdealerconnectn = onRequest({"region":"us-central1","cors":["https://9011-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev"]}, (req, res) => server.then(it => it.handle(req, res)));
  