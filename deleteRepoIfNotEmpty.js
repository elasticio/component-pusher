const axios = require('axios');

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
});

// Here only empty repos will be deleted
async function deleteRepository() {
  // Check if there is a 'latest_version' in the repo. The repo is empty if no
  const { data } = (await request.get(`/v2/components/${process.argv[2]}`)).data;
  const isLatestVersion = data.relationships.latest_version;
  if (!isLatestVersion) {
    const result = await request.delete(`/v2/components/${process.argv[2]}`);
    // Response when component has some version deployed on the platform
    if (result.status === 204) {
      console.log('The repository was successfully deleted from the platform');
    } else {
      console.log('The repository was not deleted from the platform');
    }
  }
}

deleteRepository();
