import pandas as pd

# 读取CSV文件
df = pd.read_csv('Download.CSV', encoding='utf-8-sig')

# 定义要搜索的字符串
specific_string = 'COGNOSPHERE PTE. LTD.'

# 过滤出含有指定字符串的行
filtered_df = df[df['名前'].str.contains(specific_string, na=False)]

# 显示过滤后的DataFrame
print(filtered_df)

# 可选：将过滤后的DataFrame保存到新的CSV文件
filtered_df.to_csv('filtered_data.csv', index=False, encoding='utf-8-sig')
