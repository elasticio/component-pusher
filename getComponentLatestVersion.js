const axios = require('axios');
https = require('https');

const {
  API_URL,
  EMAIL,
  API_KEY,
} = process.env;

const auth = Buffer.from(`${EMAIL}:${API_KEY}`).toString('base64');
const request = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Basic ${auth}`,
  },
  httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
});

async function getComponentLatestVersion() {
  const { data } = (await request.get(`/v2/components/${process.argv[2]}`)).data;
  try {
    const latestHash = data.relationships.latest_version.data.id;
    // Response when component has some version deployed on the platform
    console.log(latestHash);
  } catch (error) {
    console.log('-1');
  }
}

getComponentLatestVersion();
