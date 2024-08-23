import git
import os
import re

def filter_commits(search_string):
    # 使用当前目录作为仓库路径
    repo_path = os.getcwd()

    # 检查当前目录是否是 Git 仓库
    if not os.path.exists(os.path.join(repo_path, '.git')):
        print(f"错误: 当前目录 {repo_path} 不是一个 Git 仓库")
        return

    # 初始化仓库
    repo = git.Repo(repo_path)

    # 获取所有提交
    commits = list(repo.iter_commits('--all'))

    # 创建不区分大小写的正则表达式模式
    pattern = re.compile(search_string, re.IGNORECASE)

    # 筛选提交
    filtered_commits = []
    for commit in commits:
        if (pattern.search(commit.author.name) or
            pattern.search(commit.author.email) or
            pattern.search(commit.message)):
            filtered_commits.append(commit)

    # 打印筛选结果
    if filtered_commits:
        print(f"找到 {len(filtered_commits)} 个包含 '{search_string}' 的提交 (不区分大小写):")
        for commit in filtered_commits:
            print(f"提交: {commit.hexsha}")
            print(f"作者: {commit.author.name} <{commit.author.email}>")
            print(f"日期: {commit.authored_datetime}")
            print(f"消息: {commit.message.strip()}")
            print("-" * 40)
    else:
        print(f"没有找到包含 '{search_string}' 的提交 (不区分大小写)")

if __name__ == "__main__":
    search_string = input("请输入要搜索的字符串: ")
    filter_commits(search_string)
