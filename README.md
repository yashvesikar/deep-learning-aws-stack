# DL Dev Infrastructure

## Local Setup

If you don't already have nvm or direnv, download via brew:

```bash
brew install nvm && nvm install 20 && nvm use 20
brew install direnv
```

and add `eval "$(direnv hook zsh)"` to the end of your `~/.zshrc`.

Afterwards you can install npm and node via nvm:

```bash
nvm install node
nvm install-latest-npm
```

Install the required dependencies

```bash
npm i -g typescript aws-cdk
```

Set up a keypair in AWS in the correct account in the correct region.

- Instructions on how to create a key pair [LINK](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html#having-ec2-create-your-key-pair)

> Important: Save the file as `dl-dev-ec2-ssh-{stack name}.pem` in your `~/.ssh` directory and use the same name in the config step below. Run `chmod 400 ~/.ssh/dl-dev-ec2-ssh-{stack name}.pem` before continuing on.

![](docs/key-pair-instructions.png)

Then run the following and fill out the values correctly.
Profile should be the AWS profile associated with the account (check your credentials: `nano ~/.aws/credentials` to be sure).

Create a `.envrc` file that should look like `.envrc.example` provided in this repo. Put it in the same location and run `direnv allow`. Replace `STACK_NAME` with the name used in your key pair (in quotes! e.g, "yash").

## First Deployment

Run `npx cdk@latest deploy --all --profile <YOUR AWS PROFILE>`
During the first deployment the DLStatefulStack will configure an AWS Elastic File System (EFS) for persistant storage, and a VPC with security group that will be used by all other resources in the EC2 instance.

## Every Other Deployments

Run `cdk deploy DLStack --profile <YOUR AWS ROFILE>`
Every subsequent deployment after the _very first deployment ever_ will only need to provision the EC2 machine so should not include the DLStatefulStack in the deployment.

Please note that the cloud machine may take a few minutes to install and mount EFS after the initial deploy. You can inspect the `/var/log/cloud-init-output.log` file if you suspect there were any issues during the initialization of the instance.

## Connecting with SSH

Run the outputted ssh command (`DLStack.EC2ConnectCommand`) and you should be good to go!

After initially SSH-ing into the machine run the following commands to set up Nvidia, Python, Pyenv, Pytorch, etc.

```sh
cd ~/ && \
sudo chmod +x ./initial.sh && \
sudo ./initial.sh
```

The initial pyenv installation comes with a pre-configured python 3.11 virtual environment. To activate it you can run `pyenv activate dl` and get started!

After you SSH into your instance for the first time edit your local `~/.ssh/config` file entry for your dev domain to the following. Fill in with your values.
Note: If you connect through VSCode it will handle this for you.
```
# ~/.ssh/known_hosts
Host <<<EC2 ALIAS>>
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel QUIET
    IdentityFile <<<PATH TO PEM FILE>>>
    User ubuntu
```

The persistant file system is located at `/home/ubuntu/efs`.

## Connecting with SSH on VSCode

See: https://code.visualstudio.com/docs/remote/ssh#_connect-to-a-remote-host

## Changing instance type

The current reccomendation for running a different instance type is to first destrory your current instance and deploy a new one. Here is an example:

```sh
cdk destroy DLStack --profile <YOUR AWS PROFILE>
cdk deploy DLStack --profile <YOUR AWS PROFILE> --context instanceType=p3.2xlarge
```

## Port forwarding Jupyter Notebooks

To set up port forwarding with JupterLab or Jupyter Notebooks modify the ssh command with the `-L` flag when connecting. Here is an example of port 8000 on remote forwarding to port 8000 on local machine.

```sh
ssh -i ~/.ssh/yash-ssh.pem -L 8000:localhost:8000 ec2-user@ec2-35-86-152-92.us-west-2.compute.amazonaws.com
```

I have had really good success with the Tensorboard embedded in VSCode and haven't needed to use Jupyter Notebooks for model development.

### Cost management

When you are not using the instance you can stop it by going into aws ec2 explorer and selecting your instance and selecting stop instance. [Link](https://us-west-2.console.aws.amazon.com/ec2/home?region=us-west-2#Instances:)
![](docs/stop-instance.png)

## FAQ

- Default instance type is `g4dn.xlarge`.
