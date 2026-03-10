// @ts-nocheck
import { useState, useEffect, useMemo } from "react";

const RECORDS_KEY = "br_records";
const OPTIONS_KEY = "br_options";
const LASTDECK_KEY = "br_lastdeck";
const LASTRANK_KEY = "br_lastrank";

function migrateStorage() {
  var oldRecordsKeys = ["br_records_v4", "br_records_v3", "br_records_v2"];
  var oldOptionsKeys = ["br_options_v4", "br_options_v3", "br_options_v2"];
  var oldDeckKeys = ["br_lastdeck_v4", "br_lastdeck_v3", "br_lastdeck_v2"];
  var oldRankKeys = ["br_lastrank_v4", "br_lastrank_v3", "br_lastrank_v2"];
  function migrate(newKey, oldKeys) {
    if (localStorage.getItem(newKey)) return;
    for (var i = 0; i < oldKeys.length; i++) {
      var val = localStorage.getItem(oldKeys[i]);
      if (val) {
        localStorage.setItem(newKey, val);
        return;
      }
    }
  }
  migrate(RECORDS_KEY, oldRecordsKeys);
  migrate(OPTIONS_KEY, oldOptionsKeys);
  migrate(LASTDECK_KEY, oldDeckKeys);
  migrate(LASTRANK_KEY, oldRankKeys);
}

const DEFAULT_OPTIONS = {
  myDecks: ["白き森", "VSK9", "ドラゴンテイル", "リシド", "天盃龍", "青眼"],
  oppDecks: [
    "VSK9",
    "ヤミー",
    "巳剣",
    "ドラゴンテイル",
    "リシド",
    "月光",
    "MALICE",
    "ライゼオル",
    "閃刀姫",
    "ジェムナイト",
    "白き森",
    "スネークアイ",
    "ティアラメンツ",
    "ラビュリンス",
  ],
  reasons: [
    "easy win",
    "ドロー誘発",
    "手札事故",
    "うらら",
    "泡",
    "ニビル",
    "展開成功",
  ],
  oppRanks: ["M1", "M2", "M3", "M4", "M5", "D1", "D2", "D3", "D4", "D5"],
};

const RESULT_OPTIONS = ["勝", "負"];
const TURN_OPTIONS = ["先行", "後攻"];

const PALETTE = [
  "#5b9cf6",
  "#f87171",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#4ade80",
  "#f472b6",
];

function makeForm(myDeck, oppRank) {
  return {
    date: new Date().toISOString().slice(0, 16),
    myDeck: myDeck || "",
    opponent: "",
    oppDeck: "",
    oppRank: oppRank || "",
    result: "勝",
    turn: "先行",
    reasons: [],
    comment: "",
  };
}

/* ── CSV Export ───────────────────────────────────────────── */
function exportCSV(records) {
  var headers = [
    "日時",
    "My構築",
    "対戦相手",
    "相手構築",
    "相手ランク",
    "勝敗",
    "先後",
    "勝因敗因",
    "コメント",
  ];
  var rows = records.map(function (r) {
    return [
      r.date.replace("T", " "),
      r.myDeck || "",
      r.opponent || "",
      r.oppDeck || "",
      r.oppRank || "",
      r.result || "",
      r.turn || "",
      (r.reasons || []).join(" / "),
      (r.comment || "").replace(/\n/g, " "),
    ]
      .map(function (cell) {
        var s = String(cell);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      })
      .join(",");
  });
  var bom = "\uFEFF";
  var csv = bom + [headers.join(",")].concat(rows).join("\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download =
    "battle_records_" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── FieldLabel ───────────────────────────────────────────── */
function FieldLabel(props) {
  return (
    <div
      style={{
        color: "#a0aec0",
        fontSize: "10px",
        letterSpacing: "0.15em",
        marginBottom: "6px",
      }}
    >
      {props.text}
    </div>
  );
}

/* ── Dropdown ─────────────────────────────────────────────── */
function Dropdown(props) {
  var label = props.label,
    value = props.value,
    onChange = props.onChange;
  var options = props.options,
    onAdd = props.onAdd,
    onDel = props.onDel;
  var [open, setOpen] = useState(false);
  var [draft, setDraft] = useState("");

  function pick(v) {
    onChange(v);
    setOpen(false);
  }
  function addItem() {
    if (draft.trim()) {
      onAdd(draft.trim());
      setDraft("");
    }
  }

  return (
    <div>
      <FieldLabel text={label} />
      <div
        onClick={function () {
          setOpen(!open);
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#2c313b",
          border: "1px solid #4a5060",
          borderRadius: "4px",
          color: value ? "#f0f4ff" : "#6b7585",
          padding: "10px 12px",
          fontSize: "13px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <span>{value || "選択…"}</span>
        <span style={{ color: "#6b7585", fontSize: "9px" }}>
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div style={{ position: "relative" }}>
          <div
            onClick={function () {
              setOpen(false);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 98 }}
          />
          <div
            style={{
              position: "absolute",
              top: "2px",
              left: 0,
              right: 0,
              background: "#252930",
              border: "1px solid #4a5060",
              borderRadius: "4px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
              zIndex: 99,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            <div
              onClick={function () {
                pick("");
              }}
              style={{
                padding: "9px 12px",
                color: "#6b7585",
                fontSize: "12px",
                cursor: "pointer",
                borderBottom: "1px solid #3a3f4b",
              }}
            >
              — 未選択
            </div>
            {options.map(function (opt) {
              var active = value === opt;
              return (
                <div
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: active ? "#2c3a50" : "transparent",
                    borderBottom: "1px solid #3a3f4b",
                  }}
                >
                  <span
                    onClick={function () {
                      pick(opt);
                    }}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      color: active ? "#5b9cf6" : "#e0e8f8",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {opt}
                  </span>
                  <span
                    onClick={function (e) {
                      e.stopPropagation();
                      onDel(opt);
                      if (value === opt) onChange("");
                    }}
                    style={{
                      padding: "9px 10px",
                      color: "#6b7585",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </span>
                </div>
              );
            })}
            <div
              onClick={function (e) {
                e.stopPropagation();
              }}
              style={{
                display: "flex",
                gap: "5px",
                padding: "7px",
                borderTop: "1px solid #3a3f4b",
              }}
            >
              <input
                value={draft}
                onChange={function (e) {
                  setDraft(e.target.value);
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter") addItem();
                }}
                placeholder="追加…"
                style={{
                  flex: 1,
                  background: "#1e2128",
                  border: "1px solid #4a5060",
                  color: "#f0f4ff",
                  padding: "5px 8px",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  outline: "none",
                  borderRadius: "3px",
                }}
              />
              <button
                onClick={addItem}
                style={{
                  background: "#5b9cf6",
                  border: "none",
                  color: "#ffffff",
                  padding: "5px 9px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: "3px",
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TagSelect ────────────────────────────────────────────── */
function TagSelect(props) {
  var label = props.label,
    values = props.values,
    onChange = props.onChange;
  var options = props.options,
    onAdd = props.onAdd,
    onDel = props.onDel;
  var [addOpen, setAddOpen] = useState(false);
  var [draft, setDraft] = useState("");

  function toggle(tag) {
    onChange(
      values.includes(tag)
        ? values.filter(function (v) {
            return v !== tag;
          })
        : values.concat([tag])
    );
  }
  function delTag(tag) {
    onDel(tag);
    onChange(
      values.filter(function (v) {
        return v !== tag;
      })
    );
  }
  function addTag() {
    if (draft.trim()) {
      onAdd(draft.trim());
      setDraft("");
      setAddOpen(false);
    }
  }

  return (
    <div>
      <FieldLabel text={label} />
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {options.map(function (tag) {
          var active = values.includes(tag);
          return (
            <div key={tag} style={{ display: "flex", alignItems: "stretch" }}>
              <button
                onClick={function () {
                  toggle(tag);
                }}
                style={{
                  padding: "4px 9px",
                  borderRadius: "3px 0 0 3px",
                  border: active ? "1px solid #5b9cf6" : "1px solid #4a5060",
                  borderRight: "none",
                  background: active ? "#2c3a50" : "transparent",
                  color: active ? "#5b9cf6" : "#c0cad8",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {tag}
              </button>
              <button
                onClick={function () {
                  delTag(tag);
                }}
                style={{
                  padding: "4px 5px",
                  borderRadius: "0 3px 3px 0",
                  border: active ? "1px solid #5b9cf6" : "1px solid #4a5060",
                  background: "transparent",
                  color: "#6b7585",
                  fontSize: "9px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          onClick={function () {
            setAddOpen(!addOpen);
          }}
          style={{
            padding: "4px 10px",
            borderRadius: "3px",
            border: "1px dashed #4a5060",
            background: "transparent",
            color: "#6b7585",
            fontSize: "11px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + 追加
        </button>
      </div>
      {addOpen && (
        <div style={{ display: "flex", gap: "5px", marginTop: "6px" }}>
          <input
            autoFocus
            value={draft}
            onChange={function (e) {
              setDraft(e.target.value);
            }}
            onKeyDown={function (e) {
              if (e.key === "Enter") addTag();
            }}
            placeholder="タグ名を入力…"
            style={{
              flex: 1,
              background: "#1e2128",
              border: "1px solid #4a5060",
              color: "#f0f4ff",
              padding: "6px 8px",
              fontSize: "12px",
              fontFamily: "inherit",
              outline: "none",
              borderRadius: "3px",
            }}
          />
          <button
            onClick={addTag}
            style={{
              background: "#5b9cf6",
              border: "none",
              color: "#ffffff",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: "3px",
            }}
          >
            追加
          </button>
          <button
            onClick={function () {
              setAddOpen(false);
              setDraft("");
            }}
            style={{
              background: "transparent",
              border: "1px solid #4a5060",
              color: "#a0aec0",
              padding: "6px 10px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: "3px",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* ── PieChart（ホバーツールチップ付き）────────────────────── */
function PieChart(props) {
  var data = props.data;
  var size = props.size || 120;
  var total = data.reduce(function (s, d) {
    return s + d.value;
  }, 0);
  var [hov, setHov] = useState(null);

  if (total === 0) return null;

  var cx = size / 2,
    cy = size / 2;
  var r = size / 2 - 4;
  var ir = r * 0.52;
  var startAngle = -Math.PI / 2;
  var slices = [];

  data.forEach(function (d, idx) {
    if (d.value === 0) return;
    var angle = (d.value / total) * 2 * Math.PI;
    var endAngle = startAngle + angle;
    var x1o = cx + r * Math.cos(startAngle),
      y1o = cy + r * Math.sin(startAngle);
    var x2o = cx + r * Math.cos(endAngle),
      y2o = cy + r * Math.sin(endAngle);
    var x1i = cx + ir * Math.cos(endAngle),
      y1i = cy + ir * Math.sin(endAngle);
    var x2i = cx + ir * Math.cos(startAngle),
      y2i = cy + ir * Math.sin(startAngle);
    var large = angle > Math.PI ? 1 : 0;
    var pct = Math.round((d.value / total) * 100);
    slices.push({
      path:
        "M " +
        x1o +
        " " +
        y1o +
        " A " +
        r +
        " " +
        r +
        " 0 " +
        large +
        " 1 " +
        x2o +
        " " +
        y2o +
        " L " +
        x1i +
        " " +
        y1i +
        " A " +
        ir +
        " " +
        ir +
        " 0 " +
        large +
        " 0 " +
        x2i +
        " " +
        y2i +
        " Z",
      color: d.color,
      label: d.label,
      value: d.value,
      pct: pct,
      idx: idx,
    });
    startAngle = endAngle;
  });

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size}>
        {slices.map(function (s) {
          var isHov = hov && hov.label === s.label;
          return (
            <path
              key={s.idx}
              d={s.path}
              fill={s.color}
              stroke="#1e2128"
              strokeWidth="1.5"
              opacity={hov ? (isHov ? 1 : 0.4) : 1}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={function () {
                setHov(s);
              }}
              onMouseLeave={function () {
                setHov(null);
              }}
            />
          );
        })}
      </svg>
      {/* 中央ラベル：ホバー時はそのスライス情報、通常時は総戦数 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {hov ? (
          <>
            <div
              style={{
                color: hov.color,
                fontSize: "15px",
                fontWeight: "700",
                fontFamily: "monospace",
                lineHeight: 1,
              }}
            >
              {hov.pct}%
            </div>
            <div
              style={{
                color: "#e0e8f8",
                fontSize: "8px",
                marginTop: "2px",
                maxWidth: size * 0.55,
                textAlign: "center",
                wordBreak: "break-all",
                lineHeight: 1.2,
              }}
            >
              {hov.label}
            </div>
            <div style={{ color: "#6b7585", fontSize: "8px" }}>
              {hov.value}戦
            </div>
          </>
        ) : (
          <div style={{ color: "#4a5060", fontSize: "9px" }}>{total}戦</div>
        )}
      </div>
    </div>
  );
}

/* ── RecordRow ────────────────────────────────────────────── */
function RecordRow(props) {
  var record = props.record,
    onDelete = props.onDelete,
    onEdit = props.onEdit;
  var [open, setOpen] = useState(false);
  var isWin = record.result === "勝";

  return (
    <div style={{ borderBottom: "1px solid #3a3f4b" }}>
      <div
        onClick={function () {
          setOpen(!open);
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr auto 24px",
          gap: "8px",
          padding: "11px 14px",
          cursor: "pointer",
          alignItems: "center",
          background: open ? "#252930" : "transparent",
        }}
      >
        <div
          style={{
            color: "#6b7585",
            fontSize: "10px",
            fontFamily: "monospace",
          }}
        >
          {record.date.replace("T", " ")}
        </div>
        <div
          style={{
            fontSize: "12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {record.myDeck ? (
            <span style={{ color: "#5b9cf6", marginRight: "4px" }}>
              {record.myDeck}
            </span>
          ) : null}
          <span style={{ color: "#6b7585" }}>vs </span>
          <span style={{ color: "#e0e8f8" }}>{record.opponent || "—"}</span>
          {record.oppDeck ? (
            <span style={{ color: "#a0aec0" }}> ({record.oppDeck})</span>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {record.turn ? (
            <span
              style={{
                fontSize: "10px",
                padding: "1px 5px",
                borderRadius: "3px",
                color: record.turn === "先行" ? "#93c5fd" : "#fdba74",
                border:
                  record.turn === "先行"
                    ? "1px solid #93c5fd44"
                    : "1px solid #fdba7444",
              }}
            >
              {record.turn}
            </span>
          ) : null}
          {record.oppRank ? (
            <span
              style={{
                fontSize: "10px",
                padding: "1px 5px",
                borderRadius: "3px",
                color: "#a78bfa",
                border: "1px solid #a78bfa44",
              }}
            >
              {record.oppRank}
            </span>
          ) : null}
          <span
            style={{
              color: isWin ? "#4ade80" : "#f87171",
              fontWeight: "700",
              fontSize: "15px",
              fontFamily: "monospace",
            }}
          >
            {record.result}
          </span>
        </div>
        <div style={{ color: "#4a5060", fontSize: "10px" }}>
          {open ? "▲" : "▼"}
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 14px 13px", background: "#252930" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "10px",
            }}
          >
            <div>
              <FieldLabel text="My構築" />
              <div style={{ color: "#5b9cf6", fontSize: "13px" }}>
                {record.myDeck || "—"}
              </div>
            </div>
            <div>
              <FieldLabel text="対戦相手" />
              <div style={{ color: "#e0e8f8", fontSize: "13px" }}>
                {record.opponent || "—"}
              </div>
            </div>
            <div>
              <FieldLabel text="相手構築" />
              <div style={{ color: "#e0e8f8", fontSize: "13px" }}>
                {record.oppDeck || "—"}
              </div>
            </div>
            <div>
              <FieldLabel text="相手ランク" />
              <div style={{ color: "#a78bfa", fontSize: "13px" }}>
                {record.oppRank || "—"}
              </div>
            </div>
          </div>
          {record.reasons && record.reasons.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <FieldLabel text="勝因 / 敗因" />
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {record.reasons.map(function (r) {
                  return (
                    <span
                      key={r}
                      style={{
                        fontSize: "11px",
                        color: "#5b9cf6",
                        border: "1px solid #5b9cf640",
                        padding: "2px 7px",
                        borderRadius: "3px",
                      }}
                    >
                      {r}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {record.comment && (
            <div style={{ marginBottom: "12px" }}>
              <FieldLabel text="コメント" />
              <div
                style={{
                  color: "#c0cad8",
                  fontSize: "12px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {record.comment}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "7px" }}>
            <button
              onClick={function (e) {
                e.stopPropagation();
                onEdit(record);
              }}
              style={{
                background: "#2c313b",
                border: "1px solid #4a5060",
                color: "#e0e8f8",
                padding: "5px 14px",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: "3px",
              }}
            >
              編集
            </button>
            <button
              onClick={function (e) {
                e.stopPropagation();
                onDelete(record.id);
              }}
              style={{
                background: "transparent",
                border: "1px solid #3a3f4b",
                color: "#6b7585",
                padding: "5px 14px",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: "3px",
              }}
            >
              削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FormView ─────────────────────────────────────────────── */
function FormView(props) {
  var form = props.form,
    setForm = props.setForm;
  var onSave = props.onSave,
    onCancel = props.onCancel;
  var options = props.options,
    setOptions = props.setOptions,
    isEdit = props.isEdit;

  var inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "#2c313b",
    border: "1px solid #4a5060",
    color: "#f0f4ff",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    borderRadius: "4px",
  };

  function addOpt(key, val) {
    setOptions(function (prev) {
      if (prev[key].includes(val)) return prev;
      var next = Object.assign({}, prev);
      next[key] = prev[key].concat([val]);
      return next;
    });
  }
  function delOpt(key, val) {
    setOptions(function (prev) {
      var next = Object.assign({}, prev);
      next[key] = prev[key].filter(function (v) {
        return v !== val;
      });
      return next;
    });
  }

  return (
    <div style={{ padding: "18px 14px" }}>
      <div
        style={{
          color: "#4a5060",
          fontSize: "10px",
          letterSpacing: "0.1em",
          marginBottom: "18px",
        }}
      >
        {isEdit ? "── 記録を編集" : "── 新規記録"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <FieldLabel text="日時" />
          <input
            type="datetime-local"
            value={form.date}
            onChange={function (e) {
              setForm(function (f) {
                return Object.assign({}, f, { date: e.target.value });
              });
            }}
            style={inputStyle}
          />
        </div>

        <Dropdown
          label="My構築"
          value={form.myDeck}
          onChange={function (v) {
            setForm(function (f) {
              return Object.assign({}, f, { myDeck: v });
            });
          }}
          options={options.myDecks}
          onAdd={function (v) {
            addOpt("myDecks", v);
          }}
          onDel={function (v) {
            delOpt("myDecks", v);
          }}
        />

        <div>
          <FieldLabel text="対戦相手" />
          <input
            placeholder="相手の名前（任意）"
            value={form.opponent}
            onChange={function (e) {
              setForm(function (f) {
                return Object.assign({}, f, { opponent: e.target.value });
              });
            }}
            style={inputStyle}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <Dropdown
            label="相手構築"
            value={form.oppDeck}
            onChange={function (v) {
              setForm(function (f) {
                return Object.assign({}, f, { oppDeck: v });
              });
            }}
            options={options.oppDecks}
            onAdd={function (v) {
              addOpt("oppDecks", v);
            }}
            onDel={function (v) {
              delOpt("oppDecks", v);
            }}
          />
          <Dropdown
            label="相手ランク"
            value={form.oppRank}
            onChange={function (v) {
              setForm(function (f) {
                return Object.assign({}, f, { oppRank: v });
              });
            }}
            options={options.oppRanks}
            onAdd={function (v) {
              addOpt("oppRanks", v);
            }}
            onDel={function (v) {
              delOpt("oppRanks", v);
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            <FieldLabel text="勝敗" />
            <div style={{ display: "flex", gap: "4px" }}>
              {RESULT_OPTIONS.map(function (opt) {
                var active = form.result === opt;
                var col = opt === "勝" ? "#4ade80" : "#f87171";
                return (
                  <button
                    key={opt}
                    onClick={function () {
                      setForm(function (f) {
                        return Object.assign({}, f, { result: opt });
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "16px",
                      fontWeight: "700",
                      border: active ? "1px solid " + col : "1px solid #4a5060",
                      background: active ? col + "22" : "transparent",
                      color: active ? col : "#6b7585",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <FieldLabel text="先行 / 後攻" />
            <div style={{ display: "flex", gap: "4px" }}>
              {TURN_OPTIONS.map(function (opt) {
                var active = form.turn === opt;
                var col = opt === "先行" ? "#93c5fd" : "#fdba74";
                return (
                  <button
                    key={opt}
                    onClick={function () {
                      setForm(function (f) {
                        return Object.assign({}, f, { turn: opt });
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: "700",
                      border: active ? "1px solid " + col : "1px solid #4a5060",
                      background: active ? col + "22" : "transparent",
                      color: active ? col : "#6b7585",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <TagSelect
          label={
            (form.result === "勝" ? "勝因" : "敗因") + " タグ（複数選択可）"
          }
          values={form.reasons}
          onChange={function (v) {
            setForm(function (f) {
              return Object.assign({}, f, { reasons: v });
            });
          }}
          options={options.reasons}
          onAdd={function (v) {
            addOpt("reasons", v);
          }}
          onDel={function (v) {
            delOpt("reasons", v);
          }}
        />

        <div>
          <FieldLabel text="コメント" />
          <textarea
            placeholder="振り返り・気づき・次回への教訓など"
            value={form.comment}
            onChange={function (e) {
              setForm(function (f) {
                return Object.assign({}, f, { comment: e.target.value });
              });
            }}
            rows={4}
            style={Object.assign({}, inputStyle, {
              resize: "vertical",
              lineHeight: "1.6",
            })}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onSave}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: "4px",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              border: "none",
              background: "#5b9cf6",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            {isEdit ? "更新する" : "記録を保存"}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "13px 18px",
              background: "transparent",
              border: "1px solid #4a5060",
              color: "#a0aec0",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: "4px",
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── StatsView ────────────────────────────────────────────── */
function StatsView(props) {
  var records = props.records;
  var [deckFilter, setDeckFilter] = useState("all");
  var [vsDateFrom, setVsDateFrom] = useState("");
  var [vsDateTo, setVsDateTo] = useState("");
  var [vsRankFilter, setVsRankFilter] = useState("all");
  var [vsFilterOpen, setVsFilterOpen] = useState(false);

  // 全ランク帯の選択肢（記録から収集）
  var allRanks = useMemo(
    function () {
      var seen = {},
        list = [];
      records.forEach(function (r) {
        if (r.oppRank && !seen[r.oppRank]) {
          seen[r.oppRank] = true;
          list.push(r.oppRank);
        }
      });
      return list;
    },
    [records]
  );

  var allDecks = useMemo(
    function () {
      var seen = {},
        list = ["all"];
      records.forEach(function (r) {
        if (r.myDeck && !seen[r.myDeck]) {
          seen[r.myDeck] = true;
          list.push(r.myDeck);
        }
      });
      return list;
    },
    [records]
  );

  var fil = useMemo(
    function () {
      return deckFilter === "all"
        ? records
        : records.filter(function (r) {
            return r.myDeck === deckFilter;
          });
    },
    [records, deckFilter]
  );

  // vs内訳用フィルタ済みレコード（日付・ランク絞り込みあり）
  var vsFil = useMemo(
    function () {
      return records.filter(function (r) {
        if (vsDateFrom && r.date < vsDateFrom) return false;
        if (vsDateTo && r.date > vsDateTo + "T23:59") return false;
        if (vsRankFilter !== "all" && r.oppRank !== vsRankFilter) return false;
        return true;
      });
    },
    [records, vsDateFrom, vsDateTo, vsRankFilter]
  );

  var vsFilterActive = vsDateFrom || vsDateTo || vsRankFilter !== "all";

  var st = useMemo(
    function () {
      var total = fil.length;
      var wins = fil.filter(function (r) {
        return r.result === "勝";
      }).length;
      var wr = total > 0 ? Math.round((wins / total) * 100) : 0;
      var fList = fil.filter(function (r) {
        return r.turn === "先行";
      });
      var sList = fil.filter(function (r) {
        return r.turn === "後攻";
      });
      var fW = fList.filter(function (r) {
        return r.result === "勝";
      }).length;
      var sW = sList.filter(function (r) {
        return r.result === "勝";
      }).length;

      var streak = 0,
        sType = null;
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (!sType) {
          sType = r.result;
          streak = 1;
        } else if (r.result === sType) streak++;
        else break;
      }

      // deckSt: 全体統計（フィルタなし）
      var deckSt = {};
      records.forEach(function (r) {
        var k = r.myDeck || "未設定";
        if (!deckSt[k])
          deckSt[k] = { total: 0, wins: 0, f: 0, fW: 0, s: 0, sW: 0 };
        deckSt[k].total++;
        if (r.result === "勝") deckSt[k].wins++;
        if (r.turn === "先行") {
          deckSt[k].f++;
          if (r.result === "勝") deckSt[k].fW++;
        }
        if (r.turn === "後攻") {
          deckSt[k].s++;
          if (r.result === "勝") deckSt[k].sW++;
        }
      });

      // deckVs: vs内訳はvsFil（日付・ランクフィルタ済み）で計算
      var deckVs = {};
      vsFil.forEach(function (r) {
        var k = r.myDeck || "未設定";
        var od = r.oppDeck || "不明";
        if (!deckVs[k]) deckVs[k] = {};
        if (!deckVs[k][od]) deckVs[k][od] = { total: 0, wins: 0 };
        deckVs[k][od].total++;
        if (r.result === "勝") deckVs[k][od].wins++;
      });

      var rCount = {};
      fil.forEach(function (r) {
        (r.reasons || []).forEach(function (t) {
          rCount[t] = (rCount[t] || 0) + 1;
        });
      });
      var topR = Object.keys(rCount)
        .map(function (k) {
          return [k, rCount[k]];
        })
        .sort(function (a, b) {
          return b[1] - a[1];
        })
        .slice(0, 6);

      return {
        total: total,
        wins: wins,
        wr: wr,
        fList: fList,
        sList: sList,
        fW: fW,
        sW: sW,
        streak: streak,
        sType: sType,
        deckSt: deckSt,
        deckVs: deckVs,
        topR: topR,
      };
    },
    [fil, records, vsFil]
  );

  var sectionLabel = {
    color: "#6b7585",
    fontSize: "10px",
    letterSpacing: "0.15em",
    marginBottom: "10px",
  };
  var inputBase = {
    background: "#2c313b",
    border: "1px solid #4a5060",
    color: "#f0f4ff",
    padding: "5px 8px",
    fontSize: "11px",
    fontFamily: "inherit",
    outline: "none",
    borderRadius: "3px",
  };

  return (
    <div style={{ padding: "18px 14px" }}>
      {allDecks.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          {allDecks.map(function (d) {
            var active = deckFilter === d;
            return (
              <button
                key={d}
                onClick={function () {
                  setDeckFilter(d);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: "3px",
                  border: active ? "1px solid #5b9cf6" : "1px solid #3a3f4b",
                  background: active ? "#2c3a50" : "transparent",
                  color: active ? "#5b9cf6" : "#a0aec0",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {d === "all" ? "全体" : d}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        {[
          ["総試合", st.total, null],
          ["勝率", st.wr + "%", st.wins + "勝 " + (st.total - st.wins) + "敗"],
          records.length > 0
            ? ["連続", st.streak, st.sType === "勝" ? "連勝中" : "連敗中"]
            : null,
        ]
          .filter(Boolean)
          .map(function (box) {
            return (
              <div
                key={box[0]}
                style={{
                  background: "#2c313b",
                  border: "1px solid #3a3f4b",
                  padding: "13px 17px",
                  minWidth: "80px",
                  borderRadius: "4px",
                }}
              >
                <div
                  style={{
                    color: "#6b7585",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    marginBottom: "5px",
                  }}
                >
                  {box[0]}
                </div>
                <div
                  style={{
                    color: "#5b9cf6",
                    fontSize: "26px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    lineHeight: 1,
                  }}
                >
                  {box[1]}
                </div>
                {box[2] && (
                  <div
                    style={{
                      color: "#a0aec0",
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    {box[2]}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {st.total > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={sectionLabel}>RESULT</div>
          <div
            style={{
              height: "5px",
              background: "#3a3f4b",
              overflow: "hidden",
              display: "flex",
              borderRadius: "2px",
            }}
          >
            <div
              style={{
                width: st.wr + "%",
                background: "#4ade80",
                transition: "width 0.5s",
              }}
            />
            <div style={{ flex: 1, background: "#f87171" }} />
          </div>
          <div style={{ display: "flex", gap: "14px", marginTop: "6px" }}>
            {[
              ["#4ade80", "勝", st.wins],
              ["#f87171", "負", st.total - st.wins],
            ].map(function (c) {
              return (
                <div
                  key={c[1]}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11px",
                    color: "#a0aec0",
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      background: c[0],
                      borderRadius: "1px",
                    }}
                  />
                  {c[1]}: <span style={{ color: c[0] }}>{c[2]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {st.total > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={sectionLabel}>先行 / 後攻 勝率</div>
          {[
            ["先行", st.fW, st.fList.length],
            ["後攻", st.sW, st.sList.length],
          ].map(function (row) {
            var nm = row[0],
              w = row[1],
              t = row[2];
            var pct = t > 0 ? Math.round((w / t) * 100) : 0;
            return (
              <div key={nm} style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "3px",
                  }}
                >
                  <span style={{ color: "#c0cad8", fontSize: "12px" }}>
                    {nm}
                  </span>
                  <span
                    style={{
                      color: "#5b9cf6",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    {pct}%{" "}
                    <span style={{ color: "#6b7585" }}>
                      ({w}/{t})
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#3a3f4b",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: pct + "%",
                      height: "100%",
                      background: "#5b9cf6",
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(st.deckSt).length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          {/* 相手構築別フィルター */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div style={sectionLabel}>My構築別 分析</div>
            <button
              onClick={function () {
                setVsFilterOpen(!vsFilterOpen);
              }}
              style={{
                padding: "3px 10px",
                borderRadius: "3px",
                fontFamily: "inherit",
                fontSize: "10px",
                border: vsFilterActive
                  ? "1px solid #5b9cf6"
                  : "1px solid #3a3f4b",
                background: vsFilterActive ? "#2c3a50" : "transparent",
                color: vsFilterActive ? "#5b9cf6" : "#6b7585",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {vsFilterActive ? "● 絞込中" : "絞り込み"}{" "}
              {vsFilterOpen ? "▲" : "▼"}
            </button>
          </div>
          {vsFilterOpen && (
            <div
              style={{
                background: "#252930",
                border: "1px solid #3a3f4b",
                borderRadius: "6px",
                padding: "12px 14px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  color: "#4a5060",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  marginBottom: "10px",
                }}
              >
                円グラフ・相手構築別勝率 の絞り込み条件
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#6b7585",
                      fontSize: "10px",
                      marginBottom: "4px",
                    }}
                  >
                    日付（開始）
                  </div>
                  <input
                    type="date"
                    value={vsDateFrom}
                    onChange={function (e) {
                      setVsDateFrom(e.target.value);
                    }}
                    style={inputBase}
                  />
                </div>
                <div>
                  <div
                    style={{
                      color: "#6b7585",
                      fontSize: "10px",
                      marginBottom: "4px",
                    }}
                  >
                    日付（終了）
                  </div>
                  <input
                    type="date"
                    value={vsDateTo}
                    onChange={function (e) {
                      setVsDateTo(e.target.value);
                    }}
                    style={inputBase}
                  />
                </div>
                <div>
                  <div
                    style={{
                      color: "#6b7585",
                      fontSize: "10px",
                      marginBottom: "4px",
                    }}
                  >
                    相手ランク
                  </div>
                  <select
                    value={vsRankFilter}
                    onChange={function (e) {
                      setVsRankFilter(e.target.value);
                    }}
                    style={Object.assign({}, inputBase, { cursor: "pointer" })}
                  >
                    <option value="all">すべて</option>
                    {allRanks.map(function (rk) {
                      return (
                        <option key={rk} value={rk}>
                          {rk}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {vsFilterActive && (
                  <button
                    onClick={function () {
                      setVsDateFrom("");
                      setVsDateTo("");
                      setVsRankFilter("all");
                    }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "3px",
                      fontFamily: "inherit",
                      fontSize: "11px",
                      border: "1px solid #3a3f4b",
                      background: "transparent",
                      color: "#a0aec0",
                      cursor: "pointer",
                    }}
                  >
                    リセット
                  </button>
                )}
              </div>
            </div>
          )}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {Object.keys(st.deckSt)
              .filter(function (deck) {
                return deckFilter === "all" || deck === deckFilter;
              })
              .sort(function (a, b) {
                return st.deckSt[b].total - st.deckSt[a].total;
              })
              .map(function (deck) {
                var d = st.deckSt[deck];
                var wr = d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0;
                var fwr = d.f > 0 ? Math.round((d.fW / d.f) * 100) : null;
                var swr = d.s > 0 ? Math.round((d.sW / d.s) * 100) : null;
                // vs内訳はフィルタ済みデータを使用
                var vsRaw = st.deckVs[deck] || {};
                var vsEntries = Object.keys(vsRaw)
                  .map(function (od, ci) {
                    return {
                      name: od,
                      total: vsRaw[od].total,
                      wins: vsRaw[od].wins,
                      color: PALETTE[ci % PALETTE.length],
                    };
                  })
                  .sort(function (a, b) {
                    return b.total - a.total;
                  });
                var pieData = vsEntries.map(function (e) {
                  return { label: e.name, value: e.total, color: e.color };
                });
                return (
                  <div
                    key={deck}
                    style={{
                      background: "#2c313b",
                      border: "1px solid #3a3f4b",
                      padding: "14px",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          color: "#5b9cf6",
                          fontSize: "14px",
                          fontWeight: "700",
                        }}
                      >
                        {deck}
                      </span>
                      <span
                        style={{
                          color: "#6b7585",
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      >
                        {d.wins}勝 {d.total - d.wins}敗 / {d.total}戦
                      </span>
                    </div>
                    <div
                      style={{
                        height: "3px",
                        background: "#3a3f4b",
                        marginBottom: "8px",
                        overflow: "hidden",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          width: wr + "%",
                          height: "100%",
                          background: "#5b9cf6",
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "14px",
                        flexWrap: "wrap",
                        marginBottom: "14px",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "#a0aec0" }}>
                        総勝率{" "}
                        <span
                          style={{ color: "#5b9cf6", fontFamily: "monospace" }}
                        >
                          {wr}%
                        </span>
                      </span>
                      {fwr !== null && (
                        <span style={{ fontSize: "11px", color: "#a0aec0" }}>
                          先行{" "}
                          <span
                            style={{
                              color: "#93c5fd",
                              fontFamily: "monospace",
                            }}
                          >
                            {fwr}%
                          </span>
                          <span style={{ color: "#4a5060" }}> ({d.f}戦)</span>
                        </span>
                      )}
                      {swr !== null && (
                        <span style={{ fontSize: "11px", color: "#a0aec0" }}>
                          後攻{" "}
                          <span
                            style={{
                              color: "#fdba74",
                              fontFamily: "monospace",
                            }}
                          >
                            {swr}%
                          </span>
                          <span style={{ color: "#4a5060" }}> ({d.s}戦)</span>
                        </span>
                      )}
                    </div>
                    {vsEntries.length > 0 && (
                      <div>
                        <div
                          style={{
                            color: "#4a5060",
                            fontSize: "10px",
                            letterSpacing: "0.12em",
                            marginBottom: "10px",
                          }}
                        >
                          相手構築別
                          勝率（円グラフ＝対戦数の割合／カーソルで詳細表示）
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "16px",
                            alignItems: "flex-start",
                          }}
                        >
                          <PieChart data={pieData} size={110} />
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: "7px",
                            }}
                          >
                            {vsEntries.map(function (e) {
                              var vwr =
                                e.total > 0
                                  ? Math.round((e.wins / e.total) * 100)
                                  : 0;
                              return (
                                <div key={e.name}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      marginBottom: "3px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "8px",
                                          height: "8px",
                                          borderRadius: "2px",
                                          background: e.color,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span
                                        style={{
                                          color: "#e0e8f8",
                                          fontSize: "12px",
                                        }}
                                      >
                                        {e.name}
                                      </span>
                                    </div>
                                    <span
                                      style={{
                                        color: e.color,
                                        fontSize: "12px",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {vwr}%{" "}
                                      <span style={{ color: "#4a5060" }}>
                                        ({e.wins}/{e.total})
                                      </span>
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      height: "3px",
                                      background: "#3a3f4b",
                                      borderRadius: "2px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: vwr + "%",
                                        height: "100%",
                                        background: e.color,
                                        transition: "width 0.4s",
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {st.topR.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={sectionLabel}>頻出タグ</div>
          {st.topR.map(function (item) {
            var tag = item[0],
              count = item[1];
            var pct = Math.round((count / st.topR[0][1]) * 100);
            return (
              <div
                key={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    color: "#a0aec0",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  {tag}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "3px",
                    background: "#3a3f4b",
                    overflow: "hidden",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      width: pct + "%",
                      height: "100%",
                      background: "#5b9cf6",
                    }}
                  />
                </div>
                <div
                  style={{
                    color: "#5b9cf6",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    width: "20px",
                    textAlign: "right",
                  }}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {records.length >= 3 && (
        <div>
          <div style={sectionLabel}>直近の結果</div>
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {records
              .slice(0, 15)
              .reverse()
              .map(function (r) {
                var isW = r.result === "勝";
                return (
                  <div
                    key={r.id}
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "3px",
                      background: isW ? "#4ade8020" : "#f8717120",
                      border: isW ? "1px solid #4ade80" : "1px solid #f87171",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "700",
                      color: isW ? "#4ade80" : "#f87171",
                    }}
                  >
                    {r.result}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────── */
export default function App() {
  var [records, setRecords] = useState([]);
  var [options, setOptions] = useState(DEFAULT_OPTIONS);
  var [lastMyDeck, setLastMyDeck] = useState("");
  var [lastOppRank, setLastOppRank] = useState("");
  var [view, setView] = useState("list");
  var [form, setForm] = useState(function () {
    return makeForm("", "");
  });
  var [editId, setEditId] = useState(null);
  var [filterResult, setFilterResult] = useState("all");
  var [loaded, setLoaded] = useState(false);

  useEffect(
    function () {
      if (!loaded) return;
      try {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
      } catch (e) {}
    },
    [options, loaded]
  );

  useEffect(function () {
    try {
      migrateStorage();
      var rr = localStorage.getItem(RECORDS_KEY);
      var or = localStorage.getItem(OPTIONS_KEY);
      var dr = localStorage.getItem(LASTDECK_KEY);
      var kr = localStorage.getItem(LASTRANK_KEY);
      var deck = dr ? JSON.parse(dr) : "";
      var rank = kr ? JSON.parse(kr) : "";
      if (rr) setRecords(JSON.parse(rr));
      if (or)
        setOptions(function (prev) {
          return Object.assign({}, prev, JSON.parse(or));
        });
      setLastMyDeck(deck);
      setLastOppRank(rank);
      setForm(makeForm(deck, rank));
    } catch (e) {}
    setLoaded(true);
  }, []);

  function saveRecords(next) {
    setRecords(next);
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    } catch (e) {}
  }

  function handleSave() {
    if (editId !== null) {
      saveRecords(
        records.map(function (r) {
          return r.id === editId ? Object.assign({}, form, { id: editId }) : r;
        })
      );
    } else {
      saveRecords(
        [Object.assign({}, form, { id: Date.now() })].concat(records)
      );
      setLastMyDeck(form.myDeck);
      setLastOppRank(form.oppRank);
      try {
        localStorage.setItem(LASTDECK_KEY, JSON.stringify(form.myDeck));
      } catch (e) {}
      try {
        localStorage.setItem(LASTRANK_KEY, JSON.stringify(form.oppRank));
      } catch (e) {}
    }
    setEditId(null);
    setView("list");
    setForm(makeForm(form.myDeck, form.oppRank));
  }

  function handleEdit(record) {
    setForm(Object.assign({}, record));
    setEditId(record.id);
    setView("add");
  }
  function handleCancel() {
    setEditId(null);
    setView("list");
    setForm(makeForm(lastMyDeck, lastOppRank));
  }
  function openAdd() {
    setEditId(null);
    setForm(makeForm(lastMyDeck, lastOppRank));
    setView("add");
  }
  function switchView(v) {
    setEditId(null);
    setForm(makeForm(lastMyDeck, lastOppRank));
    setView(v);
  }

  var filtered = useMemo(
    function () {
      return filterResult === "all"
        ? records
        : records.filter(function (r) {
            return r.result === filterResult;
          });
    },
    [records, filterResult]
  );

  if (!loaded)
    return (
      <div
        style={{
          background: "#1e2128",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4a5060",
          fontFamily: "monospace",
        }}
      >
        loading…
      </div>
    );

  return (
    <div
      style={{
        background: "#1e2128",
        minHeight: "100vh",
        color: "#e0e8f8",
        fontFamily: "sans-serif",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "22px 14px 14px",
          borderBottom: "1px solid #3a3f4b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              color: "#4a5060",
              fontSize: "10px",
              letterSpacing: "0.2em",
              marginBottom: "3px",
            }}
          >
            BATTLE RECORD
          </div>
          <div
            style={{ color: "#5b9cf6", fontSize: "20px", fontWeight: "700" }}
          >
            戦績ログ
          </div>
        </div>
        <div style={{ display: "flex", gap: "1px" }}>
          {[
            ["list", "記録"],
            ["stats", "分析"],
          ].map(function (item) {
            var v = item[0],
              l = item[1],
              active = view === v && view !== "add";
            return (
              <button
                key={v}
                onClick={function () {
                  switchView(v);
                }}
                style={{
                  padding: "7px 14px",
                  border: "none",
                  fontFamily: "inherit",
                  background: active ? "#2c313b" : "transparent",
                  color: active ? "#5b9cf6" : "#6b7585",
                  fontSize: "12px",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                {l}
              </button>
            );
          })}
          <button
            onClick={openAdd}
            style={{
              padding: "7px 16px",
              border: "none",
              fontFamily: "inherit",
              fontWeight: "700",
              background: view === "add" ? "#5b9cf6" : "#5b9cf620",
              color: view === "add" ? "#ffffff" : "#5b9cf6",
              fontSize: "12px",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            + 追加
          </button>
        </div>
      </div>

      {/* list */}
      {view === "list" && (
        <div>
          <div
            style={{
              padding: "10px 14px",
              display: "flex",
              gap: "5px",
              borderBottom: "1px solid #3a3f4b",
              alignItems: "center",
            }}
          >
            {[
              ["all", "全て"],
              ["勝", "勝"],
              ["負", "負"],
            ].map(function (item) {
              var v = item[0],
                l = item[1],
                active = filterResult === v;
              return (
                <button
                  key={v}
                  onClick={function () {
                    setFilterResult(v);
                  }}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "3px",
                    fontFamily: "inherit",
                    border: active ? "1px solid #5b9cf6" : "1px solid #3a3f4b",
                    background: active ? "#2c3a50" : "transparent",
                    color: active ? "#5b9cf6" : "#a0aec0",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {l}
                </button>
              );
            })}
            <span
              style={{
                marginLeft: "auto",
                color: "#4a5060",
                fontSize: "11px",
                marginRight: "8px",
              }}
            >
              {filtered.length}件
            </span>
            <button
              onClick={function () {
                exportCSV(records);
              }}
              disabled={records.length === 0}
              style={{
                padding: "4px 12px",
                borderRadius: "3px",
                fontFamily: "inherit",
                border: "1px solid #3a3f4b",
                background: "transparent",
                color: records.length === 0 ? "#3a3f4b" : "#a0aec0",
                fontSize: "11px",
                cursor: records.length === 0 ? "default" : "pointer",
              }}
            >
              CSV出力
            </button>
          </div>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#4a5060",
                fontSize: "13px",
              }}
            >
              記録がありません
            </div>
          ) : (
            filtered.map(function (r) {
              return (
                <RecordRow
                  key={r.id}
                  record={r}
                  onDelete={function (id) {
                    saveRecords(
                      records.filter(function (x) {
                        return x.id !== id;
                      })
                    );
                  }}
                  onEdit={handleEdit}
                />
              );
            })
          )}
        </div>
      )}

      {view === "stats" && <StatsView records={records} />}

      {view === "add" && (
        <FormView
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={handleCancel}
          options={options}
          setOptions={setOptions}
          isEdit={editId !== null}
        />
      )}
    </div>
  );
}
