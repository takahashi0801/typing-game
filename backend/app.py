from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import random, json, os

app = Flask(
    __name__,
    static_folder="../frontend",
    static_url_path=""
)
CORS(app)

# フレーズデータ読み込み
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "phrases.json")
with open(DATA_PATH, encoding="utf-8") as f:
    ALL_PHRASES = json.load(f)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/phrase")
def get_phrase():
    # クエリで難易度取得（default=easy）
    difficulty = request.args.get("difficulty", "easy")
    # 該当難易度のリストを抽出
    filtered = [p for p in ALL_PHRASES if p.get("difficulty") == difficulty]
    if not filtered:
        return jsonify({
            "text": "No phrase available.",
            "translation": "該当するフレーズがありません。",
            "romaji": "",
            "difficulty": difficulty
        })
    return jsonify(random.choice(filtered))

if __name__ == "__main__":
    app.run(debug=True)
