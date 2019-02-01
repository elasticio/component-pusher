# Bulk components push

This script allows to push a set of components to set of tenants with `git`.

## Table of Contents
 - [Description]
 - [Configuration](#configuration)
   * [Component list](#component-list)
   * [Environment variables](#environment-variables)
     * [SSH](#SSH)
   * [Push script](#push-script)
 - [Usage](#usage)
 - [Logs](#logs)

## Description

Component pusher works in this way. It retrieves the most recent version of the component which you specify in `./tenants/{tenant_name}/component-list.txt` file, downloads it into your local temporary folder. And makes a push to a platform's git receiver. After that you will get final logs summarizing execution result. And all temporary data will be automatically erased from your local computer.  

## Configuration

Bash v4+ must be installed and used by script to work. See the details below.
See https://stackoverflow.com/questions/6047648/bash-4-associative-arrays-error-declare-a-invalid-option

`tenants` folder contains a tree structure of folders and files where all the configurations should be specified
tenants:
```bash
tenants
    ├── Tenant1
    │   ├── component-list.txt
    │   └── export.vars
    └── Tenant2
        ├── component-list.txt
        └── export.vars
        ...
        TenantN
        ├── component-list.txt
        └── export.vars
```
Here:
* Tenant1, Tenant2, TenantN. Main folders. Represent tenant, having its name.
* component-list.txt. Contains a list of components which should be autopushed to the tenant.
* export.vars. Here some set of variables should be specified. See below.

### Component list

Configure the file `component-list.txt` with components you want to be updated. The format is "component name on the UI" "version" "origin from github" divided by spaces (note spaces are used to separate values so don't use spaces in component name). Example: `code master git@github.com:elasticio/code-component.git`.
This file should be created for each tenant and put into its root folder.

### Environment variables

Before you start `push.sh` you should create and configure file "`./export.vars`" with required data (located in the root dir of each tenant).

Example:
```
export API_URL="https://api.elastic.io"
export TEAM_NAME="elastic"
export TEAM_ID="5bb4990ede8b1ad87a07c799"
export CONTRACT_ID="5b4f5119ff4304374238bbef"
export EMAIL="email@elastic.io"
export API_KEY="api-key"
export SSH_ALIAS="elastic-acme"
```
- API_URL - api url
- TEAM_NAME - destination team where we push components
- TEAM_ID - team id (get from browser url)
- CONTRACT_ID - contract id (get from browser url)
- EMAIL - your email (required to do some api calls)
- API_KEY - your api key (required to do some api calls)
- GIT_CLONE_KEY - (optional) path to the key you want to use to clone the component from the GitHub
- SSH_ALIAS - alias in ~/.ssh/config file which corresponds to tenant's ssh config. E.g.:
```
  Host elastic-acme
  HostName git.elastic.io
  User script_team_123
  IdentityFile ~/.ssh/acme
  IdentitiesOnly yes
```
#### SSH
**Important!** You have to make some configurations locally before launching the script.
As the script pushes components to multiple tenants, it uses different ssh keys for each tenant. It assumes that you have already configured ssh keys and aliases for it. If not, below is the list of steps to do that:
1. Create an SSH key:
```bash
ssh-keygen -t rsa -b 4096
```
Specify the name of the file and passphrase if needed.
Save the generated (public one!) key to the platform. How to do that you can find here: https://docs.elastic.io/developer-guide/ssh-keys.html2
2. Update your local `~/.ssh/config` file with the new entry regarding this tenant in this format:

```
Host *
 AddKeysToAgent yes
 UseKeychain yes
 IdentityFile ~/.ssh/id_rsa

Host elastic-acme
  HostName git.elastic.io
  User script_team_123
  IdentityFile ~/.ssh/acme
  IdentitiesOnly yes

Host some-tenant-name
  HostName git.elastic.io
  User some_team
  IdentityFile ~/.ssh/sometenantname
  IdentitiesOnly yes
```
Here:
* Host. An alias. In this example we have added 2 entries with aliases 'elastic-acme' and 'some-tenant-name'. You can add as many as you need.
For each of entry you should have SSH key generated.
* HostName - git.elastic.io. May differ on some tenants. 
* User. Team name. Should have the same value as in $TEAM_NAME env var from the [export.vars file](#export.vars). Should be created before launch the script.
* IdentityFile. A path to the identity file. It is an SSH key file you have generated above.

### Push script

`push.sh` script.

It is a bash script that does the main work. Here are the requirements for it to work properly:

- Files `component-list.txt` and `export.vars` according to the specifications mentioned above.
- `awk` and `git` installed on your local machine.
- Bash v4+ must be installed and used by script to work. This is why shebang line may be changed from `#!/usr/local/bin/bash` (like in the template) to something like `#!/bin/bash` or wherever an appropriate bash version is installed on your local machine.
  See https://stackoverflow.com/questions/6047648/bash-4-associative-arrays-error-declare-a-invalid-option
- Access to the desired components on elastic.io Github.
- Access to the team you want to push the components.
- Your ssh-key uploaded into the environment where you are pushing the components.
- Node.js installed on your machine (required by script that does some api calls)

## Usage

Make sure your script is executable. If not change it using: `chmod +x push.sh`.
Execute the script with:
```bash
./push.sh
```

As the result of the script execution you will get summarizing logs. E.g.:
```============================================================================================================================
COMP NAME                      COMP ID                      LATEST VERSION                             STATUS                    

============================================================================================================================                                                                                                   
s2-component                   5c4f1e1f19a8ae0012747267     3c64cee65cfb88ab33e56d79c2d835f7728fca9d   Success                   
petstore-component-nodejs      5c4f1e1f19a8ae0012747266     36fc9db0f0af082a6db138b5afab607db0d746a7   Success                   
configuration-component        5c4f1e1f19a8ae0012747264     70086b29fc38a91a05c135a5b48f796f625e7314   Success                   
smarty-streets-component       5c4f1e1f19a8ae0012747265     8beccc6f0f1492ca154a20ed325495a227b79be2   Success                   
petstore-component-java        5c4f1e1f19a8ae0012747269     a813f137269a61e8a93344c5d457a358050e3b86   Success                   
============================================================================================================================
```

Possible values of the `STATUS` column:
- **Success** - the component has been successfully deployed to the platform
- **Everything-up-to-date** - the same version of the component has been already pushed to the same repository
- **Failed** - something went wrong while pushing the component. Check the log file or console output to investigate the reason of a failure

## Logs

The script produces log files containing all the information about the deployment process.
It stores in the folder `logs/tenantName/%DateTime%.log`, where DateTime - represents DateTime when script has been launched.
E.g. `logs/flint/2018-11-06T18-38-21.log`
All the statistics is available at the end of each log file.
