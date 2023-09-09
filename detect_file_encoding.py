import os
import chardet
import argparse
import shutil

def detect_file_encoding(file_path):
    with open(file_path, 'rb') as f:
        result = chardet.detect(f.read(4096))
    return result['encoding']

def convert_to_gbk(file_path, encoding):
    # 创建一个备份
    #shutil.copy(file_path, f"{file_path}.bak")

    # 读取并重新编码文件
    with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
        content = f.read()

    with open(file_path, 'w', encoding='GBK', errors='ignore') as f:
        f.write(content)

def main(directory):
    # 创建一个output文件夹
    if not os.path.exists("output"):
        os.mkdir("output")


    if not os.listdir(directory):
        print("指定的目录是空的")
        return

    found_txt = False

    for filename in os.listdir(directory):
        if filename.endswith(".txt"):
            found_txt = True
            file_path = os.path.join(directory, filename)
            encoding = detect_file_encoding(file_path)

            if encoding is None:
                print(f"无法确定 {filename} 的编码，跳过...")
                continue

            if encoding.lower() in ['gbk', 'gb2312']:
                pass
            else:
                print(f"{filename} 的编码是：{encoding}")
                #shutil.copy(file_path, os.path.join("output", filename))
                #convert_to_gbk(file_path, encoding)

    if not found_txt:
        print("指定的目录中没有找到 txt 文件")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='检测指定目录下所有 txt 文件的编码类型')
    parser.add_argument('directory', type=str, help='要检查的目录路径')

    args = parser.parse_args()

    if os.path.isdir(args.directory):
        main(args.directory)
    else:
        print("提供的路径不是一个有效的目录")
