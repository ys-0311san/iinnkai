# 名刺ジェネレーター

ローカルでフォームを開き、写真・セリフ・名前・Xアカウントを入力して、印刷用CMYK PDFをダウンロードするためのツールです。

## 起動方法

```sh
cd print-card
python3 -m venv .venv   # 既存の.venvがあれば流用可
. .venv/bin/activate
pip install -r requirements.txt
python generator/app.py
```

起動後、ブラウザで `http://localhost:5000/` を開いてフォームに入力し、送信すると名刺のCMYK PDFがそのままダウンロードされます。
