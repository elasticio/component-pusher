# Bulk components push

This script allows to push a set of components to set of tenants with `git`.

## Table of Contents
 - [Configuration](#configuration)
   * [component-list.txt](#component-list.txt)
   * [env.vars](#export.vars)
     * [SSH](#SSH)
   * [push.sh](#push.sh)
 - [Usage](#usage)
 - [Logs](#logs)

## Configuration

Bash v4+ must be installed and used by script to work (This is why shebang line was changed from `#!/bin/bash` to `#!/usr/local/bin/bash`).
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

### component-list.txt

Configure the file `component-list.txt` with components you want to be updated. The format is "component name on the UI" "version" "origin from github" divided by spaces (note spaces are used to separate values so don't use spaces in component name). Example: `code master git@github.com:elasticio/code-component.git`.
This file should be created for each tenant and put into its root folder.

### export.vars

Before you start `push.sh` you should create and configure file "`./export.vars`" with required data (located in the root dir of each tenant).

Example:
```
export API_URL="https://api.elastic.io"
export TEAM_NAME="elastic"
export TEAM_ID="MONGO_ID"
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
- GIT_CLONE_KEY - path to the key you want to use to clone the component from the GitHub
- SSH_ALIAS - alias in ~/.ssh/config file

#### SSH
**Important!** You have to make some configurations locally before launch the script.
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

### push.sh

It is a bash script that does the main work. Here are the requirements for it to work properly:

* Files `component-list.txt` and `export.vars` according to the specifications mentioned above.
* `awk` and `git` installed on your local machine.
* Access to the desired components on elastic.io Github.
* Access to the team you want to push the components.
* Your ssh-key uploaded into the environment where you are pushing the components.
* Node.js installed on your machine (required by script that does some api calls)

## Usage

Make sure your script is executable. If not change it using: `chmod +x push.sh`.
Execute the script with:
```bash
./push.sh
```
## Logs

The script produces log files containing all the information about the deployment process.
It stores in the folder `logs/tenantName/%DateTime%.log`, where DateTime - represents DateTime when script has been launched.
E.g. `logs/flint/2018-11-06T18-38-21.log`
All the statistics is available at the end of each log file.
