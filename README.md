# 命の時計

生年月日から平均寿命・目標寿命までをカウントダウンし、夢リストを年齢に紐づけて管理するアプリ。
Upstash Redisにデータを保存するので、スマホ・PCなど複数端末で同じ内容が見られます。

## セットアップ手順

1. **GitHubリポジトリを作る**
   - このフォルダの中身をそのまま新しいリポジトリにpush

2. **Upstash Redisを用意する**（Yahoo Auction Watcherと同じもので流用可）
   - すでに使っているUpstash DBがあれば、それを使い回してOK（キーが `inochi-no-tokei:state` なので他のアプリと衝突しません）
   - 新規の場合は https://upstash.com でRedis DBを作成し、REST URLとREST TOKENを控える

3. **Vercelにインポート**
   - GitHubリポジトリをVercelでインポート
   - Project Settings → Environment Variables に以下を追加：
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
   - Deploy

4. 以降はコミットするたびに自動デプロイ（いつもの流れ）

## メモ

- 初回アクセス時はデフォルト値（1980/8/31生まれ、平均寿命81.09歳、目標100歳）が表示されます。設定（⚙）から自分の値に変更してください。
- 平均寿命の数値は「平均寿命」より「現在の年齢時点での平均余命」の方が正確です（厚労省の簡易生命表で調べられます）。
- 今は誰でもアクセスできればデータが見える/書き換えられる作りです（1人で使う前提）。他の人に見られたくない場合はVercelの「Password Protection」機能や簡単なBasic認証を足すのがおすすめです。
