# 仕様書: VRChat 向け宣言的ワールド構築ツール（resoloop の VRChat 版）

> **このドキュメントはメスケモ推進委員会サイト本体とは独立した調査・設計メモです。**
> 発端: [orange3134/resoloop](https://github.com/orange3134/resoloop)（AI エージェントから Resonite ワールドを操作する CLI）を
> VRChat 仕様に変更できるか、また VRChat の規約上問題ないか、という検討。
>
> 調査日: 2026-09-07 / 調査時点の VRChat SDK: 3.10.4

---

## 0. 結論サマリ

| 問い | 答え |
|---|---|
| resoloop をそのまま VRChat に移植できるか | **不可能。かつ規約違反になる。** |
| 設計思想を移した別ツールなら作れるか | **作れる。しかも規約上クリーンな範囲で成立する。** |
| ビルド／アップロードの自動化は怒られないか | **怒られない。** VRChat が Public SDK API を公開しており、ツール作者の存在を公式に前提としている |
| 実行中ワールドの検証ループは再現できるか | **8割方できる。** `Build & Reload` + `--watch-worlds` + ClientSim で代替 |

**移植不能な理由**は一点だけ。resoloop の心臓は **ResoniteLink**（＝実行中のワールドを外部から観測・編集できる公式 WebSocket API）であり、**VRChat には同等物が存在しない**。そして、それを無理に実現しようとすると必然的にクライアント改造（Modified Client）に踏み込み、Easy Anti-Cheat による BAN 対象になる。

---

## 1. resoloop の構造と、VRChat への対応可否

resoloop のループは `観測 → 実装 → 適用 → 検証 → 解析 → 修正`。段階ごとに VRChat 側の対応可否を整理する。

| resoloop の段階 | Resonite での実現手段 | VRChat での対応 | 可否 |
|---|---|---|---|
| 観測（hierarchy / find / inspect） | ResoniteLink 経由で実行中ワールドを読む | Unity シーングラフを Editor 拡張がダンプ | △ 実行中ではなく Editor 上 |
| 実装（宣言 JSON を書く） | `content/*.json` | 同じ発想がそのまま使える | ◎ |
| 適用（apply / diff / prune） | ResoniteLink 経由で実行中ワールドへ反映 | Editor 拡張がシーン／プレハブを生成・差分適用 | ○ 対象が実行中ワールドではない |
| 検証（validate / capture / test） | Reflection・InteractiveCamera・test 実行 | SDK バリデーション + ClientSim + Game View キャプチャ | ○ |
| ProtoFlux（Flux-SDK build / hot deploy） | `.pg` ソースをビルドしてホットデプロイ | Udon / UdonSharp（C# テキスト。AI にはむしろ書きやすい） | ◎ ただしホットデプロイ不可 |
| **実行中ワールドへの直接介入** | ResoniteLink | **公式手段なし。実装すれば BAN** | **✕** |

---

## 2. 規約調査の結果

### 2.1 4段階の切り分け

| 段階 | 内容 | 判定 |
|---|---|---|
| ① ローカル制作の自動化 | Unity + SDK3 でのシーン生成、Udon 記述、SDK バリデーション実行 | **完全にセーフ**（自分の PC での制作作業であり規約の管轄外） |
| ② SDK 経由のビルド／アップロード | Public SDK API の `BuildAndUpload` / `Build & Test` を Editor スクリプトから呼ぶ | **セーフ**（公式が想定・案内している使い方） |
| ③ 非公式 Web API 直叩き | `api.vrchat.cloud` を自前 HTTP で叩いてアップロードや一覧取得 | **グレー。避ける** |
| ④ クライアント介入 | 改造クライアント、メモリ読み書き、プロセスへの注入 | **完全にアウト（BAN）** |

### 2.2 根拠

**② が白である根拠**（今回の調査で最も重要な発見）

VRChat SDK には **Public SDK API** という公開インターフェース群がある。ワールド／アバター両 SDK の `Editor/VRCSDK/.../Public SDK API` に配置され、以下が提供される。

- SDK パネルの `OnEnable` / `OnDisable` イベント
- Build Start / End イベント
- Upload Success / Error イベント
- **Build / Build and Test / Build and Upload メソッド**

ワールドの場合は `VRCSdkControlPanel.TryGetBuilder<IVRCSdkWorldBuilderApi>(out var builder)` でビルダーを取得し、`await builder.BuildAndUpload(worldData)` を呼ぶ。

さらに SDK 3.9.0 のリリースノートには、コンテンツ ID 採番方式の変更に際して次の記述がある。

> If you only use the SDK via the built-in UI (the VRChat SDK Control Panel), nothing changes for you.
> **If you're a tool author or technical user, keep reading!**
>
> - For tools that use the VRChat SDK's native `BuildAndUpload` method: ...
> - For tools that manually call the `Build` and `Upload` methods: You need to reserve a new ID on our API via the `VRCApi.CreateAvatarRecord` method.

つまり VRChat は「SDK を叩く外部ツール」の存在を明確に認識し、破壊的変更の移行案内まで出している。**この経路を使う限り、自動化そのものが咎められる理由はない。**

ただし公式の但し書きもある。

> We're going to make our best effort to provide a stable API, but it's still subject to change in the future.
> We recommend leveraging semver to define which version of the SDK your tools are compatible with.

**③ を避けるべき根拠**

コミュニティ製 API ライブラリ（vrchatapi）に記載されている VRChat 公式チームの声明:

> "Use of the API using applications other than the approved methods (website, VRChat application) are not officially supported."

加えて実運用上の制約として、クエリは 60 秒に 1 回以上の頻度で送らないこと、User-Agent に連絡先を含めること、過度な利用はアカウント削除につながりうること、が案内されている。アバター／ワールド管理を外部ツールから API 経由で行うことはガイドライン違反と解釈される記述もある。**SDK が同じことを提供している以上、③ を選ぶ理由がない。**

**④ が明確にアウトである根拠**

VRChat の ToS はクライアント／SDK の改変・逆コンパイル・リバースエンジニアリングを禁止し、Easy Anti-Cheat が RAM・プロセス・通信・ファイルストレージを監視して Modified Client を検出、BAN すると明記している。

### 2.3 ライセンス

resoloop は **AGPL-3.0-or-later**。フォークして VRChat 版を作り配布する場合、派生物も AGPL での公開義務が生じる。加えて VRChat SDK は独自ライセンスで再配布に制限があるため、両者を混ぜた配布物は要注意。

**そもそも resoloop の実装の大半は ResoniteLink の WebSocket プロトコル対応と Resonite 型システムへのマッピングであり、VRChat 版に流用できるコードはほぼない。**フォークではなくゼロから作る方が、技術的にもライセンス的にも素直。

---

## 3. VRChat 側で使える公式の足場

| 機能 | 内容 | 本ツールでの用途 |
|---|---|---|
| **Public SDK API** | `TryGetBuilder<IVRCSdkWorldBuilderApi>` / `BuildAndUpload` / `OnSdkBuildStart` / `OnSdkBuildEnd` / Upload Success・Error イベント | ビルド・アップロードの自動化、進捗と失敗の機械可読な取得 |
| **Build Pipeline Callbacks** | `IVRCSDKBuildRequestedCallback`（`false` を返すとビルド中断）、`IPreprocessCallbackBehaviour`、`IEditorOnly` | 生成物の前処理、独自バリデーションでのビルド差し止め |
| **Build & Test** | ローカルビルドして実 VRChat クライアントを起動。複数クライアント同時起動も可 | 実機での動作確認、同期・ネットワーク挙動の検証 |
| **Build & Reload + `--watch-worlds`** | クライアント数を 0 にすると Build & Test が Build & Reload に変わり、**起動済みクライアントを新ビルドの新インスタンスへ移動**。VRChat の起動シーケンスを丸ごと省略 | **反復ループの主力。resoloop の「動いたまま反映」に最も近い** |
| **ClientSim** | Worlds SDK 同梱。Unity PlayMode で VRChat 挙動を再現。Pickup / Interact / UI / Station、Udon 変数の Play Mode 検査、リモートプレイヤー生成、PlayerData（永続化）デバッグ | **自動検証の主戦場。VRChat を起動せず回せる** |
| **VCC / VPM** | パッケージ管理。CLI あり | 環境の再現性確保、SDK バージョン固定 |

### 3.1 押さえるべき制約

- **`TryGetBuilder` は SDK Control Panel が開いていないと `false` を返す。** → 完全ヘッドレスな CI は成立しない。**Unity Editor 常駐が前提**。
- **ClientSim はローカルプレイヤーのみシミュレートする。** スポーンさせたリモートプレイヤーに対して `OnDeserialization` は発火しない。同期周りの最終確認は実機（Build & Test の複数クライアント）が必須。
- 公式ドキュメントも「Always test your world in VRChat before making it public!」と明記。ClientSim は全機能を再現しない。

### 3.2 参考: `--watch-worlds` の起動例

```
VRChat.exe --watch-worlds --profile=0 --no-vr --enable-debug-gui --enable-sdk-log-levels --enable-udon-debug-logging -screen-width 1920 -screen-height 1080
```

---

## 4. 提案アーキテクチャ

```
AI エージェント（Claude Code / Codex）
  │  自然言語の依頼を受け、宣言ファイルを書く
  ▼
content/*.json ＋ udon/*.cs        ← Git 管理。これが唯一の真実
  │
  ▼  CLI（薄いフロント）が Unity Editor へコマンドを渡す
     （ファイル監視 or named pipe でコマンドキューを実現）
  │
  ▼
Unity Editor 拡張（本体）
  ├─ inspect : シーングラフ → JSON ダンプ
  ├─ apply   : 宣言 JSON → GameObject 階層・Component・VRC Component を生成／差分適用
  ├─ validate: SDK バリデーション ＋ 自前スキーマ検証（IVRCSDKBuildRequestedCallback で差し止め）
  ├─ test    : ClientSim を PlayMode で起動 → 自動アサーション ＋ Game View キャプチャ
  └─ build   : Public SDK API の Build & Test / Build & Reload / BuildAndUpload
  │
  ▼
検証結果 JSON（成否・エラーコード・スクリーンショットのパス）
  │
  ▼
AI が読んで次の修正を宣言ファイルに書く（ループへ戻る）
```

**設計上の要点**

- resoloop 同様、**CLI の出力は必ず `--json` で機械可読にする**。AI が読むのは JSON であって Unity のコンソールログではない。
- **CLI 本体は薄く保ち、実処理は Unity Editor 拡張に置く。** Unity の外からシーンを直接いじる手段はないため。
- **生成物には管理境界（ownership root）を必ず持たせる。** ツールが管理する範囲を明示し、その外は絶対に触らない。resoloop の `ownership.key` と同じ思想。
- **`prune`（不要物の削除）は必ず明示的な確認を挟む。** 誤って人間の手作業を消さないこと。

---

## 5. resoloop コマンドとの対応

| resoloop | VRChat 版での対応 | 備考 |
|---|---|---|
| `resoloop init` | プロジェクト雛形 + `.claude/skills/` + `AGENTS.md` / `CLAUDE.md` 生成 | Unity プロジェクトと VPM 依存も同時に用意 |
| `resoloop doctor` | Unity バージョン / SDK バージョン / ClientSim 有無 / VRChat.exe パス / SDK パネルの開閉状態を確認 | `TryGetBuilder` が通るかが最重要チェック |
| `resoloop hierarchy` / `find` / `inspect` | シーングラフのダンプ、Component とプロパティの検査 | 深さ制限は必須（Unity のシーンは巨大になりうる） |
| `resoloop type search` / `describe` | VRC Component と Unity Component のリフレクション情報提供 | AI が型名を推測しないための土台 |
| `resoloop validate` / `diff` | 自前スキーマ検証 + SDK バリデーション + 差分表示 | 適用前に必ず通す |
| `resoloop apply` | 宣言 JSON をシーンへ適用 | stable key による参照解決 |
| `resoloop capture` | Game View / SceneView / ClientSim のスクリーンショット | AI が画像を見て判断する |
| `resoloop test` | ClientSim + Unity Test Framework の PlayMode テスト | |
| `resoloop flux build/deploy` | Udon / UdonSharp のコンパイルと検証 | ホットデプロイは不可。ビルドし直しになる |
| （相当なし） | `build --test` / `build --reload` / `build --upload` | Public SDK API 経由 |

---

## 6. 宣言ファイル仕様の骨子

resoloop の `content/*.json`（schema v1）の考え方をほぼそのまま流用できる。

- **`ownership.key`** — このファイルが管理する範囲のルート。ツールはこの外を書き換えない
- **stable key による参照** — `$go:key` / `$component:key` / `$member:key.MemberName` / `$asset:key`。前方参照を許可
- **`fields` と `initialFields` の分離** — 前者は常に収束させる設定値、後者はランタイムが書き換える初期値（再適用で消さない）
- **出力先の選択** — シーンに直接置くか、プレハブとして書き出すか
- **Udon は別ファイル管理** — `.cs`（UdonSharp）を独立ファイルとして持ち、宣言側は参照だけを保持する。JSON に C# を埋め込まない
- **同一 GameObject に同型 Component が複数ある場合、必ず明示的な一意キーを与える**
- **差分適用が既定。削除は `--prune` を明示したときのみ**、かつ削除候補の事前提示を必須にする

---

## 7. 実装フェーズ

| Phase | 内容 | 完了条件 |
|---|---|---|
| **0** | 環境検証 | Unity + Worlds SDK + ClientSim が動き、Editor スクリプトから `TryGetBuilder<IVRCSdkWorldBuilderApi>` が成功する |
| **1** | 観測 | シーングラフを JSON でダンプできる。深さ制限・検索・Component 検査が動く |
| **2** | 適用 | 宣言 JSON から GameObject 階層と Component を生成できる。差分適用と ownership 境界が機能する |
| **3** | 検証 | SDK バリデーション連携、ClientSim 起動、Game View キャプチャ、結果の JSON 出力 |
| **4** | Udon 連携 | UdonSharp の生成・コンパイル・エラーの機械可読化 |
| **5** | 実機ループ | `Build & Reload` + `--watch-worlds` による高速反復。最後に `BuildAndUpload` |

**Phase 0 が最大の関門。**ここが通らなければ以降の設計は全て意味を失うので、他に着手する前に必ず単独で検証すること。

---

## 8. 未解決事項・リスク

- **Unity Editor 常駐が前提**。`TryGetBuilder` が SDK パネル依存のため、GitHub Actions のような純ヘッドレス CI には載せられない
- **ClientSim の再現度に限界がある**。リモートプレイヤーの `OnDeserialization` が発火しないため、同期処理の検証は実機頼み。「ClientSim で通った」を完了条件にしてはいけない
- **Public SDK API は "subject to change"**。semver で対応 SDK バージョンを明示的に固定する
- **AI 生成物であることを示す仕組みが VRChat 側にない**。Resonite の `FrooxEngine.AI_GeneratedContent` タグに相当するものが存在しないため、必要なら説明欄への自主記載など運用でカバーする
- **アップロードの自動化は技術的には可能でも、慎重に**。誤って公開ワールドを壊す事故のリスクがあるため、`--upload` は常に明示的な確認を挟む設計にする

---

## 9. 参考リンク

- [orange3134/resoloop](https://github.com/orange3134/resoloop) — 元になった Resonite 向け CLI（AGPL-3.0-or-later）
- [Public SDK API | VRChat Creation](https://creators.vrchat.com/sdk/public-sdk-api/)
- [Build Pipeline Callbacks and Interfaces | VRChat Creation](https://creators.vrchat.com/sdk/build-pipeline-callbacks-and-interfaces/)
- [Release 3.9.0 | VRChat Creation](https://creators.vrchat.com/releases/release-3-9-0/) — ツール作者向けの ID 採番変更案内
- [vrchat-community/creator-docs](https://github.com/vrchat-community/creator-docs) — 上記ドキュメントの原典（公式ドメインが閲覧できない環境ではこちらを参照）
- [ClientSim | VRChat Creation](https://creators.vrchat.com/worlds/clientsim/)
- [Using Build & Test | VRChat Creation](https://creators.vrchat.com/worlds/udon/using-build-test/) — Build & Reload と `--watch-worlds`
- [Creator Companion (VCC / VPM)](https://vcc.docs.vrchat.com/)
- [Terms of Service — VRChat](https://hello.vrchat.com/legal)
- [Community Guidelines — VRChat](https://hello.vrchat.com/community-guidelines)
- [vrchatapi/vrchatapi-python](https://github.com/vrchatapi/vrchatapi-python) — 非公式 Web API ライブラリ。公式サポート外である旨の記載あり
