import os
import re

def remove_strings(filename):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    content = re.sub(
        r'<\/p><p style="visibility: visible;">|<\/p><p>|<br><\/p><p style="display: none;"><mp-style-type data-value="3"><\/mp-style-type><\/p><\/div>',
        "",
        content,
    )
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

files = [f for f in os.listdir(".") if os.path.isfile(f) and f.endswith(".txt")]

for filename in files:
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    with open(filename, "w", encoding="utf-8") as f:
        content = content.replace("\u3000\u3000", "\n")
        f.write(content)
    with open(filename, "r", encoding="utf-8") as f:
        lines = f.readlines()
    with open(filename, "w", encoding="utf-8") as f:
        f.writelines(lines[2:])
    remove_strings(filename)
