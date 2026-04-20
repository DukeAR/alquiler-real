const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 3000 });
  console.log(`PUBLIC_URL=${tunnel.url}`);
  tunnel.on('close', () => console.log('TUNNEL_CLOSED'));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
