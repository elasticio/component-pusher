/* eslint-disable no-restricted-syntax,no-await-in-loop */
const fs = require('fs');
const _ = require('lodash');
const assert = require('assert');
const axios = require('axios');

let dummyRepoCreated = false;
let dummyRepoId = '';

const {
  API_URL,
  TEAM_NAME,
  TEAM_ID,
  EMAIL,
  API_KEY,
  CONTRACT_ID,
} = process.env;

assert.ok(API_URL, 'You should set API_URL in the export.vars');
assert.ok(TEAM_NAME, 'You should set TEAM_NAME in the export.vars');
assert.ok(TEAM_ID, 'You should set TEAM_ID in the export.vars');
assert.ok(EMAIL, 'You should set EMAIL in the export.vars');
assert.ok(API_KEY, 'You should set API_KEY in the export.vars');
assert.ok(CONTRACT_ID, 'You should set CONTRACT_ID in the export.vars');

const auth = Buffer.from(`${EMAIL}:${API_KEY}`).toString('base64');
const request = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Basic ${auth}`,
  },
});

// Reads the list of the existing components
function readComponentsList(tenantPath) {
  const text = fs.readFileSync(`${tenantPath}/component-list.txt`).toString();
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

// General function for creating repository via API
async function createRepositories(repoLists) {
  for (const componentsChunk of _.chunk(repoLists, 10)) {
    console.log('About to create repos...');
    await Promise.all(componentsChunk.map(({ component }) => {
      const result = request.post('/v2/components', {
        data: {
          type: 'component',
          attributes: {
            name: component,
          },
          relationships: {
            team: {
              data: {
                type: 'team',
                id: TEAM_ID,
              },
            },
            contract: {
              data: {
                type: 'contract',
                id: CONTRACT_ID,
              },
            },
          },
        },
      });
      return result;
    }));
  }
}

// Creates repositories calling createRepositories function if there is no one in the team
async function createDummyRepoIfNotExist() {
  const { data } = (await request.get(`/v2/teams/${TEAM_ID}`)).data;
  if (!data.relationships.components) {
    console.log('No component repository found in the contract. Creating dummy one...');
    const { data: result } = await request.post('/v2/components', {
      data: {
        type: 'component',
        attributes: {
          name: 'dummy-component-pusher',
        },
        relationships: {
          team: {
            data: {
              type: 'team',
              id: TEAM_ID,
            },
          },
          contract: {
            data: {
              type: 'contract',
              id: CONTRACT_ID,
            },
          },
        },
      },
    });
    dummyRepoId = result.data.id;
    dummyRepoCreated = true;
    console.log('Successfully created dummy repository');
  }
  return Promise.resolve();
}

// Delete dummy component repository
function deleteDummyRepo() {
  if (dummyRepoCreated && dummyRepoId !== '') {
    console.log(`Trying to delete dummy repo with id:${dummyRepoId}...`);
    const result = request.delete(`/v2/components/${dummyRepoId}`, {
      data: {
        type: 'component',
        attributes: {
          name: 'dummy-component-pusher',
        },
        relationships: {
          team: {
            data: {
              type: 'team',
              id: TEAM_ID,
            },
          },
        },
      },
    });
    console.log(`Dummy repo with id:${dummyRepoId} was successfully deleted`);
  }
}

// Makes a delay in 5 sec in order to allow the back-end to finish all the operations for
// creating repository and to refresh an info
function delayAndCreateReposForNotExistingComponents() {
  setTimeout(async () => {
    const { data } = (await request.get(`/v2/teams/${TEAM_ID}`)).data;
    // actual list of all component ids available in the team
    const existingComponentIds = data.relationships.components.data.map(c => c.id);
    const existingComponents = await Promise.all(existingComponentIds.map(async (id) => {
      const componentData = (await request.get(`/v2/components/${id}`)).data;
      return componentData.data.attributes.name;
    }));
    // list of components in the config file which are NOT pushed on the platform
    const compList = readComponentsList(process.argv[2]).filter(c => !existingComponents
    .find(e => e === c.component));
    console.log('About to update components...');
    await createRepositories(compList);
    await deleteDummyRepo();
  }, 5000);
}

createDummyRepoIfNotExist()
  .then(delayAndCreateReposForNotExistingComponents())
  .catch(error => console.log(`${error}`));
