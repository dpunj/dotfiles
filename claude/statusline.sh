#!/bin/bash
# Minimal mono statusline
# Line 1: model · folder · branch
# Line 2: [ctx bar] ctx% · $cost · time

stdin_data=$(cat)

IFS=$'\t' read -r current_dir model_name cost duration_ms ctx_used < <(
    echo "$stdin_data" | jq -r '[
        .workspace.current_dir // "unknown",
        .model.display_name // "Unknown",
        (try (.cost.total_cost_usd // 0 | . * 100 | floor / 100) catch 0),
        (.cost.total_duration_ms // 0),
        (try (
            if (.context_window.remaining_percentage // null) != null then
                100 - (.context_window.remaining_percentage | floor)
            elif (.context_window.context_window_size // 0) > 0 then
                (((.context_window.current_usage.input_tokens // 0) +
                  (.context_window.current_usage.cache_creation_input_tokens // 0) +
                  (.context_window.current_usage.cache_read_input_tokens // 0)) * 100 /
                 .context_window.context_window_size) | floor
            else "null" end
        ) catch "null")
    ] | @tsv'
)

if [ -z "$current_dir" ] && [ -z "$model_name" ]; then
    current_dir=$(echo "$stdin_data" | jq -r '.workspace.current_dir // "unknown"' 2>/dev/null)
    model_name=$(echo "$stdin_data" | jq -r '.model.display_name // "Unknown"' 2>/dev/null)
    cost=$(echo "$stdin_data" | jq -r '(.cost.total_cost_usd // 0)' 2>/dev/null)
    duration_ms=$(echo "$stdin_data" | jq -r '(.cost.total_duration_ms // 0)' 2>/dev/null)
    ctx_used=""
fi

# Git info
if cd "$current_dir" 2>/dev/null; then
    git_branch=$(git -c core.useBuiltinFSMonitor=false branch --show-current 2>/dev/null)
    git_root=$(git -c core.useBuiltinFSMonitor=false rev-parse --show-toplevel 2>/dev/null)
fi

if [ -n "$git_root" ]; then
    folder_name=$(basename "$git_root")
    [ "$current_dir" != "$git_root" ] && folder_name=$(basename "$current_dir")
else
    folder_name=$(basename "$current_dir")
fi

# Context bar (mono)
bar=""
if [ -n "$ctx_used" ] && [ "$ctx_used" != "null" ]; then
    bar_width=10
    filled=$((ctx_used * bar_width / 100))
    empty=$((bar_width - filled))
    bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done
fi

# Duration
session_time=""
if [ "$duration_ms" -gt 0 ] 2>/dev/null; then
    total_sec=$((duration_ms / 1000))
    h=$((total_sec / 3600)) m=$(((total_sec % 3600) / 60)) s=$((total_sec % 60))
    if [ "$h" -gt 0 ]; then session_time="${h}h${m}m"
    elif [ "$m" -gt 0 ]; then session_time="${m}m${s}s"
    else session_time="${s}s"
    fi
fi

short_model=$(echo "$model_name" | sed -E 's/Claude [0-9.]+ //; s/^Claude //')

# Dim helper
D='\033[2m'
R='\033[0m'

# Line 1: model · 📂 folder · 🌿 branch
line1="${short_model}"
line1+=$(printf " ${D}·${R} 📂 %s" "$folder_name")
[ -n "$git_branch" ] && line1+=$(printf " ${D}·${R} 🌿 %s" "$git_branch")

# Line 2: bar ctx% · 💰 cost · ⏱ time
line2=""
if [ -n "$bar" ]; then
    line2+=$(printf "${D}%s${R} %s%%" "$bar" "$ctx_used")
else
    [ -n "$ctx_used" ] && [ "$ctx_used" != "null" ] && line2+="${ctx_used}%"
fi
[ -n "$line2" ] && line2+=$(printf " ${D}·${R} ")
line2+="\$${cost}"
[ -n "$session_time" ] && line2+=$(printf " ${D}·${R} ⏱ %s" "$session_time")

printf '%b\n\n%b' "$line1" "$line2"
