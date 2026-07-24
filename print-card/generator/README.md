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

## Renderへのデプロイ

このジェネレーターはRenderのFreeプランにデプロイして、URLひとつで共有できます。リポジトリルートの `render.yaml` をRender Blueprintとして使う構成です。

1. GitHubにこのリポジトリをpushします。
2. Renderのダッシュボードで **New** から **Blueprint** を選びます。
3. このGitHubリポジトリを接続します。
4. `render.yaml` が読み込まれたら、内容を確認して作成します。
5. デプロイ完了後に表示されるURLをメンバーに共有します。

Render Freeプランでは、15分ほどアクセスがないとサービスがスリープします。スリープ後の初回アクセスでは、起動とフォント準備のため表示まで数十秒かかる場合があります。
