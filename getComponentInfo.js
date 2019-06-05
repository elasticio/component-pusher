"strict mode";

const axios = require('axios');
const fs = require('fs');
https = require('https');

const {
  API_URL,
  TEAM_ID,
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

async function readTeamCompIds() {
  const { data } = (await request.get(`/v2/teams/${TEAM_ID}`)).data;
  data.relationships.components.data.forEach(entry => console.log(entry.id));
}

async function getAllComponentIds() {
  const { data } = (await request.get(`/v2/teams/${TEAM_ID}`)).data;
  const contractId = data.relationships.contract.data.id;
  const { data: allContractComponents } = (await request.get(`/v2/components?contract_id=${contractId}&filter[access]=private`)).data;
  return Object.values(allContractComponents);
}

// Reads the list of components from the 'component-list.txt' file
function readComponentsList() {
  const text = fs.readFileSync(`${process.argv[2]}/component-list.txt`).toString();
  const lines = text.split('\n').filter(l => !!l);
  const components = lines.map((l) => {
    const [component, version, origin] = l.split(' ');
    return {
      component,
      version,
      origin,
    };
  });
  return components;
}

async function findCommonComponents() {
  const componentsToPush = await readComponentsList();
  const allComps = await getAllComponentIds();
  for (const allComp of allComps) {
    for (const componentToPush of componentsToPush) {
      if (allComp.attributes.name === componentToPush.component) {
        console.log(`${allComp.id}:${allComp.attributes.name}`);
      }
    }
  }
}

findCommonComponents();
