#!/usr/local/bin/bash
# Bash v4+ must be used (or !/bin/bash)

tmp_dir_name="/tmp/elasticio-components-pusher"

# Processes entire tenant, pushing the list of the components there
function process_tenant() {

    export_var_file=$1/export.vars
    component_list_file=$1/component-list.txt
    git_remote_name=elasticio-autopush
    declare -A tenant_map

    source $export_var_file

    # Adding new line to the end of file if and only if there is no one.
    # Since the last line will not be processed by the loop otherwise.
    sed -i -e '$a\' $component_list_file

    node ensure-components.js $1

    # Pushes single component
    function push_component() {
        component=$2
        version=$3
        origin=$4
        id=$5
        comp_version_before_push=$(node getComponentLatestVersion.js ${id})
        echo ">>>>>>>> Tenant $1. Team $TEAM_NAME. Component $2 >>>>>>>>"
        echo "About to clone $component, version $version from $origin"
        ssh-agent bash -c "ssh-add ${GIT_CLONE_KEY}; git clone ${origin} $tmp_dir_name/$component"
        pushd "$tmp_dir_name/$component" || return
        comp_head_rev="$(git rev-parse HEAD)"
        comp_array=()
        # Create remote by alias (must be configured in ~/.ssh/config), not by URL
        echo "Adding the remote..."
        git remote add ${git_remote_name} "$TEAM_NAME@$SSH_ALIAS:$component"
        git checkout "$version"
        echo "About to push the component..."
        PUSH_RESULT=$(git push "${git_remote_name}" "$version":master 2>&1)
        echo ${PUSH_RESULT}
        PUSH_RESULT_LAST_LINE=$(echo ${PUSH_RESULT} | tail -1)
        echo "Removing the remote..."
        git remote remove ${git_remote_name}
        popd
        latest_comp_version=$(node getComponentLatestVersion.js ${id})
        echo "Latest component version on the platform:"${latest_comp_version}
        if [ "${latest_comp_version}" = "-1" -a "${PUSH_RESULT_LAST_LINE}" = "Everything up-to-date" ];
        then
            comp_array=(${id} "---" "Same-comp-rev-exists")
            # Delete component's repo from the platform. As it is automatically created by the script
            node deleteRepo.js ${id}
        elif [ "${PUSH_RESULT_LAST_LINE}" != "Everything up-to-date" ];
        then
            comp_array=(${id} "---" "Failed")
        elif [ "${latest_comp_version}" = "${comp_head_rev}" -a "${comp_version_before_push}" = "-1" ]
        then
            comp_array=(${id} ${latest_comp_version} "Success")
        else
            comp_array=(${id} ${latest_comp_version} "Nothing-to-update")
        fi
        tenant_map[$component]=${comp_array[@]}
    }

    # Get an array of all components (ids) available in the team
    exec 3< <(node getComponentInfo.js $1);
    compNames=();
    while read -r;
    do
        compNames+=("$REPLY");
    done <&3;
    exec 3<&-;

    while IFS= read -r line || [ -n "$a" ]
    do
        component=$(echo "$line" | awk '{print $1}')
        version=$(echo "$line" | awk '{print $2}')
        origin=$(echo "$line" | awk '{print $3}')

        # Get component's id by its name
        for i in "${!compNames[@]}";
        do
            compToPushId=$(echo ${compNames[i]} | cut -d':' -f1)
            compToPushName=$(echo ${compNames[i]} | cut -d':' -f2)
            if [[ "${compToPushName}" = "${component}" ]]; then
                repoId=${compToPushId}
            fi
        done
        push_component "$1" "$component" "$version" "$origin" "$repoId"
    done < "$component_list_file"
    # Printing statistics
    divider===============================================================
    divider=${divider}${divider}
    header="\n%-30s %-28s %-42s %-26s\n"
    format="%-30s %-28s %-42s %-26s\n"
    printf ${divider}
    printf "$header" "COMP NAME" "COMP ID" "LATEST VERSION" "STATUS" ${divider}
    for key in "${!tenant_map[@]}";
    do
        printf "$format" ${key} ${tenant_map[$key]};
    done
    printf ${divider}"\n"
}

# Script entry point
mkdir -p ${tmp_dir_name}
# Perform bulk component push for each tenant (each tenant is a folder in the 'tenants' directory)
for filename in tenants/*/
do
    now="$(date +'%Y-%m-%dT%H-%M-%S')"
    tenantName=$(echo ${filename#tenants/})
    mkdir -p logs/${tenantName}
    # Push components to the tenant, copying logs to file named: logs/tenantName/dateTime.log
    process_tenant ${filename} 2>&1 | tee logs/${tenantName}/${now}.log
done
echo "Cleaning up..."
rm -rf ${tmp_dir_name} || return
