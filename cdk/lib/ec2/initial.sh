#!/bin/bash

apt update -y && apt upgrade -y && \
apt-get -y install nvidia-cuda-toolkit binutils linux-headers-$(uname -r) \
build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev curl llvm \
libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev || exit 1


# Install nvidia drivers
echo "Installing nvidia drivers"
distribution=$(. /etc/os-release;echo $ID$VERSION_ID | sed -e 's/\.//g') && \
wget https://developer.download.nvidia.com/compute/cuda/repos/$distribution/x86_64/cuda-keyring_1.0-1_all.deb && \
dpkg -i cuda-keyring_1.0-1_all.deb && \ 
apt-get update && \
apt-get -y install cuda-drivers --no-install-recommends || exit 1
echo "Finished installing nvidia drivers"

# Install pyenv
echo "Installing pyenv"
export HOME="/home/ubuntu"  # needed for the pyenv installer
export PYENV_ROOT="$HOME/.pyenv"
curl https://pyenv.run | bash


echo 'export PATH="$HOME/.pyenv/bin:$PATH"' >> ~/.bashrc
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc 
echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc 

export PATH="$HOME/.pyenv/bin:$PATH"
export PYENV_ROOT="$HOME/.pyenv"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"
chmod -R 777 $PYENV_ROOT  # needed for running any pyenv commands as ubuntu user
echo "Finished installing pyenv"

## Install python 3.11
echo "Installing python 3.11"
pyenv install 3.11 && pyenv global 3.11 && pyenv virtualenv 3.11 dl && pyenv activate dl || exit 1
echo "Finished installing python 3.11"


# Python packages
pip install -U \
    --pre torch \
    torchvision \
    torchaudio --index-url https://download.pytorch.org/whl/nightly/cu121 \
    numpy

echo "EC2 Initialized"
echo "Rebooting in 5 seconds..."

for i in 5 4 3 2 1 
do
  echo $i
  sleep 1
done

echo "Rebooting now..."
reboot