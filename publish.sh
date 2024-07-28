#!/bin/bash

current_dir=$(pwd)

# 本地静态资源目录
local_dist="$current_dir/dist"
echo "本地静态资源路径:" "$local_dist"

# 远程服务器信息
remote_ip="43.136.242.44"
remote_user="root"
remote_dir="/data/tv"

# 上传本地静态资源到远程服务器
rsync -avz --delete -e "ssh -p 22" "$local_dist" "$remote_user@$remote_ip:$remote_dir"