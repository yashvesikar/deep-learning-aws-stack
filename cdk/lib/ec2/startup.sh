#!/bin/bash

help_menu() {
    echo "Usage: $0 -f fileSystemId -m mountPoint -r region"
    echo
    echo "Options:"
    echo "  -f   Specify the file system ID"
    echo "  -m   Specify the mount point"
    echo "  -r   Specify the region"
    echo
    echo "All options are mandatory."
    exit 1
}

# Parse command line options.
while getopts f:m:r:h option
do
    case "${option}"
    in
        f) fileSystemId=${OPTARG};;
        m) mountPoint=${OPTARG};;
        r) region=${OPTARG};;
        h) help_menu;;
        *) help_menu;;
    esac
done

# Error handling: check if all options were provided
if [[ -z "$fileSystemId" ]] || [[ -z "$mountPoint" ]] || [[ -z "$region" ]]; then
    echo "Error: All options must be provided."
    help_menu
fi

# If no errors, echo the values
echo "File System ID: $fileSystemId"
echo "Mount Point: $mountPoint"
echo "Region: $region"

apt update -y && apt upgrade -y && \
apt-get -y install gcc git nfs-common || exit 1

# Install EFS mount helper
echo "Installing EFS mount helper"
git clone https://github.com/aws/efs-utils && \
cd efs-utils && \
./build-deb.sh && \
apt install ./build/amazon-efs-utils*deb -y && \
mkdir -p $mountPoint && \
chmod 777 $mountPoint
test -f "/sbin/mount.efs" && echo "$fileSystemId:/ $mountPoint efs _netdev,noresvport,tls,iam 0 0" >> /etc/fstab
mount -t efs -o tls $fileSystemId:/ $mountPoint || exit 1
echo "Finished installing EFS mount helper"