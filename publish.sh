#!/bin/bash

current_dir=$(pwd)

# 本地静态资源目录
local_dist="$current_dir/dist"
local_pg="$current_dir/package.json"
local_proxy_server="$current_dir/proxy-server.js"
echo "本地静态资源路径:" "$local_dist"

# 远程服务器信息
remote_ip="YOUR_SERVER_IP"
remote_user="root"
remote_dir="/data/tv"

# 上传本地静态资源到远程服务器
rsync -avz --delete -e "ssh -p 22" "$local_dist" "$local_pg" "$local_proxy_server" "$remote_user@$remote_ip:$remote_dir"