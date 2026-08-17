#!/usr/bin/env python3
"""
イキリンコ・イワンコ・カラナクシ・ケンタロス(パルデア)・シャリタツ・バスラオ・フラベベ・メテノ・バケッチャの
「姿違い」(リージョンフォームとは異なる、色/サイズ/個体差によるすがた違い)を
src/data/pokemonMaster.json に新規行として追加する。

gameTitlesはgamepedia.jp等のwiki調査(ブラウザ経由)に基づき個別に設定。
spriteId・hiddenAbility・eggGroups・hatchStepsはPokeAPI(ブラウザ経由、pokeapi.co)から取得した値を使用。
"""
import json

MASTER_PATH = "src/data/pokemonMaster.json"

with open(MASTER_PATH, encoding="utf-8") as f:
    master = json.load(f)

by_id = {e["id"]: e for e in master}


def update(id_, **kwargs):
    e = by_id[id_]
    e.update(kwargs)


def add(id_, national_no, name, form_name, egg_groups, hatch_steps, hidden_ability, game_titles, sprite_id):
    if id_ in by_id:
        raise SystemExit(f"id already exists: {id_}")
    entry = {
        "id": id_,
        "nationalNo": national_no,
        "name": name,
        "formName": form_name,
        "eggGroups": egg_groups,
        "hatchSteps": hatch_steps,
        "hiddenAbility": hidden_ability,
        "gameTitles": game_titles,
        "spriteId": sprite_id,
    }
    master.append(entry)
    by_id[id_] = entry


# ============================================================
# イキリンコ (Squawkabilly) - 4色。全色ラベル付け(既存のグリーンにも付与)
# ============================================================
SV_ZA = ["スカーレット", "バイオレット", "Legends ZA"]
update("squawkabilly-green-plumage", formName="グリーンフェザー")
add("squawkabilly-blue-plumage", 931, "イキリンコ", "ブルーフェザー",
    ["ひこう"], 4080, "こんじょう", SV_ZA, 10260)
add("squawkabilly-yellow-plumage", 931, "イキリンコ", "イエローフェザー",
    ["ひこう"], 4080, "ちからずく", SV_ZA, 10261)
add("squawkabilly-white-plumage", 931, "イキリンコ", "ホワイトフェザー",
    ["ひこう"], 4080, "ちからずく", SV_ZA, 10262)

# ============================================================
# イワンコ (Rockruff) - 通常(既存・formNameはnullのまま) / マイペース(新規)
# マイペース個体はスプライトも別ID(10151)が存在するが見た目は同じ。
# サン・ムーンには「マイペース」個体は存在しない(ウルトラサン・ムーンで追加)。
# ============================================================
add("rockruff-own-tempo", 744, "イワンコ", "マイペース",
    ["りくじょう"], 4080, None,
    ["ウルトラサン", "ウルトラムーン", "ソード", "シールド", "スカーレット", "バイオレット"], 10151)

# ============================================================
# カラナクシ (Shellos) - 西の海(既存) / 東の海(新規)
# 東の海のスプライトはPokeAPI上「422-east」という非数値IDのため、spriteIdに文字列を許容する必要がある。
# ダイヤモンド=西の海限定、パール=東の海限定(既存データはこの区別が無かったため合わせて修正)。
# プラチナ・ブリリアントダイヤモンド/シャイニングパール・ウルトラサン/ムーン・ソード/シールド・SV・
# Legendsアルセウスは両方の海が入手可能(実機・wiki記載に基づく)。
# ※ブリリアントダイヤモンド/シャイニングパールについては既存データに未反映だった漏れも合わせて補完。
# ============================================================
update(
    "shellos",
    formName="にしのうみ",
    gameTitles=["ダイヤモンド", "プラチナ", "ブリリアントダイヤモンド", "ウルトラサン", "ウルトラムーン",
                "ソード", "シールド", "スカーレット", "バイオレット", "Legends アルセウス"],
)
add(
    "shellos-east", 422, "カラナクシ", "ひがしのうみ",
    ["すいちゅう1", "ふていけい"], 5355, "すなのちから",
    ["パール", "プラチナ", "シャイニングパール", "ウルトラサン", "ウルトラムーン",
     "ソード", "シールド", "スカーレット", "バイオレット", "Legends アルセウス"],
    "422-east",
)

# ============================================================
# ケンタロス(パルデアのすがた) - 通常(かくとう)/ほのお/みず の3種。全て新規追加。
# 既存の「ケンタロス」(formName無し)はカントー地方の通常種であり、SVには登場しないため
# gameTitlesから誤って入っていた「スカーレット」「バイオレット」を除去する。
# ほのお=スカーレット限定、みず=バイオレット限定(gamepedia.jpのバージョン限定一覧で確認済み)。
# ============================================================
tauros = by_id["tauros"]
tauros["gameTitles"] = [t for t in tauros["gameTitles"] if t not in ("スカーレット", "バイオレット")]

add("tauros-paldea-combat-breed", 128, "ケンタロス", "パルデアのすがた(かくとう)",
    ["りくじょう"], 5355, "はんすう", ["スカーレット", "バイオレット"], 10250)
add("tauros-paldea-blaze-breed", 128, "ケンタロス", "パルデアのすがた(ほのお)",
    ["りくじょう"], 5355, "はんすう", ["スカーレット"], 10251)
add("tauros-paldea-aqua-breed", 128, "ケンタロス", "パルデアのすがた(みず)",
    ["りくじょう"], 5355, "はんすう", ["バイオレット"], 10252)

# ============================================================
# シャリタツ (Tatsugiri) - そった(既存)/たれた/のびた。全てSV+Legends ZA。
# ============================================================
update("tatsugiri-curly", formName="そったすがた")
add("tatsugiri-droopy", 978, "シャリタツ", "たれたすがた",
    ["すいちゅう2"], 9180, "よびみず", SV_ZA, 10258)
add("tatsugiri-stretchy", 978, "シャリタツ", "のびたすがた",
    ["すいちゅう2"], 9180, "よびみず", SV_ZA, 10259)

# ============================================================
# バスラオ (Basculin) - あかすじ(既存)/あおすじ(新規)/しろすじ(新規)
# 第5世代ではブラック=あおすじ限定、ホワイト=あかすじ限定(既存データはこの区別が無かったため修正)。
# しろすじはLegendsアルセウスで新登場、その後SV(スカーレット・バイオレット)にも登場。
# ============================================================
update(
    "basculin-red-striped",
    formName="あかすじのすがた",
    gameTitles=["ホワイト", "ホワイト2", "X", "Y", "ウルトラサン", "ウルトラムーン",
                "ソード", "シールド", "スカーレット", "バイオレット", "Legends アルセウス"],
)
add(
    "basculin-blue-striped", 550, "バスラオ", "あおすじのすがた",
    ["すいちゅう2"], 10455, "かたやぶり",
    ["ブラック", "ブラック2", "X", "Y", "ウルトラサン", "ウルトラムーン",
     "ソード", "シールド", "スカーレット", "バイオレット", "Legends アルセウス"],
    10016,
)
add(
    "basculin-white-striped", 550, "バスラオ", "しろすじのすがた",
    ["すいちゅう2"], 10455, "かたやぶり",
    ["Legends アルセウス", "スカーレット", "バイオレット"],
    10247,
)

# ============================================================
# フラベベ (Flabébé) - あか(既存)/きいろ/オレンジ/あお/しろ。全色同じgameTitles。
# PokeAPI上は色違いが「フォルム」(スプライトのみ異なるコスメティック差)扱いのため、
# スプライトIDが「669-yellow」のような非数値の文字列になる。
# ============================================================
FLABEBE_TITLES = ["X", "Y", "ウルトラサン", "ウルトラムーン", "スカーレット", "バイオレット", "Legends ZA"]
update("flabebe", formName="あかいはな")
add("flabebe-yellow", 669, "フラベベ", "きいろのはな", ["ようせい"], 5355, "きょうせい", FLABEBE_TITLES, "669-yellow")
add("flabebe-orange", 669, "フラベベ", "オレンジいろのはな", ["ようせい"], 5355, "きょうせい", FLABEBE_TITLES, "669-orange")
add("flabebe-blue", 669, "フラベベ", "あおいはな", ["ようせい"], 5355, "きょうせい", FLABEBE_TITLES, "669-blue")
add("flabebe-white", 669, "フラベベ", "しろいはな", ["ようせい"], 5355, "きょうせい", FLABEBE_TITLES, "669-white")

# ============================================================
# メテノ (Minior) - 7色(赤/橙/黄/緑/水色/青/紫)。隕石(コア未破壊)の姿のみ対象。
# 色は個体ごとにランダムでバージョン差は無い。既存の「あか」以外6色を追加。
# ============================================================
MINIOR_TITLES = ["サン", "ムーン", "ウルトラサン", "ウルトラムーン", "スカーレット", "バイオレット"]
update("minior-red-meteor", formName="あか")
add("minior-orange-meteor", 774, "メテノ", "だいだい", ["こうぶつ"], 6630, None, MINIOR_TITLES, 10130)
add("minior-yellow-meteor", 774, "メテノ", "きいろ", ["こうぶつ"], 6630, None, MINIOR_TITLES, 10131)
add("minior-green-meteor", 774, "メテノ", "みどり", ["こうぶつ"], 6630, None, MINIOR_TITLES, 10132)
add("minior-blue-meteor", 774, "メテノ", "みずいろ", ["こうぶつ"], 6630, None, MINIOR_TITLES, 10133)
add("minior-indigo-meteor", 774, "メテノ", "あお", ["こうぶつ"], 6630, None, MINIOR_TITLES, 10134)
add("minior-violet-meteor", 774, "メテノ", "むらさき", ["こうぶつ"], 6630, None, MINIOR_TITLES, 10135)

# ============================================================
# バケッチャ (Pumpkaboo) - こだましゅ/ちゅうだましゅ(既存)/おおだましゅ/ギガだましゅ
# サイズは個体ごとにランダムでバージョン差は無い。
# ============================================================
PUMPKABOO_TITLES = ["X", "Y", "ソード", "シールド", "Legends ZA"]
update("pumpkaboo-average", formName="ちゅうだましゅ")
add("pumpkaboo-small", 710, "バケッチャ", "こだましゅ", ["ふていけい"], 5355, "ふみん", PUMPKABOO_TITLES, 10027)
add("pumpkaboo-large", 710, "バケッチャ", "おおだましゅ", ["ふていけい"], 5355, "ふみん", PUMPKABOO_TITLES, 10028)
add("pumpkaboo-super", 710, "バケッチャ", "ギガだましゅ", ["ふていけい"], 5355, "ふみん", PUMPKABOO_TITLES, 10029)

with open(MASTER_PATH, "w", encoding="utf-8") as f:
    json.dump(master, f, ensure_ascii=False, indent=2)

print(f"total entries: {len(master)}")
