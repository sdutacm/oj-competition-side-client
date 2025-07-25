#!/usr/bin/env python3
import os
import sys
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client

def main():
    # 从环境变量获取配置
    secret_id = os.environ.get('COS_SECRET_ID')
    secret_key = os.environ.get('COS_SECRET_KEY')  
    region = os.environ.get('COS_REGION')
    bucket = os.environ.get('COS_BUCKET')
    tag_name = os.environ.get('TAG_NAME')

    if not all([secret_id, secret_key, region, bucket, tag_name]):
        print("❌ Missing required environment variables")
        sys.exit(1)

    print(f"🔧 Configuring COS client for region: {region}, bucket: {bucket}")

    # 配置
    config = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key)
    client = CosS3Client(config)

    # 上传文件
    downloads_dir = './downloads'
    if not os.path.exists(downloads_dir):
        print("❌ Downloads directory not found")
        sys.exit(1)

    print(f"📁 Scanning directory: {downloads_dir}")
    files = [f for f in os.listdir(downloads_dir) if os.path.isfile(os.path.join(downloads_dir, f)) and f != 'assets.json']
    print(f"📦 Found {len(files)} files to upload")

    success = True
    uploaded_files = []

    for filename in files:
        filepath = os.path.join(downloads_dir, filename)
        try:
            key = f'releases/{tag_name}/{filename}'
            print(f"📤 Uploading: {filename}")
            print(f"   Local: {filepath}")
            print(f"   Remote: {key}")
            
            client.upload_file(
                Bucket=bucket,
                LocalFilePath=filepath,
                Key=key
            )
            print(f"✅ Successfully uploaded: {filename}")
            uploaded_files.append(filename)
        except Exception as e:
            print(f"❌ Failed to upload {filename}: {str(e)}")
            success = False

    print(f"\n📊 Upload Summary:")
    print(f"✅ Successfully uploaded: {len(uploaded_files)} files")
    if uploaded_files:
        for f in uploaded_files:
            print(f"  - {f}")

    if success:
        print(f"\n🎉 All {len(files)} files uploaded successfully to COS!")
        print(f"📂 Remote path: releases/{tag_name}/")
        
        # 上传index.json如果存在
        index_file = os.path.join(downloads_dir, 'index.json')
        if os.path.exists(index_file):
            try:
                index_key = f'releases/{tag_name}/index.json'
                print(f"📋 Uploading index.json...")
                client.upload_file(
                    Bucket=bucket,
                    LocalFilePath=index_file,
                    Key=index_key
                )
                print(f"✅ Successfully uploaded index.json")
            except Exception as e:
                print(f"❌ Failed to upload index.json: {str(e)}")
    else:
        print("\n❌ Some uploads failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
