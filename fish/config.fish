# PATH setup (before interactive check so non-interactive shells get it too)
fish_add_path -g /opt/homebrew/bin /opt/homebrew/sbin
fish_add_path -g "$HOME/.local/bin" "$HOME/.amp/bin" "$HOME/.opencode/bin" "$HOME/.nvm/versions/node/v24.1.0/bin"

set -gx DYLD_FALLBACK_LIBRARY_PATH /opt/homebrew/lib $DYLD_FALLBACK_LIBRARY_PATH

if status is-interactive
    # Set up fzf key bindings
    fzf --fish | source

    zoxide init fish | source



    starship init fish | source
end
